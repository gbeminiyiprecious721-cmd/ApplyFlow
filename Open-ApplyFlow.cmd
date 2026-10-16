@echo off
cd /d "%~dp0"
where code >nul 2>nul
if not errorlevel 1 (
  call code --new-window "%~dp0"
  exit /b
)
if exist "%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe" (
  start "" "%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe" "%~dp0"
  exit /b
)
if exist "%ProgramFiles%\Microsoft VS Code\Code.exe" (
  start "" "%ProgramFiles%\Microsoft VS Code\Code.exe" "%~dp0"
  exit /b
)
echo Open Visual Studio Code, choose File - Open Folder, and select this ApplyFlow folder.
pause
