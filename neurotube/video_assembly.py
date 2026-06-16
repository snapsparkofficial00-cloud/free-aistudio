import os
import subprocess
from typing import List
from pydub import AudioSegment


def images_and_audio_to_video(image_paths: List[str], audio_path: str, out_path: str,
                              mode: str = 'shorts', transition: float = 0.5,
                              resolution: str = None) -> str:
    """Create a video from images and audio with smooth crossfade transitions.

    - `mode`: 'shorts' -> vertical 9:16, 1s per image default; 'long' -> 16:9
      3-5s per image default.
    - `transition`: duration of crossfade in seconds.
    - `resolution`: e.g., '1080x1920' or '1920x1080'. If None, inferred from mode.
    """
    if mode == 'shorts':
        if resolution is None:
            resolution = '1080x1920'
        default_dur = 1.0
    else:
        if resolution is None:
            resolution = '1920x1080'
        default_dur = 4.0

    # Load audio duration
    audio = AudioSegment.from_file(audio_path)
    audio_duration = audio.duration_seconds

    n = len(image_paths)
    # Compute per-image duration to match audio length if possible
    per_image = audio_duration / n if n > 0 else default_dur

    # Build ffmpeg input args: loop each image for per_image + transition
    inputs = []
    for p in image_paths:
        inputs.extend(['-loop', '1', '-t', str(per_image + transition), '-i', os.path.abspath(p)])

    # Construct filter_complex using chain of xfade filters
    filter_parts = []
    for i in range(n):
        filter_parts.append(f"[{i}:v]scale={resolution},setsar=1[v{i}]")

    xfade_parts = []
    if n == 1:
        filter_complex = ';'.join(filter_parts) + f";[v0]format=yuv420p[vid]"
    else:
        # chain xfade
        for i in range(n - 1):
            if i == 0:
                # first xfade between v0 and v1
                offset = per_image
                xfade = f"[v0][v1]xfade=transition=fade:duration={transition}:offset={offset}[x1]"
            else:
                offset = per_image * (i + 1)
                prev = f"x{i}"
                cur = f"v{i+1}"
                xfade = f"[{prev}][{cur}]xfade=transition=fade:duration={transition}:offset={offset}[x{i+1}]"
            xfade_parts.append(xfade)

        filter_complex = ';'.join(filter_parts + xfade_parts) + f";[x{n-1}]format=yuv420p[vid]"

        # Add audio input after image inputs
        cmd = ['ffmpeg', '-y'] + inputs + ['-i', os.path.abspath(audio_path), '-filter_complex', filter_complex,
            '-map', '[vid]', '-map', str(n) + ':a', '-c:v', 'libx264', '-c:a', 'aac', '-shortest', out_path]

    # Run command
    subprocess.check_call(cmd)
    return out_path
