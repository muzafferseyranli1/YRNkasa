@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

echo ===================================================
echo YRN Kasa - Otomatik GitHub Guncelleme & Push Araci
echo ===================================================
echo.

set /p commitMsg="[?] Degisiklik aciklamasi (Enter: Guncelleme): "
if "!commitMsg!"=="" set commitMsg="Guncelleme"

git add .
git commit -m "!commitMsg!"
echo.
echo Kodlar GitHub'a gonderiliyor...
git push -u origin main

echo.
echo ===================================================
echo ISLEM TAMAMLANDI! Coolify otomatik olarak yayina alacaktir.
echo ===================================================
pause
