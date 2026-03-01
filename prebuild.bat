@echo off
cd /d "%~dp0"
echo y | npx expo prebuild --platform android --clean
