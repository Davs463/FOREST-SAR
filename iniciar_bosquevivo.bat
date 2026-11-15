@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0" || exit /b 1
if not exist "docs\PLAN_MAESTRO_v4.md" goto fail
if not exist "docs\PROMPT_INICIO.md" goto fail
if not exist ".claude\bosquevivo-session.json" goto fail
if not exist ".git" goto fail
if not exist ".venv\Scripts\python.exe" goto fail
if not exist ".bosquevivo-tools\node_modules\@playwright\test\cli.js" goto fail
where claude >nul 2>&1 || goto fail
where git >nul 2>&1 || goto fail
set "BRANCH="
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not defined BRANCH goto branchfail
if /i "%BRANCH%"=="main" goto branchfail
if /i "%BRANCH%"=="master" goto branchfail
if not exist ".bosquevivo-work" mkdir ".bosquevivo-work" || goto fail
if exist ".bosquevivo-work\claude-run.log" (
  echo Existing run log found. Rename or archive it manually before starting another run.
  exit /b 1
)
set "PLAYWRIGHT_BROWSERS_PATH=%CD%\.bosquevivo-tools\browsers"
rem This is a permission-limited run, not an OS sandbox. Review inherited settings first.
rem Pipe the prompt through stdin; no slash command dependency in print mode.
echo Starting bounded Claude Code run on %BRANCH%.
echo Review docs\OPERACION_NOCTURNA.md and permissions before running unattended.
echo Output: .bosquevivo-work\claude-run.log
echo Press Ctrl+C to stop. No automatic push or deploy.
call claude -p --permission-mode dontAsk --settings ".claude/bosquevivo-session.json" --max-turns 100 < "docs\PROMPT_INICIO.md" > ".bosquevivo-work\claude-run.log" 2>&1
set "RESULT=%ERRORLEVEL%"
echo Claude Code exit code: %RESULT%
echo Review log, docs\PROGRESS.md and docs\HANDOFF.md. A zero exit code is not proof of completed work.
exit /b %RESULT%
:branchfail
echo ERROR: Create or switch to a dedicated feature branch before running.
exit /b 1
:fail
echo ERROR: Run preparar_bosquevivo.bat and ensure this is the project root.
exit /b 1
