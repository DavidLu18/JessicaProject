@echo off
cls
echo.
echo ⚡ EnglishPro - Starting Application...
echo.

:: Silent checks for dependencies
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Python not found. Please install Python 3.8+ from https://python.org
    pause & exit /b 1
)

:: Quick dependency check (silent mode)
echo 📦 Installing dependencies...
pip install -r requirements.txt >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to install dependencies. Check your internet connection.
    pause & exit /b 1
)

:: Optional dependencies check (warnings only)
where ffmpeg >nul 2>nul
if %ERRORLEVEL% neq 0 echo ⚠️  FFmpeg not found - Audio conversion may be limited

where tesseract >nul 2>nul
if %ERRORLEVEL% neq 0 echo ⚠️  Tesseract not found - Image OCR may be limited

echo.
echo ✅ Ready! Opening EnglishPro at http://localhost:5000
echo 📍 Press Ctrl+C to stop the server
echo.

:: Start Flask with minimal output
python app.py

echo.
echo 👋 Server stopped. Press any key to exit...
pause >nul