from PIL import Image, ImageDraw, ImageFont
import os
from typing import List
import time
import json
from .config import CONFIG

try:
    import google.generativeai as genai
except Exception:
    genai = None


def _generate_image_gemini(prompt: str, out_path: str, model: str = 'gemini-3-pro-image-preview') -> None:
    """Generate an image using Google Gemini (Nano Banana Pro) via google.generativeai.

    The function prefers the `google.generativeai` client (as requested). If the
    client is not installed or `GEMINI_API_KEY` is not set, it will raise.
    """
    api_key = CONFIG.get('GEMINI_API_KEY') or os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise RuntimeError('GEMINI_API_KEY not set')

    if genai is None:
        raise RuntimeError('google.generativeai not installed')

    genai.configure(api_key=api_key)
    model_obj = genai.GenerativeModel(model)

    # User-specified usage: response = model.generate_content(prompt)
    resp = model_obj.generate_content(prompt)

    # Try to locate image bytes in the response. The client may return a
    # structured object; handle likely shapes and fallback to saving the
    # whole response for debugging.
    b64 = None
    # If the response has a 'content' or 'candidates' attribute
    try:
        data = resp
        # If response is a dict-like
        if isinstance(data, dict):
            # Search recursively for base64 strings or data URLs
            def find_b64(obj):
                if isinstance(obj, dict):
                    for v in obj.values():
                        r = find_b64(v)
                        if r:
                            return r
                elif isinstance(obj, list):
                    for item in obj:
                        r = find_b64(item)
                        if r:
                            return r
                elif isinstance(obj, str):
                    if obj.startswith('data:image'):
                        return obj.split(',', 1)[1]
                    # crude base64 heuristic
                    if len(obj) > 100 and all(c.isalnum() or c in '+/=' for c in obj[:50]):
                        return obj
                return None
            b64 = find_b64(data)
        else:
            # Try attributes on the response object
            for attr in ('content', 'candidates', 'images', 'image'):
                val = getattr(resp, attr, None)
                if val:
                    # handle list-like
                    if isinstance(val, list) and len(val) > 0:
                        first = val[0]
                        if isinstance(first, dict):
                            for k in ('b64', 'image', 'imageBase64'):
                                if k in first:
                                    b64 = first[k]
                                    break
                        elif isinstance(first, str):
                            b64 = first
                    elif isinstance(val, str):
                        b64 = val
                if b64:
                    break
    except Exception:
        b64 = None

    if not b64:
        # Save resp for debugging
        try:
            with open(out_path + '.json', 'w') as f:
                json.dump(resp if isinstance(resp, dict) else str(resp), f, indent=2)
        except Exception:
            pass
        raise RuntimeError('Gemini response did not contain image base64')

    import base64
    with open(out_path, 'wb') as f:
        f.write(base64.b64decode(b64))


def generate_images(prompts: List[str], out_dir: str, width=1920, height=1080, use_gemini: bool = True) -> List[str]:
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
