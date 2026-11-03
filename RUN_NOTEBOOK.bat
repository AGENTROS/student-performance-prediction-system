@echo off
setlocal
cd /d "%~dp0"
echo Installing notebook requirements for the current Windows user...
py -m pip install --user -r requirements-notebook.txt
if errorlevel 1 goto failed
echo Starting JupyterLab...
py -m jupyterlab Student_Performance_Prediction_System.ipynb
if errorlevel 1 goto failed
goto end
:failed
echo.
echo Notebook setup or startup failed. Check the error above.
pause
:end
endlocal
