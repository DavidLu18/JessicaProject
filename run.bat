@echo off
echo =====================================================
echo    STARTING ENGLISHPRO TEXT CONVERSION APPLICATION
echo =====================================================
echo.

:: Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Python is not installed or not in your PATH.
    echo Please install Python 3.8 or higher from https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

:: Check if FFmpeg is available
where ffmpeg >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo WARNING: FFmpeg is not installed or not in your PATH.
    echo Some audio conversion features may not work properly.
    echo It's recommended to install FFmpeg from https://ffmpeg.org/download.html
    echo.
    timeout /t 3 >nul
)

:: Check if Tesseract is available (for image-to-text)
where tesseract >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo WARNING: Tesseract OCR is not installed or not in your PATH.
    echo The image-to-text feature may not work properly.
    echo It's recommended to install Tesseract from https://github.com/UB-Mannheim/tesseract/wiki
    echo.
    timeout /t 3 >nul
)

:: Check if required packages are installed
echo Checking and installing required packages...
pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    echo Failed to install requirements.
    pause
    exit /b 1
)

echo.
echo =====================================================
echo    STARTING SERVER - DO NOT CLOSE THIS WINDOW
echo =====================================================
echo.
echo Server starting at http://localhost:5000
echo.
echo CTRL+C to stop the server
echo.

:: Start the Flask application
python app.py

pause