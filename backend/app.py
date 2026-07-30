from flask import Flask, request, jsonify
from flask_cors import CORS
from ocr import ocr_pdf

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'HTTV OCR Backend OK'})

@app.route('/ocr', methods=['POST'])
def ocr_endpoint():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'Không có file trong request'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'Chưa chọn file'}), 400

    try:
        # Đọc dữ liệu dạng bytes từ file gửi lên
        file_bytes = file.read()
        text = ocr_pdf(file_bytes)

        return jsonify({
            'success': True,
            'text': text
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
