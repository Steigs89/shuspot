@echo off
REM ShuSpot Book Uploader for Windows
REM ==================================
REM 
REM This batch file helps you upload book folders to Supabase using Rclone.
REM 
REM Usage: 
REM   1. Drag and drop your book folder onto this file, OR
REM   2. Run: upload_books.bat "C:\path\to\your\book\folder"
REM 
REM Requirements:
REM   - Rclone installed and in PATH
REM   - Supabase remote configured in Rclone
REM   - Python 3.6+ (optional, for advanced features)

setlocal enabledelayedexpansion

echo.
echo ========================================
echo    ShuSpot Book Uploader
echo ========================================
echo.

REM Check if folder path was provided
if "%~1"=="" (
    echo Error: Please provide a folder path.
    echo.
    echo Usage: 
    echo   - Drag and drop your book folder onto this file, OR
    echo   - Run: upload_books.bat "C:\path\to\your\book\folder"
    echo.
    pause
    exit /b 1
)

set "BOOK_FOLDER=%~1"
set "FOLDER_NAME=%~n1"

REM Check if the folder exists
if not exist "%BOOK_FOLDER%" (
    echo Error: Folder does not exist: %BOOK_FOLDER%
    pause
    exit /b 1
)

echo Uploading folder: %BOOK_FOLDER%
echo Remote path will be: %FOLDER_NAME%
echo.

REM Check if Rclone is installed
rclone version >nul 2>&1
if errorlevel 1 (
    echo Error: Rclone is not installed or not in PATH.
    echo Please install Rclone from: https://rclone.org/install/
    pause
    exit /b 1
)

echo ✓ Rclone is installed

REM Check if Supabase remote exists
rclone listremotes | findstr "supabase:" >nul
if errorlevel 1 (
    echo Error: Supabase remote not configured.
    echo Please configure Rclone with your Supabase credentials first.
    echo.
    echo Example:
    echo   rclone config create supabase s3 ^
    echo     provider=Other ^
    echo     endpoint=https://your-project.supabase.co/storage/v1/s3 ^
    echo     access_key_id=your-access-key ^
    echo     secret_access_key=your-secret-key
    pause
    exit /b 1
)

echo ✓ Supabase remote is configured
echo.

REM Upload the folder
echo Uploading to Supabase...
echo This may take a while for large folders...
echo.

rclone sync "%BOOK_FOLDER%" "supabase:shuspot-books/%FOLDER_NAME%" --progress --transfers=4

if errorlevel 1 (
    echo.
    echo ❌ Upload failed!
    pause
    exit /b 1
)

echo.
echo ✅ Upload completed successfully!
echo.

REM Generate manifest
echo Generating manifest file...
set "MANIFEST_FILE=manifest_%FOLDER_NAME%_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.json"
set "MANIFEST_FILE=%MANIFEST_FILE: =0%"

rclone lsjson --recursive "supabase:shuspot-books/%FOLDER_NAME%" > "%MANIFEST_FILE%"

if errorlevel 1 (
    echo ❌ Failed to generate manifest
    pause
    exit /b 1
)

echo ✅ Manifest saved to: %MANIFEST_FILE%
echo.

echo ========================================
echo    Upload Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Open your book admin interface
echo 2. Go to the 'Local Database' tab  
echo 3. Choose 'Rclone + Supabase' upload method
echo 4. Upload the manifest file: %MANIFEST_FILE%
echo 5. Your books will be imported automatically!
echo.

pause