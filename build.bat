@echo off
where zip >nul 2>nul || (echo Please install a zip utility.& exit /b 1)
zip -r electrochem-translator.xpi manifest.json bootstrap.js content
