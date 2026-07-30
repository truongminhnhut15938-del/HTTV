from flask import Flask, request, jsonify
from flask_cors import CORS
from ocr import ocr_pdf

app = Flask(name)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
return jsonify({'status': 'HTTV OCR Backend OK'})

@app.route('/ocr', methods=['POST'])
def ocr_endpoint():
if 'file' not in request.files:
return jsonify({'error': 'Không có file được gửi lên'}), 400

file = request.files['file']

if file.filename == '':
    return jsonify({'error': 'Tên file rỗng'}), 400

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

if name == 'main':
app.run(host='0.0.0.0', port=5000, debug=True)
