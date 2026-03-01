@echo off
cd /d "%~dp0"
call gradlew.bat assembleDebug --no-daemon
