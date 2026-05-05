import fitz
import sys
import os
import re
from pathlib import Path

def extract_tickets_intelligently(pdf_path, output_folder="tickets_abril", dpi=300):
    if not os.path.exists(pdf_path):
        print(f"Error: El archivo '{pdf_path}' no existe.")
        return

    output_path = Path(output_folder)
    output_path.mkdir(exist_ok=True)

    doc = fitz.open(pdf_path)
    print(f"Abriendo PDF: {pdf_path}")
    print(f"Buscando tickets en {len(doc)} páginas...")

    # Regex para detectar nombres de tiendas comunes
    shop_re = re.compile(r'^[A-Z]{2,4}\s+\d+\s*[–-]', re.IGNORECASE)

    for page_index in range(len(doc)):
        page = doc[page_index]
        blocks = page.get_text("blocks")
        images_info = page.get_image_info()
        
        # 1. Encontrar etiquetas
        labels = []
        for b in blocks:
            text = b[4].strip()
            if shop_re.match(text):
                labels.append({
                    "text": text.split('\n')[0],
                    "rect": fitz.Rect(b[:4])
                })
        
        if not labels:
            continue

        # 2. Para cada etiqueta, buscar la imagen más cercana debajo
        for i, label in enumerate(labels):
            label_rect = label["rect"]
            best_img_rect = None
            min_dist = float('inf')
            
            for img in images_info:
                img_rect = fitz.Rect(img['bbox'])
                
                # Ignorar imágenes que sean casi toda la página (ruido de fondo)
                if img_rect.width > page.rect.width * 0.9 and img_rect.height > page.rect.height * 0.9:
                    continue
                
                dist_y = img_rect.y0 - label_rect.y1
                # Si la imagen está debajo de la etiqueta
                if dist_y > -10 and dist_y < 300: 
                    # Comprobar alineación horizontal aproximada
                    if abs(img_rect.x0 - label_rect.x0) < 200:
                        if dist_y < min_dist:
                            min_dist = dist_y
                            best_img_rect = img_rect

            # 3. Definir el área de recorte
            if best_img_rect:
                # El recorte abarca desde un poco arriba de la etiqueta hasta el final de la imagen
                crop_rect = fitz.Rect(
                    min(label_rect.x0, best_img_rect.x0) - 10,
                    label_rect.y0 - 20,
                    max(label_rect.x1, best_img_rect.x1) + 10,
                    best_img_rect.y1 + 10
                )
            else:
                # Fallback: si no hay objeto imagen, hacemos un recorte estándar de 650pt
                crop_rect = fitz.Rect(
                    label_rect.x0 - 15,
                    label_rect.y0 - 25,
                    label_rect.x1 + 250,
                    label_rect.y0 + 650
                )

            # 4. Extraer y guardar
            clean_name = re.sub(r'[^\w\s-]', '', label["text"]).strip().replace(' ', '_')
            zoom = dpi / 72
            mat = fitz.Matrix(zoom, zoom)
            
            try:
                pix = page.get_pixmap(matrix=mat, clip=crop_rect)
                final_filename = f"{clean_name}_p{page_index+1}_{i+1}.jpg"
                image_path = output_path / final_filename
                pix.save(str(image_path))
                # print(f"  -> Extraído: {final_filename}")
            except Exception as e:
                print(f"  -> Error extrayendo {clean_name}: {e}")

    doc.close()
    print(f"\n¡Listo! Los tickets están en: {output_path.absolute()}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        pdfs = [f for f in os.listdir('.') if f.lower().endswith('.pdf')]
        if pdfs:
            extract_tickets_intelligently(pdfs[0])
        else:
            print("Uso: python advanced_extract.py <ruta_del_pdf>")
    else:
        extract_tickets_intelligently(sys.argv[1])
