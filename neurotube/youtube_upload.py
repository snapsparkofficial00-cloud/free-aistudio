import os
import json
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/youtube.upload']


def upload_to_youtube(video_path: str, title: str, description: str, tags: list, client_secrets_file: str = None):
    """Upload a video to YouTube using OAuth2 installed flow.

    `client_secrets_file` should be a path to a Google Cloud OAuth2 client
    secrets JSON file with YouTube Data API enabled.
    """
    if not client_secrets_file or not os.path.exists(client_secrets_file):
        raise RuntimeError('YouTube client secrets JSON not configured or not found')

    flow = InstalledAppFlow.from_client_secrets_file(client_secrets_file, SCOPES)
    creds = flow.run_local_server(port=0)

    youtube = build('youtube', 'v3', credentials=creds)

    body = {
        'snippet': {
            'title': title,
            'description': description,
            'tags': tags
        },
        'status': {
            'privacyStatus': 'private'
        }
    }

    request = youtube.videos().insert(
        part=','.join(body.keys()),
        body=body,
        media_body=video_path
    )

    response = request.execute()
    return response
