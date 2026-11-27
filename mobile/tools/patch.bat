@echo off
REM Pronesto: live app ko bina APK bheje update karna (Shorebird patch).
REM Chalane ka tarika: mobile folder mein double-click ya  tools\patch.bat
REM Sirf Dart/UI badlav ke liye. Naya plugin/permission ho to release.bat chalao.
REM Patch ka Flutter version release wala hi apne aap use hota hai (3.47.6).

cd /d "%~dp0\.."
set "PATH=%PATH%;%USERPROFILE%\.shorebird\bin"

REM pubspec.yaml ke version (jaise 1.0.1+2) ko release version maanta hai.
for /f "tokens=2" %%v in ('findstr /b "version:" pubspec.yaml') do set VER=%%v
echo Release version: %VER%
echo.
set /p OK="Is version par patch bhejna hai? (y/n): "
if /i not "%OK%"=="y" exit /b 1

call shorebird patch android --flavor pronesto --target lib/main.dart --release-version=%VER% --track=stable --android-skip-build-dependency-validation --dart-define=APP_BRAND_NAME=Pronesto --dart-define=APP_BRAND_SPLIT=3 --dart-define=APP_SPLASH_SPLIT1=3 --dart-define=APP_SPLASH_SPLIT2=7

if errorlevel 1 (
  echo.
  echo *** PATCH FAIL HUA. Upar ka error padho ya mujhe bhejo. ***
  pause
  exit /b 1
)

echo.
echo Patch ho gaya. Phone par app poori band karke 1-2 baar dobara kholo.
pause
