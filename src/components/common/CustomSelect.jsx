import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Check } from 'lucide-react';

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
    const dropdownRef = useRef(null);
    const searchRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchable && searchRef.current) {
            setTimeout(() => searchRef.current?.focus(), 50);
        }
        if (!isOpen) setSearchQuery('');
    }, [isOpen, searchable]);

    // Single mode label
    const selectedLabel = !multi
        ? (options.find(opt => opt.value === selected)?.label || label)
        : null;

    // Multi mode label
    const selectedArr = multi ? (Array.isArray(selected) ? selected : []) : [];
    const multiLabel = multi
        ? selectedArr.length === 0
            ? label
            : selectedArr.length === options.length
                ? 'Todos'
                : `${selectedArr.length} seleccionado${selectedArr.length > 1 ? 's' : ''}`
        : null;

    const filteredOptions = searchable && searchQuery
        ? options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : options;

    const handleMultiToggle = (value) => {
        const current = Array.isArray(selected) ? selected : [];
        if (current.includes(value)) {
            onChange(current.filter(v => v !== value));
        } else {
            onChange([...current, value]);
        }
    };

    return (
        <div className={`relative ${width}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-white/[0.05] border border-slate-300 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white/70 hover:border-accent-orange/50 transition-all shadow-sm"
            >
                <span className={`truncate ${multi && selectedArr.length > 0 ? 'text-accent-orange' : ''}`}>
                    {multi ? multiLabel : selectedLabel}
                </span>
                <ChevronDown size={12} className={`transition-transform duration-300 flex-shrink-0 ml-1 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={`absolute z-[100] mt-2 ${width} bg-white/95 dark:bg-black/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden ${alignRight ? 'right-0' : 'left-0'}`}
                    >
                        {searchable && (
                            <div className="p-2 border-b border-slate-200 dark:border-white/10">
                                <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 rounded-lg px-3 py-2">
                                    <Search size={10} className="text-slate-400 dark:text-white/30 flex-shrink-0" />
                                    <input
                                        ref={searchRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Buscar..."
                                        className="bg-transparent text-[10px] font-bold text-slate-700 dark:text-white/70 placeholder-slate-400 dark:placeholder-white/20 outline-none w-full uppercase tracking-widest"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="max-h-56 overflow-y-auto custom-scrollbar p-1">
                            {filteredOptions.length === 0 ? (
                                <div className="px-4 py-3 text-[9px] font-bold text-slate-400 dark:text-white/20 uppercase tracking-widest text-center">
                                    Sin resultados
                                </div>
                            ) : filteredOptions.map((option) => {
                                const isSelected = multi
                                    ? selectedArr.includes(option.value)
                                    : selected === option.value;

                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            if (multi) {
                                                handleMultiToggle(option.value);
                                                // stay open for multi
                                            } else {
                                                onChange(option.value);
                                                setIsOpen(false);
                                                setSearchQuery('');
                                            }
                                        }}
                                        className={`w-full text-left px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-between gap-2 ${isSelected
                                            ? 'bg-accent-orange text-white'
                                            : 'text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        <span>{option.label}</span>
                                        {multi && isSelected && (
                                            <Check size={10} className="flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomSelect;
