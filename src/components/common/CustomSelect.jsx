import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Check } from 'lucide-react';

/**
 * CustomSelect — dropdown rendered via Portal into document.body
 * with position:fixed so it escapes every stacking context.
 */
const CustomSelect = ({
    label,
    options,
    selected,
    onChange,
    alignRight = false,
    width = "w-40",
    searchable = false,
    multi = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [rect, setRect] = useState(null);          // trigger button rect
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);
    const searchRef = useRef(null);

    // ── Calculate trigger position ─────────────────────────────────────
    const calcRect = useCallback(() => {
        if (triggerRef.current) {
            setRect(triggerRef.current.getBoundingClientRect());
        }
    }, []);

    // Recalculate on open, scroll, resize
    useEffect(() => {
        if (!isOpen) return;
        calcRect();
        window.addEventListener('scroll', calcRect, true);
        window.addEventListener('resize', calcRect);
        return () => {
            window.removeEventListener('scroll', calcRect, true);
            window.removeEventListener('resize', calcRect);
        };
    }, [isOpen, calcRect]);

    // ── Click-outside ──────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)
            ) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };
        // Use capture so we catch events before anything else
        document.addEventListener('mousedown', handler, true);
        return () => document.removeEventListener('mousedown', handler, true);
    }, [isOpen]);

    // ── Auto-focus search ──────────────────────────────────────────────
    useEffect(() => {
        if (isOpen && searchable && searchRef.current) {
            setTimeout(() => searchRef.current?.focus(), 60);
        }
        if (!isOpen) setSearchQuery('');
    }, [isOpen, searchable]);

    // ── Labels ─────────────────────────────────────────────────────────
    const selectedArr = multi ? (Array.isArray(selected) ? selected : []) : [];

    const triggerLabel = multi
        ? selectedArr.length === 0
            ? label
            : selectedArr.length === options.length
                ? 'Todos'
                : `${selectedArr.length} selec.`
        : (options.find(o => o.value === selected)?.label ?? label);

    const filteredOptions = (searchable && searchQuery)
        ? options.filter(o => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : options;

    // ── Multi toggle ───────────────────────────────────────────────────
    const handleMultiToggle = (value) => {
        const cur = Array.isArray(selected) ? selected : [];
        onChange(cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]);
    };

    // ── Dropdown fixed style ───────────────────────────────────────────
    const dropdownStyle = rect
        ? {
            position: 'fixed',
            top: rect.bottom + 6,
            left: alignRight ? undefined : rect.left,
            right: alignRight ? window.innerWidth - rect.right : undefined,
            width: rect.width,
            zIndex: 999999,
        }
        : { display: 'none' };

    // ── Render ─────────────────────────────────────────────────────────
    return (
        <div className={`relative ${width}`}>
            {/* Trigger button */}
            <button
                ref={triggerRef}
                onClick={() => { calcRect(); setIsOpen(o => !o); }}
                className="w-full flex items-center justify-between px-3 py-1.5 bg-white dark:bg-white/[0.05] border border-slate-300 dark:border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white/70 hover:border-accent-orange/50 transition-all shadow-sm"
            >
                <span className={`truncate ${multi && selectedArr.length > 0 ? 'text-accent-orange' : ''}`}>
                    {triggerLabel}
                </span>
                <ChevronDown
                    size={11}
                    className={`flex-shrink-0 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown rendered in document.body via portal */}
            {isOpen && createPortal(
                <AnimatePresence>
                    <motion.div
                        key="dropdown"
                        ref={dropdownRef}
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        style={dropdownStyle}
                        className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden"
                    >
                        {searchable && (
                            <div className="p-2 border-b border-slate-100 dark:border-white/10">
                                <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 rounded-lg px-2 py-1.5">
                                    <Search size={10} className="text-slate-400 flex-shrink-0" />
                                    <input
                                        ref={searchRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Buscar..."
                                        className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-white/70 placeholder-slate-400 outline-none w-full"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="max-h-52 overflow-y-auto p-1">
                            {filteredOptions.length === 0 ? (
                                <div className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
                                    Sin resultados
                                </div>
                            ) : filteredOptions.map((opt) => {
                                const isSel = multi ? selectedArr.includes(opt.value) : selected === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        onMouseDown={(e) => {
                                            // Use mousedown + preventDefault so click-outside doesn't fire
                                            e.preventDefault();
                                            if (multi) {
                                                handleMultiToggle(opt.value);
                                            } else {
                                                onChange(opt.value);
                                                setIsOpen(false);
                                                setSearchQuery('');
                                            }
                                        }}
                                        className={`w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-between gap-2 ${isSel
                                                ? 'bg-accent-orange text-white'
                                                : 'text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        <span className="truncate">{opt.label}</span>
                                        {multi && isSel && <Check size={10} className="flex-shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default CustomSelect;
