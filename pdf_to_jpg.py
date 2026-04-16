import os
import fitz  # PyMuPDF
import sys
from pathlib import Path

def extract_pages_to_jpg(pdf_path, output_folder="Tickets JPG", dpi=300):
    """
    Convierte cada página de un PDF en una imagen JPG de alta calidad.
    """
    if not os.path.exists(pdf_path):
        print(f"Error: El archivo '{pdf_path}' no existe.")
        return

    # Crear carpeta de salida si no existe
    output_path = Path(output_folder)
    output_path.mkdir(exist_ok=True)

    # Abrir el PDF
    doc = fitz.open(pdf_path)
    pdf_filename = Path(pdf_path).stem

    print(f"Abriendo PDF: {pdf_path}")
    print(f"Total de páginas: {len(doc)}")
    print(f"Guardando en: {output_path.absolute()}")

    for i, page in enumerate(doc):
        # Aumentar la resolución para OCR (DPI=300 es estándar)
        zoom = dpi / 72  # 72 es el DPI por defecto de PDF
        mat = fitz.Matrix(zoom, zoom)
        
        # Generar imagen de la página
        pix = page.get_pixmap(matrix=mat)
        
        # Nombre del archivo: NOMBRE_PDF_pX_v1.jpg (siguiendo el patrón existente)
        # Usamos _v1 para que coincida con el formato que ya tienes
        image_name = f"{pdf_filename}_p{i+1}_v1.jpg"
        image_path = output_path / image_name
        
        pix.save(str(image_path))
        print(f"Página {i+1}/{len(doc)} guardada como {image_name}")

    doc.close()
    print("\n¡Listo! Todas las páginas han sido extraídas.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        # Buscar PDFs en la carpeta actual
        pdfs = list(Path(".").glob("*.pdf"))
        if not pdfs:
            print("Uso: python pdf_to_jpg.py <ruta_del_pdf>")
            print("No se encontraron PDFs en el directorio actual.")
        else:
            for pdf in pdfs:
                print(f"Detectado automáticamente: {pdf}")
                extract_pages_to_jpg(str(pdf))
    else:
        pdf_file = sys.argv[1]
        out_folder = sys.argv[2] if len(sys.argv) > 2 else "Tickets JPG"
        extract_pages_to_jpg(pdf_file, output_folder=out_folder)
