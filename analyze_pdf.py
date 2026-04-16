import fitz
import sys

def analyze_page(pdf_path, page_num=0):
    doc = fitz.open(pdf_path)
    page = doc[page_num]
    
    print(f"--- Page {page_num} ---")
    
    # Analyze text blocks
    print("\nText Blocks:")
    blocks = page.get_text("blocks")
    for b in blocks:
        print(f"Rect: {b[:4]}, Text: {b[4][:50]!r}")
        
    # Analyze images
    print("\nImages:")
    images = page.get_image_info()
    for img in images:
        print(f"Rect: {img['bbox']}")

    doc.close()

if __name__ == "__main__":
    analyze_page(sys.argv[1])
