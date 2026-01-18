@echo off
chcp 65001 >nul
echo =========================================
echo   棉花糖工具箱 - GitHub 上傳
echo =========================================
echo.

cd /d "C:\棉花糖工具箱"

powershell -ExecutionPolicy Bypass -File "upload-to-github.ps1"

pause