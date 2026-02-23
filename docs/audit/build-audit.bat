@echo off
echo ============================================
echo  PodTeksT Audit Report Builder
echo ============================================
echo.

cd /d "%~dp0"
set TEXINPUTS=..;%TEXINPUTS%

echo [1/4] First pass (building structure)...
xelatex -interaction=nonstopmode -shell-escape podtekst-audit.tex >nul 2>&1
if errorlevel 1 (
    echo WARNING: First pass had errors. Running verbose...
    xelatex -interaction=nonstopmode -shell-escape podtekst-audit.tex
    goto :end
)

echo [2/4] Building index...
makeindex podtekst-audit.idx >nul 2>&1

echo [3/4] Second pass (resolving references)...
xelatex -interaction=nonstopmode -shell-escape podtekst-audit.tex >nul 2>&1

echo [4/4] Third pass (final)...
xelatex -interaction=nonstopmode -shell-escape podtekst-audit.tex >nul 2>&1

echo.
echo ============================================
if exist podtekst-audit.pdf (
    echo  SUCCESS: podtekst-audit.pdf created
    for %%A in (podtekst-audit.pdf) do echo  Size: %%~zA bytes
) else (
    echo  ERROR: PDF not created
)
echo ============================================

:end
pause
