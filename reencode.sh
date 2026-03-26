#!/bin/bash
mkdir -p videos/optimized

for i in 1 2 3 4 5 6; do
    echo "Encoding section${i}.mp4 ..."
    ffmpeg -i "videos/section${i}.mp4" -c:v libx264 -g 1 -bf 0 -crf 18 -preset fast -an "videos/optimized/section${i}.mp4"
done

echo "Done! Replace your old videos with the ones in videos/optimized/"