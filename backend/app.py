from flask import Flask, request, jsonify
from flask_cors import CORS
from ocr import ocr_pdf

app = Flask(__name__)
CORS(app)

# ======================================
# Kiểm tra backend
# ======================================

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'HTTV OCR Backend OK'
    })

# ======================================
# OCR PDF
# ======================================

@app.route('/ocr', methods=['POST'])
def ocr_endpoint():
    if 'file' not in request.files:
        return jsonify({
            'success': False,
            'error': 'Không có file PDF'
        }), 400

    file = request.files['file']

    try:
        text = ocr_pdf(file.read())
        return jsonify({
            'success': True,
            'text': text
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ======================================
# Trang test OCR trực tiếp trên Render
# ======================================

@app.route('/test', methods=['GET'])
def test_page():
    return '''
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTTV OCR Test</title>
</head>
<body style="font-family:Arial;padding:20px;">
    <h2>HTTV OCR Test (Render)</h2>
    <input type="file" id="pdfFile" accept=".pdf">
    <button onclick="uploadPDF()">Đọc PDF</button>

    <hr>
    <pre id="result" style="white-space:pre-wrap;"></pre>

    <script>
    async function uploadPDF(){
        const file = document.getElementById('pdfFile').files[0];
        if(!file){
            alert('Chưa chọn file PDF');
            return;
        }

        const result = document.getElementById('result');
        result.textContent = 'Đang OCR...';

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/ocr', {
                method:'POST',
                body:formData
            });

            const text = await res.text();
            result.textContent = 'HTTP ' + res.status + '\\n\\n' + text;

        } catch(e) {
            result.textContent = 'Lỗi: ' + e.message;
        }
    }
    </script>
</body>
</html>
'''

# ======================================
# Chạy server
# ======================================

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5000
    )
