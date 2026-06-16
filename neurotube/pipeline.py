import argparse
import os
from .config import OUTPUT_DIR
from .script_gen import generate_script
from .image_gen import generate_images
from .voice_gen import text_to_speech
from .video_assembly import images_and_audio_to_video

def run_pipeline(topic: str, skip_video=False, skip_upload=True, mode: str = 'shorts'):
    out = os.path.join(OUTPUT_DIR, topic.replace(' ', '_'))
    os.makedirs(out, exist_ok=True)

    print('Generating script...')
    script = generate_script(topic)
    with open(os.path.join(out, 'script.txt'), 'w', encoding='utf8') as f:
        f.write(script['script'])

    print('Generating images...')
    # Map script segments to prompts exactly so each image prompt matches the
    # voiceover segment. Split script by lines and use non-empty lines as
    # segments.
    segments = [s.strip() for s in script['script'].splitlines() if s.strip()]

    # Determine desired image count per mode
    if mode == 'shorts':
        desired_count = 25  # within 20-30
        resolution = '1080x1920'
    else:
        desired_count = 35  # within 30-45
        resolution = '1920x1080'

    # Build prompts: each prompt should match a script segment exactly.
    prompts = []
    if segments:
        # Repeat segments proportionally to reach desired_count
        import math
        times = math.ceil(desired_count / len(segments))
        for _ in range(times):
            for seg in segments:
                if len(prompts) < desired_count:
                    prompts.append(seg)
                else:
                    break
    else:
        # Fallback if no segments found
        prompts = [f"{topic} - scene {i+1} - cinematic, high detail, photorealistic" for i in range(desired_count)]

    images_dir = os.path.join(out, 'images')
    image_paths = generate_images(prompts, images_dir, width=int(resolution.split('x')[0]), height=int(resolution.split('x')[1]), use_gemini=True)

    print('Generating voice...')
    audio_path = os.path.join(out, 'voice.mp3')
    text_to_speech(script['script'], audio_path)

    if not skip_video:
        print('Assembling video with ffmpeg...')
        video_path = os.path.join(out, 'final_video.mp4')
        # Assemble video; pass resolution according to mode
        images_and_audio_to_video(image_paths, audio_path, video_path, mode=mode, resolution=resolution)
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
    parser.add_argument('--mode', choices=['shorts', 'long'], default='shorts')
    args = parser.parse_args()
    run_pipeline(args.topic, skip_video=args.skip_video, skip_upload=args.skip_upload, mode=args.mode)
