import fitz
import sys
import os
import re
from pathlib import Path

def extract_tickets_intelligently(pdf_path, output_folder="Tickets_Marzo_2026", dpi=300):
    if not os.path.exists(pdf_path):
        print(f"Error: El archivo '{pdf_path}' no existe.")
        return

    output_path = Path(output_folder)
    output_path.mkdir(exist_ok=True)

    doc = fitz.open(pdf_path)
    pdf_filename = Path(pdf_path).stem
    
    print(f"Abriendo PDF: {pdf_path}")
    print(f"Buscando tickets en {len(doc)} páginas...")

    # Regex para detectar nombres de tiendas comunes (KFC, LC, BK, PJ, LL, etc.)
    # Ejemplo: "KFC 03 – AVIACION" ó "LL 78 – CAMINOS DEL INCA"
    shop_re = re.compile(r'^[A-Z]{2,4}\s+\d+\s*[–-]', re.IGNORECASE)

    for page_index in range(len(doc)):
        page = doc[page_index]
        
        # 1. Obtener bloques de texto para encontrar nombres de tiendas
        blocks = page.get_text("blocks")
        shop_labels = []
        for b in blocks:
            text = b[4].strip()
            if shop_re.match(text):
                # Guardar el texto y su rectángulo
                shop_labels.append({"text": text.split('\n')[0], "rect": fitz.Rect(b[:4])})
        
        # 2. Obtener imágenes de la página
        images_info = page.get_image_info()
        
        if not images_info:
            continue
            
        # print(f"Página {page_index+1}: Detectadas {len(shop_labels)} etiquetas y {len(images_info)} imágenes.")

        # 3. Asociar cada imagen con la etiqueta de tienda más cercana arriba
        for i, img in enumerate(images_info):
            img_rect = fitz.Rect(img['bbox'])
            
            # Buscamos la etiqueta que esté por encima de la imagen y sea la más cercana
            best_label = "DESCONOCIDO"
            min_dist = float('inf')
            
            for label in shop_labels:
                # La etiqueta debe estar arriba de la imagen (y más o menos en la misma horizontal/columna)
                # O simplemente buscamos la que tenga el centro X más cercano y esté arriba
                dist_y = img_rect.y0 - label["rect"].y1
                dist_x = abs(img_rect.x0 - label["rect"].x0)
                
                # Relajamos un poco los márgenes
                if dist_y > 0 and dist_y < 200: # Margen de 200pt arriba
                    if dist_x < 150: # Misma columna aprox
                        if dist_y < min_dist:
                            min_dist = dist_y
                            best_label = label["text"]

            # Limpiar nombre para el archivo
            clean_name = re.sub(r'[^\w\s-]', '', best_label).strip().replace(' ', '_')
            
            # 4. Extraer el área de la imagen (el "crop")
            # Aumentamos resolución
            zoom = dpi / 72
            mat = fitz.Matrix(zoom, zoom)
            
            # Crop exacto al rectángulo de la imagen
            pix = page.get_pixmap(matrix=mat, clip=img_rect)
            
            # Guardar
            final_filename = f"{clean_name}_p{page_index+1}_{i+1}.jpg"
            image_path = output_path / final_filename
            
            pix.save(str(image_path))
            # print(f"  -> Guardado: {final_filename}")

    doc.close()
    print(f"\n¡Listo! Las imágenes recortadas están en: {output_path.absolute()}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python advanced_extract.py <ruta_del_pdf> [carpeta_salida]")
    else:
        pdf = sys.argv[1]
        out = sys.argv[2] if len(sys.argv) > 2 else "Tickets_Extraidos"
        extract_tickets_intelligently(pdf, out)
