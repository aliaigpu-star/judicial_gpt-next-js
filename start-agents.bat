@echo off
REM Starts all JudicialGPT agents (one window each). Extra arguments are passed on,
REM e.g.  start-agents.bat -Only civil-law,search
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-agents.ps1" %*
