#!/usr/bin/env bash
# Generate production-ready sound files.
# Requires ffmpeg with libmp3lame support.
#
# Usage:  bash scripts/generate-sounds.sh
#
# The WAV placeholders created by generate-sounds.py serve as the source;
# this script re-encodes them to MP3 at a loudness below -18 LUFS.

set -euo pipefail

DIR="$(cd "$(dirname "$0")/../public/sounds" && pwd)"

if ! command -v ffmpeg &>/dev/null; then
  echo "ffmpeg not found. Install ffmpeg with libmp3lame support or use the WAV fallback."
  exit 1
fi

for f in confirm success; do
  wav="$DIR/$f.wav"
  mp3="$DIR/$f.mp3"
  if [[ -f "$wav" ]]; then
    ffmpeg -y -i "$wav" -codec:a libmp3lame -b:a 96k -af "loudnorm=I=-18:TP=-1.5:LRA=11" "$mp3"
    echo "Generated $mp3"
  fi
done

echo "Done."
