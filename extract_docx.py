import zipfile
import xml.etree.ElementTree as ET
import sys

def docx_to_text(path):
    try:
        with zipfile.ZipFile(path) as z:
            xml_content = z.read('word/document.xml')
        
        tree = ET.fromstring(xml_content)
        namespace = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        
        text = []
        for paragraph in tree.findall('.//w:p', namespace):
            texts = paragraph.findall('.//w:t', namespace)
            if texts:
                text.append(''.join(t.text for t in texts))
        
        return '\n'.join(text)
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 extract_text.py <path>")
        sys.exit(1)
    print(docx_to_text(sys.argv[1]))
