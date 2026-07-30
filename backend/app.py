from flask import Flask

app = Flask(name)

@app.route('/health')
def health():
return {'status': 'HTTV OCR Backend OK'}

if name == 'main':
app.run(host='0.0.0.0', port=5000, debug=True)
