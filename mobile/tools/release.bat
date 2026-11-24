@echo off
REM Pronesto: NAYA release APK banana (sirf tab jab plugin/permission/Android setting badli ho).
REM Pehle pubspec.yaml mein version badhao (jaise 1.0.1+2 -> 1.0.2+3), phir ye chalao.
REM Chalane ka tarika: tools\release.bat

cd /d "%~dp0\.."
set "PATH=%PATH%;%USERPROFILE%\.shorebird\bin"

for /f "tokens=2" %%v in ('findstr /b "version:" pubspec.yaml') do set VER=%%v
echo Naya release version: %VER%
echo (Ye version pehle se Shorebird mein ho to fail hoga - pubspec mein version badhao.)
echo.
set /p OK="Release banana hai? (y/n): "
if /i not "%OK%"=="y" exit /b 1

call shorebird release android --flutter-version=3.47.6 --flavor pronesto --target lib/main.dart --android-skip-build-dependency-validation --dart-define=APP_BRAND_NAME=Pronesto --dart-define=APP_BRAND_SPLIT=3 --dart-define=APP_SPLASH_SPLIT1=3 --dart-define=APP_SPLASH_SPLIT2=7 --artifact apk

echo.
echo APK yahan hai: %CD%\build\app\outputs\flutter-apk\app-pronesto-release.apk
pause
