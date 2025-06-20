@echo off
title EnglishPro
cls

:: Quick silent checks
where python >nul 2>nul || (echo ❌ Python required & pause & exit /b)
pip install -r requirements.txt >nul 2>nul

:: Start with minimal output
echo ⚡ EnglishPro starting...
python app.py

pause >nul 