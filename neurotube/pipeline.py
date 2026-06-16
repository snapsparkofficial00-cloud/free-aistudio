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

    print('Generating voice...')
    audio_path = os.path.join(out, 'voice.mp3')
    text_to_speech(script['script'], audio_path)

    from pydub import AudioSegment
    audio = AudioSegment.from_file(audio_path)
    audio_duration = audio.duration_seconds
    if mode == 'shorts':
        image_count = min(max(round(audio_duration / 1.0), 20), 30)
        resolution = '1080x1920'
    else:
        image_count = min(max(round(audio_duration / 4.0), 30), 45)
        resolution = '1920x1080'

    print(f'Adaptive image count for mode={mode}: {image_count} images (audio {audio_duration:.1f}s)')
    print('Generating images...')
    segments = [s.strip() for s in script['script'].splitlines() if s.strip()]
    prompts = []
    if segments:
        import math
        repeat = math.ceil(image_count / len(segments))
        for _ in range(repeat):
            for seg in segments:
                if len(prompts) < image_count:
                    prompts.append(seg)
                else:
                    break
    else:
        prompts = [f"{topic} - scene {i+1} - cinematic, high detail, photorealistic" for i in range(image_count)]

    images_dir = os.path.join(out, 'images')
    image_paths = generate_images(
        prompts,
        images_dir,
        width=int(resolution.split('x')[0]),
        height=int(resolution.split('x')[1]),
        use_gemini=True,
    )

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
