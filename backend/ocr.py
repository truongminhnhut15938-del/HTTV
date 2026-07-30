import fitz  # PyMuPDF
import numpy as np
import cv2
from paddleocr import PaddleOCR

# Khởi tạo PaddleOCR (hỗ trợ tiếng Việt 'vi' hoặc tiếng Anh 'en')
ocr = PaddleOCR(use_angle_cls=True, lang='vi')

def ocr_pdf(file_stream):
    """
    Hàm nhận vào dữ liệu file PDF dạng bytes,
    chuyển từng trang PDF thành hình ảnh và trích xuất chữ bằng OCR.
    """
    # Mở PDF từ stream bytes (Đã sửa lỗi thụt lề ở đây)
    doc = fitz.open(stream=file_stream, filetype='pdf')
    full_text = []

    for page_index in range(len(doc)):
        page = doc[page_index]
        
        # Render trang PDF thành hình ảnh
        pix = page.get_pixmap(dpi=150)
        
        # Chuyển đổi pixmap sang mảng Numpy để PaddleOCR đọc
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
        
        # Chuyển đổi không gian màu phù hợp cho OpenCV/PaddleOCR
        if pix.n == 4:  # RGBA
            img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
        elif pix.n == 3:  # RGB
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

        # Trích xuất chữ từ ảnh
        result = ocr.ocr(img, cls=True)
        
        page_lines = []
        if result and result[0]:
            for line in result[0]:
                text = line[1][0]  # Lấy đoạn văn bản nhận diện được
                page_lines.append(text)
        
        full_text.append(f"--- TRANG {page_index + 1} ---\n" + "\n".join(page_lines))

    doc.close()
    return "\n\n".join(full_text)
