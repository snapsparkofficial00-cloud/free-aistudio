import argparse
import os
from .config import OUTPUT_DIR
from .script_gen import generate_script
from .image_gen import generate_images
from .voice_gen import text_to_speech
from .video_assembly import images_and_audio_to_video

def run_pipeline(topic: str, skip_video=False, skip_upload=True):
    out = os.path.join(OUTPUT_DIR, topic.replace(' ', '_'))
    os.makedirs(out, exist_ok=True)

    print('Generating script...')
    script = generate_script(topic)
    with open(os.path.join(out, 'script.txt'), 'w', encoding='utf8') as f:
        f.write(script['script'])

    print('Generating images...')
    images_dir = os.path.join(out, 'images')
    image_paths = generate_images(script['prompts'], images_dir)

    print('Generating voice...')
    audio_path = os.path.join(out, 'voice.mp3')
    text_to_speech(script['script'], audio_path)

    if not skip_video:
        print('Assembling video with ffmpeg...')
        video_path = os.path.join(out, 'final_video.mp4')
        # For shorts, output vertical 9:16; for demo use 1080x1920
        images_and_audio_to_video(image_paths, audio_path, video_path, fps=1, resolution='1080x1920')
        print('Video assembled at', video_path)
    else:
        print('skip_video=True, video assembly skipped')

    if not skip_upload:
        print('Uploading to YouTube (not configured)')
    else:
        print('skip_upload=True, upload skipped')

    print('Pipeline complete. Outputs in', out)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--topic', required=True)
    parser.add_argument('--skip-video', action='store_true')
    parser.add_argument('--skip-upload', action='store_true')
    args = parser.parse_args()
    run_pipeline(args.topic, skip_video=args.skip_video, skip_upload=args.skip_upload)
