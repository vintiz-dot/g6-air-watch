@echo off
rem Air Watch - one lesson laptop in kiosk mode: full screen, no tabs, no address bar.
rem Double-click it before the lesson. To close it at the end: Alt+F4.
rem Uses Google Chrome if the laptop has it, otherwise Microsoft Edge.
rem It keeps its own browser profile, so it also works when Chrome is already open.
setlocal
set "URL=https://vintiz-dot.github.io/g6-air-watch/"
set "PROFILE=%LOCALAPPDATA%\AirWatchKiosk"

set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%BROWSER%" goto chrome
set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%BROWSER%" goto chrome
set "BROWSER=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if exist "%BROWSER%" goto chrome
set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if exist "%BROWSER%" goto edge
set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%BROWSER%" goto edge
echo Google Chrome or Microsoft Edge was not found on this laptop.
echo Open %URL% in the browser instead.
pause
exit /b 1

:chrome
start "" "%BROWSER%" --kiosk --user-data-dir="%PROFILE%" --no-first-run --no-default-browser-check "%URL%"
exit /b 0

:edge
start "" "%BROWSER%" --kiosk "%URL%" --edge-kiosk-type=fullscreen --user-data-dir="%PROFILE%" --no-first-run
exit /b 0
