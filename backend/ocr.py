from paddleocr import PaddleOCR
import fitz
from PIL import Image
import io

ocr = PaddleOCR(use_angle_cls=True, lang='vi')

def ocr_pdf(file_stream):
doc = fitz.open(stream=file_stream, filetype='pdf')
pages = []

for page in doc:
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    img = Image.open(io.BytesIO(pix.tobytes('png')))
    result = ocr.ocr(img, cls=True)

    text = ''
    if result and result[0]:
        for line in result[0]:
            text += line[1][0] + '\n'

    pages.append(text)

return '\n\n===== Trang =====\n\n'.join(pages)
