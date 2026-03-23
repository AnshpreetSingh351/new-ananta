@echo off
mkdir videos\optimized 2>nul

for /L %%i in (1,1,6) do (
    echo Encoding section%%i.mp4 ...
    ffmpeg -i videos\section%%i.mp4 -c:v libx264 -g 1 -bf 0 -crf 20 -preset fast -an videos\optimized\section%%i.mp4
)

echo Done! Replace your old videos with the ones in videos\optimized\
pause