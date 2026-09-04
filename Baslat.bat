@echo off
chcp 65001 >nul
title YRN Kasa Uygulamasi

echo ===================================================
echo YRN Kasa - Gunluk Kasa & Mutabakat Uygulamasi
echo ===================================================
echo.
echo Sunucu baslatiliyor...
echo.

:: Tarayicida 2 saniye sonra otomatik acmasi icin arka planda calistir
start "" http://localhost:3000

:: Express sunucusunu baslat
node server/index.js

pause
