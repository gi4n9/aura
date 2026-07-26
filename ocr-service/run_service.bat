@echo off
echo ===================================================
echo 🚀 AURA LEARNING - LOCAL PADDLEOCR SERVICE STARTER
echo ===================================================
echo.
cd /d %~dp0

echo 1. Kiem tra Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Python chua duoc cai dat tren may tinh.
    echo Vui long tai va cai dat Python 3.10 hoac 3.11 tai: https://www.python.org/
    pause
    exit /b 1
)

echo 2. Dang cai dat/cap nhat cac thu vien phu thuộc...
python -m pip install -r requirements.txt

echo.
echo 3. Dang khoi chay Local PaddleOCR Server tai cong 8000...
echo API endpoint: http://localhost:8000/api/v1/ocr
echo Nhan Ctrl+C de dung server.
echo.
python main.py

pause
