@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0" || exit /b 1
if not exist "docs\PLAN_MAESTRO_v4.md" goto wrongroot
if not exist "scripts\search_cmr.py" goto wrongroot
if not exist ".git" goto wrongroot
if /i not "%~1"=="" if /i not "%~1"=="--app-deps" goto usage
where git >nul 2>&1 || goto missing
where claude >nul 2>&1 || goto missing
where python >nul 2>&1 || goto missing
where node >nul 2>&1 || goto missing
where npm >nul 2>&1 || goto missing
python -c "import sys; assert (3,11)<=sys.version_info[:2]<=(3,12), 'Use Python 3.11 or 3.12'" || goto fail
call claude --version || goto fail
node --version || goto fail
call npm --version || goto fail
git status --short || goto fail
if not exist ".bosquevivo-work" mkdir ".bosquevivo-work" || goto fail
if not exist ".venv\Scripts\python.exe" python -m venv .venv || goto fail
".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -r scripts\requirements-science.txt > ".bosquevivo-work\pip-install.log" 2>&1
if errorlevel 1 goto pipfail
".venv\Scripts\python.exe" -m pip check || goto fail
".venv\Scripts\python.exe" -c "import earthaccess,numpy,rasterio,h5py,shapely,pytest; print('Scientific imports OK')" || goto fail
".venv\Scripts\python.exe" -m pip freeze > ".bosquevivo-work\pip-freeze.txt"
rem Isolated browser tooling, not the existing app package.json.
if not exist ".bosquevivo-tools" mkdir ".bosquevivo-tools" || goto fail
if not exist ".bosquevivo-tools\package.json" echo {"name":"bosquevivo-qa-tools","version":"1.0.0","private":true} > ".bosquevivo-tools\package.json"
if not exist ".bosquevivo-tools\node_modules\@playwright\test\cli.js" (
  call npm --prefix .bosquevivo-tools install --save-exact @playwright/test@1.56.1 --ignore-scripts --no-audit --no-fund > ".bosquevivo-work\playwright-install.log" 2>&1
  if errorlevel 1 goto pwfail
)
set "PLAYWRIGHT_BROWSERS_PATH=%CD%\.bosquevivo-tools\browsers"
node .bosquevivo-tools\node_modules\@playwright\test\cli.js install chromium > ".bosquevivo-work\chromium-install.log" 2>&1
if errorlevel 1 goto pwfail
if /i "%~1"=="--app-deps" (
  if not exist "package-lock.json" goto nolock
  call npm ci --no-audit --no-fund > ".bosquevivo-work\app-install.log" 2>&1
  if errorlevel 1 goto appfail
)
rem CMR is metadata-only; failure does not block UI work.
".venv\Scripts\python.exe" scripts\search_cmr.py > ".bosquevivo-work\cmr-preflight.log" 2>&1
if errorlevel 1 echo WARNING: CMR query incomplete. See .bosquevivo-work\cmr-preflight.log
if not exist ".bosquevivo-work\catalog" echo WARNING: No catalog directory yet.
echo.
echo Preflight finished. Review logs, Earthdata login and existing app dependencies.
echo Read docs\OPERACION_NOCTURNA.md before running iniciar_bosquevivo.bat.
echo No system software installed, no push or deploy performed.
exit /b 0
:wrongroot
echo ERROR: Copy package into the root of the intended Git project first.
exit /b 1
:usage
echo Usage: preparar_bosquevivo.bat [--app-deps]
exit /b 1
:missing
echo ERROR: Install Git, Claude Code CLI, Python 3.11/3.12, Node and npm manually first.
exit /b 1
:pipfail
echo ERROR: Scientific setup failed. See .bosquevivo-work\pip-install.log
exit /b 1
:pwfail
echo ERROR: Playwright setup failed. See .bosquevivo-work\playwright-install.log or chromium-install.log
exit /b 1
:nolock
echo ERROR: --app-deps requires package-lock.json. Use the existing package manager manually.
exit /b 1
:appfail
echo ERROR: npm ci failed. See .bosquevivo-work\app-install.log
exit /b 1
:fail
echo ERROR: Preflight failed. Review output; do not bypass permissions.
exit /b 1
