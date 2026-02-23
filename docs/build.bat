@echo off
echo ============================================
echo  PodTeksT Documentation Builder
echo ============================================
echo.

cd /d "%~dp0"

echo [1/4] First pass (building structure)...
xelatex -interaction=nonstopmode -shell-escape podtekst-docs.tex >nul 2>&1
if errorlevel 1 (
    echo WARNING: First pass had errors. Running verbose...
    xelatex -interaction=nonstopmode -shell-escape podtekst-docs.tex
    goto :end
)

echo [2/4] Building index...
makeindex podtekst-docs.idx >nul 2>&1

echo [3/4] Second pass (resolving references)...
xelatex -interaction=nonstopmode -shell-escape podtekst-docs.tex >nul 2>&1

echo [4/4] Third pass (final)...
xelatex -interaction=nonstopmode -shell-escape podtekst-docs.tex >nul 2>&1

echo.
echo ============================================
if exist podtekst-docs.pdf (
    echo  SUCCESS: podtekst-docs.pdf created
    for %%A in (podtekst-docs.pdf) do echo  Size: %%~zA bytes
) else (
    echo  ERROR: PDF not created
)
echo ============================================

:end
pause
