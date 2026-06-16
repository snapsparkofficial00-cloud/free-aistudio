from PIL import Image, ImageDraw, ImageFont
import os
from typing import List
import requests
import time
import json
from .config import CONFIG


def _generate_image_gemini(prompt: str, out_path: str, model: str = 'gemini-2.0-flash-exp-image-generation') -> None:
    """Call Google Gemini image generation REST endpoint with an API key.

    This uses a simple HTTP POST to the Google generative API endpoint; adjust
    to match your Google Cloud/AI Studio configuration and billing.
    """
    api_key = CONFIG.get('GEMINI_API_KEY') or os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise RuntimeError('GEMINI_API_KEY not set')

    url = f'https://generativelanguage.googleapis.com/v1beta2/models/{model}:generateImage?key={api_key}'
    payload = {'prompt': prompt, 'size': '1024x1024'}
    headers = {'Content-Type': 'application/json'}
    resp = requests.post(url, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    # Expect base64 image data in data['images'][0]['b64'] or similar
    b64 = None
    if isinstance(data, dict):
        imgs = data.get('images') or []
        if imgs and isinstance(imgs[0], dict):
            b64 = imgs[0].get('b64') or imgs[0].get('image')

    if not b64:
        # Save response for debug
        with open(out_path + '.json', 'w') as f:
            json.dump(data, f, indent=2)
        raise RuntimeError('Gemini response did not contain image base64')

    import base64
    with open(out_path, 'wb') as f:
        f.write(base64.b64decode(b64))


def generate_images(prompts: List[str], out_dir: str, width=1920, height=1080, use_gemini: bool = False) -> List[str]:
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    for i, prompt in enumerate(prompts):
        fname = f"img_{i+1:03d}.jpg"
        path = os.path.join(out_dir, fname)
        if use_gemini:
            try:
                _generate_image_gemini(prompt, path)
            except Exception as e:
                # Fallback to placeholder if Gemini fails
                print('Gemini image generation failed:', e)
        if not os.path.exists(path):
            # create placeholder
            img = Image.new('RGB', (width, height), color=(30 + (i*10)%220, 60 + (i*5)%180, 120 + (i*7)%120))
            draw = ImageDraw.Draw(img)
            try:
                font = ImageFont.truetype('DejaVuSans-Bold.ttf', 48)
            except Exception:
                font = ImageFont.load_default()
            text = (prompt[:80] + '...') if len(prompt) > 80 else prompt
            margin = 40
            draw.text((margin, height - 160), text, fill=(255,255,255), font=font)
            img.save(path, quality=90)
        paths.append(path)
        time.sleep(0.3)

    return paths
