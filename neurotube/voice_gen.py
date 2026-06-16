import os
from typing import Optional

def text_to_speech(text: str, out_path: str, lang: str = 'hi') -> str:
    """Synthesize `text` to an MP3 file.

    Preference order:
    1. gTTS (online, reliable)
    2. pyttsx3 with eSpeak (offline, may require system packages)

    Returns the output file path.
    """
    # Use edge-tts CLI when available (preferred by user)
    try:
        # edge-tts package provides CLI `edge-tts` and Python API
        # We'll prefer the CLI for simplicity
        import shutil
        if shutil.which('edge-tts'):
            # write text to temp file to avoid shell escaping
            import tempfile
            with tempfile.NamedTemporaryFile('w', delete=False, encoding='utf8') as tf:
                tf.write(text)
                tmp_text = tf.name
            # Build command
            cmd = [
                'edge-tts',
                '--voice', 'hi-IN-MadhurNeural',
                '--text-file', tmp_text,
                '--write-media', out_path
            ]
            import subprocess
            subprocess.check_call(cmd)
            try:
                os.remove(tmp_text)
            except Exception:
                pass
            return out_path
    except Exception:
        pass

    # Fallback to gTTS (online) if edge-tts not available
    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang='hi')
        tts.save(out_path)
        return out_path
    except Exception as e:
        raise RuntimeError(f'No available TTS backend (edge-tts or gTTS). Error: {e}')
