#!/bin/bash
# Downloads OpenDyslexic OFL-licensed fonts
FONT_DIR="public/fonts/OpenDyslexic"
mkdir -p "$FONT_DIR"

# Download from the official GitHub release
BASE="https://github.com/antijingoist/opendyslexic/raw/master/compiled"
curl -L "$BASE/OpenDyslexic-Regular.otf" -o "$FONT_DIR/OpenDyslexic-Regular.otf"
curl -L "$BASE/OpenDyslexic-Bold.otf" -o "$FONT_DIR/OpenDyslexic-Bold.otf"
echo "Fonts downloaded."
