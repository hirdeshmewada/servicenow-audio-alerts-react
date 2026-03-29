@echo off
echo Building ServiceNow Audio Alerts React Extension...

REM Create dist directory
if not exist dist mkdir dist
if not exist dist\public mkdir dist\public
if not exist dist\public\sound mkdir dist\public\sound
if not exist dist\public\icons mkdir dist\public\icons

REM Copy public files
echo Copying public files...
xcopy public\*.* dist\ /E /I /H /Y > nul

REM Copy background files
echo Copying background files...
xcopy src\background\*.* dist\ /Y > nul

REM Copy content files
echo Copying content files...
xcopy src\content\*.* dist\ /Y > nul

REM Create a simple options.js that loads React components
echo Creating options.js...
echo import React from 'react'; > dist\options.js
echo import ReactDOM from 'react-dom/client'; >> dist\options.js
echo import App from './src/App.jsx'; >> dist\options.js
echo import './src/styles/globals.css'; >> dist\options.js
echo. >> dist\options.js
echo const root = ReactDOM.createRoot(document.getElementById('root')); >> dist\options.js
echo root.render(^<React.StrictMode^>^<App /^>^</React.StrictMode^>^); >> dist\options.js

REM Create a simple popup.js
echo Creating popup.js...
echo import React from 'react'; > dist\popup.js
echo import ReactDOM from 'react-dom/client'; >> dist\popup.js
echo import Popup from './src/components/Popup/Popup.jsx'; >> dist\popup.js
echo import './src/components/Popup/Popup.css'; >> dist\popup.js
echo. >> dist\popup.js
echo const root = ReactDOM.createRoot(document.getElementById('root')); >> dist\popup.js
echo root.render(^<React.StrictMode^>^<Popup /^>^</React.StrictMode^>^); >> dist\popup.js

echo.
echo Build completed!
echo Extension files are in the 'dist' folder
echo Load the extension in Chrome using chrome://extensions
pause
