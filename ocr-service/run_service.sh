#!/bin/bash
echo "==================================================="
echo "🚀 AURA LEARNING - LOCAL PADDLEOCR & CV SERVICE"
echo "==================================================="
echo ""

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

if [ -f "./venv/bin/python" ]; then
    PYTHON_CMD="./venv/bin/python"
    PIP_CMD="./venv/bin/pip"
else
    PYTHON_CMD="python3"
    PIP_CMD="pip3"
fi

echo "1. Python interpreter: $($PYTHON_CMD --version)"
echo "2. Kiểm tra và cài đặt thư viện..."
$PIP_CMD install -r requirements.txt

echo ""
echo "3. Khởi chạy FastAPI OCR & CV Service tại cổng 8000..."
echo "Endpoints:"
echo " - OCR: http://localhost:8000/api/v1/ocr"
echo " - Refine Bbox: http://localhost:8000/api/v1/refine-bbox"
echo " - Extract Native: http://localhost:8000/api/v1/extract-native"
echo ""

$PYTHON_CMD main.py
