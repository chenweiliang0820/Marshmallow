# Marshmallow Toolbox - GitHub Upload Script
# Make sure Git is installed before running

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Marshmallow Toolbox - GitHub Upload" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Git is installed
Write-Host "Checking Git installation..." -ForegroundColor Yellow

# Reload PATH environment variable
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Git installed: $gitVersion" -ForegroundColor Green
    } else {
        throw "Git not found"
    }
} catch {
    Write-Host "Git not installed or not in PATH!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Download: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "After installation, restart PowerShell and run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Project directory
$projectPath = "C:\棉花糖工具箱"
Set-Location $projectPath

Write-Host "Project directory: $projectPath" -ForegroundColor Cyan
Write-Host ""

# Check if Git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "Git repository already exists" -ForegroundColor Green
}

Write-Host ""

# Check if remote is set
$remoteUrl = git remote get-url origin 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Setting remote repository..." -ForegroundColor Yellow
    git remote add origin https://github.com/chenweiliang0820/Marshmallow.git
    Write-Host "Remote repository set" -ForegroundColor Green
} else {
    Write-Host "Remote repository: $remoteUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Update remote URL? (Y/N)" -ForegroundColor Yellow
    $update = Read-Host
    if ($update -eq "Y" -or $update -eq "y") {
        git remote set-url origin https://github.com/chenweiliang0820/Marshmallow.git
        Write-Host "Remote URL updated" -ForegroundColor Green
    }
}

Write-Host ""

# Check file changes
Write-Host "Checking file status..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "Add all files and commit? (Y/N)" -ForegroundColor Yellow
$proceed = Read-Host

if ($proceed -eq "Y" -or $proceed -eq "y") {
    Write-Host ""
    Write-Host "Adding all files..." -ForegroundColor Yellow
    git add .
    Write-Host "Files added" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Creating commit..." -ForegroundColor Yellow
    
    $commitMessage = "Initial commit: Marshmallow Toolbox project initialization`n`n- React + Vite + TypeScript project`n- Tailwind CSS dark theme with tech-style visuals`n- Home, Tools List, and Tool Detail pages`n- Basic routing system`n- Sample tool (Canva toolset)"
    
    git commit -m $commitMessage
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Commit created" -ForegroundColor Green
    } else {
        Write-Host "Warning: Issue creating commit, may be no file changes" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Setting branch name to main..." -ForegroundColor Yellow
    git branch -M main
    Write-Host "Branch set" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
    Write-Host "Note: If prompted for credentials, use Personal Access Token instead of password" -ForegroundColor Yellow
    Write-Host ""
    
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host "  Successfully uploaded to GitHub!" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Repository URL: https://github.com/chenweiliang0820/Marshmallow" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "Push failed. Possible reasons:" -ForegroundColor Yellow
        Write-Host "  1. Authentication required (use Personal Access Token)" -ForegroundColor Yellow
        Write-Host "  2. Repository permission issue" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Please refer to GIT_SETUP.md for detailed instructions" -ForegroundColor Yellow
    }
} else {
    Write-Host "Operation cancelled" -ForegroundColor Yellow
}

Write-Host ""