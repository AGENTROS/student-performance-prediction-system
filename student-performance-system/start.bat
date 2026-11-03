@echo off
setlocal
cd /d "%~dp0"
echo Starting Student Performance Prediction System...
if not exist ".venv\Scripts\python.exe" (
  echo Creating Python environment...
  py -m venv .venv
  if errorlevel 1 goto failed
)
echo Installing backend requirements...
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
if errorlevel 1 goto failed
echo Building the web interface...
cd frontend
if not exist node_modules (
  call npm install
  if errorlevel 1 goto failed
)
call npm run build
if errorlevel 1 goto failed
cd ..
echo Opening the website at http://localhost:5000
start "" http://localhost:5000
.venv\Scripts\python.exe backend\app.py
goto end
:failed
echo.
echo Setup failed. Check the error above, then run start.bat again.
pause
:end
endlocal
