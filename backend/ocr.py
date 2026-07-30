import fitz  # PyMuPDF
import numpy as np
from PIL import Image
from paddleocr import PaddleOCR

Khởi tạo OCR một lần duy nhất

ocr = PaddleOCR(
use_angle_cls=True,
lang='vi',
show_log=False
)

def ocr_pdf(pdf_bytes):

doc = fitz.open(stream=pdf_bytes, filetype='pdf')

pages = []

for page_index in range(len(doc)):

    page = doc.load_page(page_index)

    # Render 300 DPI
    pix = page.get_pixmap(dpi=300)

    img = Image.frombytes(
        'RGB',
        [pix.width, pix.height],
        pix.samples
    )

    img_np = np.array(img)

    result = ocr.ocr(img_np, cls=True)

    lines = []

    if result and result[0]:

        for item in result[0]:

            if item and len(item) >= 2:

                text = item[1][0]

                lines.append(text)

    page_text = '\\n'.join(lines).strip()

    pages.append(
        f'===== Trang {page_index + 1} =====\\n{page_text}'
    )

return '\\n\\n'.join(pages)
