from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({'status': 'NeuroTube Higgsfield API', 'ready': True})

@app.route('/generate', methods=['POST'])
def generate():
    prompt = request.json.get('prompt', '') if request.is_json else ''
    return jsonify({'success': True, 'prompt': prompt, 'status': 'queued'})

@app.route('/status')
def status():
    return jsonify({'online': True})

if __name__ == '__main__':
    print('🚀 API starting on port 7860...')
    app.run(host='0.0.0.0', port=7860)
