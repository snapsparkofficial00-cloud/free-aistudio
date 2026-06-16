from dotenv import load_dotenv
import os

load_dotenv()

CONFIG = {
    # Optional: fill with real API keys if you want remote services
    'GROQ_API_KEY': os.getenv('GROQ_API_KEY'),
    # Google Gemini (use API key from Google AI Studio / API Key)
    'GEMINI_API_KEY': os.getenv('GEMINI_API_KEY'),
    # Edge TTS does not require a key when using local package; optionally
    # provide Azure credentials if using Azure TTS
    'EDGE_TTS_KEY': os.getenv('EDGE_TTS_KEY'),
    'EDGE_TTS_REGION': os.getenv('EDGE_TTS_REGION'),
    # YouTube OAuth2 client secrets JSON path
    'YOUTUBE_CLIENT_SECRETS': os.getenv('YOUTUBE_CLIENT_SECRETS'),
}

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUTPUT_DIR = os.path.join(BASE_DIR, 'outputs')

os.makedirs(OUTPUT_DIR, exist_ok=True)
