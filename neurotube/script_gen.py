import os
import requests


def _generate_script_groq(topic: str):
    """Call Groq API to generate a Hindi script.

    This function expects `GROQ_API_KEY` in environment / config.
    Replace endpoint and payload as needed for your Groq plan.
    """
    api_key = os.getenv('GROQ_API_KEY')
    if not api_key:
        raise RuntimeError('GROQ_API_KEY not set')

    url = 'https://api.groq.ai/v1/generate'  # placeholder; adapt to real Groq endpoint
    headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
    prompt = f"Write a detailed YouTube script in Hindi for the topic: {topic}. Include timestamps, B-roll cues, and 8-12 segments."
    payload = {"prompt": prompt, "max_tokens": 800}
    resp = requests.post(url, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    # Expected to extract text from data; fallback to raw
    return data.get('text') or data.get('result') or str(data)


def generate_script(topic: str, language: str = 'hi') -> dict:
    """Generate a simple script and image prompts for the given topic.

    This offline generator produces a short multi-segment script and a list
    of image prompts as placeholders. Replace with Groq integration if desired.
    """
    title = f"{topic} — Quick Guide"

    # Prefer Groq-generated script when configured
    try:
        script_text = _generate_script_groq(topic)
    except Exception:
        # Fallback simple template
        script_text = (
            f"Intro: नमस्ते! आज हम चर्चा करेंगे: {topic}.\n"
            "Segment 1: परिचय और मुख्य बिंदु।\n"
            "Segment 2: चरण-दर-चरण मार्गदर्शन।\n"
            "Conclusion: संक्षेप और कॉल-टू-एक्शन।"
        )

    # Default to 30 images if generating for long-form when possible
    prompts = [f"{topic} - scene {i+1} - cinematic, high detail, photorealistic" for i in range(30)]

    return {
        'title': title,
        'script': script_text,
        'prompts': prompts,
        'language': language,
    }
