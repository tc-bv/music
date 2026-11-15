@echo off
:: 强制以 UTF-8 编码显示，防止中文乱码
chcp 65001 >nul
title [Setup] Music Searcher Environment / 音乐搜索器环境配置

:: ==================================================
:: 1. 检查管理员权限并自动提权
:: Check Admin Privileges & Auto-Elevate
:: ==================================================
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ==================================================
    echo [Prompt / 提示] Administrator privileges are required.
    echo Administrator privileges are required to configure the firewall.
    echo 配置防火墙需要管理员权限。
    echo Requesting elevation, please click "Yes" in the UAC window...
    echo 正在尝试提权，请在弹出的 UAC 窗口中点击“是”...
    echo ==================================================
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ==================================================
echo    Starting environment configuration...
echo    开始配置环境与防火墙规则...
echo ==================================================

:: 获取当前脚本所在目录并去除末尾斜杠
set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"

set "PHP_EXE=%BASE_DIR%\php\php.exe"
set "NODE_DIR=%BASE_DIR%\Node.js"
set "NODE_EXE=%NODE_DIR%\node.exe"
set "NPX_CMD=%NODE_DIR%\npx.cmd"

:: ==================================================
:: 2. 配置防火墙：放行 53819 和 3000 端口
:: Configure Firewall: Allow Port 53819 and 3000
:: ==================================================
echo [1/5] Configuring Ports 53819 & 3000... / 正在配置端口 53819 与 3000...
netsh advfirewall firewall delete rule name="MusicSearcher_53819" >nul 2>&1
netsh advfirewall firewall add rule name="MusicSearcher_53819" dir=in action=allow protocol=TCP localport=53819 profile=any
if %errorLevel% equ 0 (
    echo     [OK] Port 53819 is open on Private and Public networks.
    echo     √ 端口 53819 已在专用和公用网络放行
) else (
    echo     [FAIL] Failed to open port 53819.
    echo     × 端口 53819 放行失败
)

netsh advfirewall firewall delete rule name="MusicSearcher_3000" >nul 2>&1
netsh advfirewall firewall add rule name="MusicSearcher_3000" dir=in action=allow protocol=TCP localport=3000 profile=any
if %errorLevel% equ 0 (
    echo     [OK] Port 3000 is open on Private and Public networks.
    echo     √ 端口 3000 已在专用和公用网络放行
) else (
    echo     [FAIL] Failed to open port 3000.
    echo     × 端口 3000 放行失败
)

:: ==================================================
:: 3. 配置防火墙：放行 php.exe
:: Configure Firewall: Allow php.exe
:: ==================================================
echo.
echo [2/5] Allowing PHP executable... / 正在放行 PHP 程序...
if exist "%PHP_EXE%" (
    netsh advfirewall firewall delete rule name="MusicSearcher_PHP" >nul 2>&1
    netsh advfirewall firewall add rule name="MusicSearcher_PHP" dir=in action=allow program="%PHP_EXE%" enable=yes profile=any
    netsh advfirewall firewall add rule name="MusicSearcher_PHP" dir=out action=allow program="%PHP_EXE%" enable=yes profile=any
    if %errorLevel% equ 0 (
        echo     [OK] PHP allowed. / √ PHP 程序已放行
    ) else (
        echo     [FAIL] Failed to allow PHP. / × PHP 程序放行失败
    )
) else (
    echo     [ERROR] PHP not found at: %PHP_EXE%
    echo     × 未找到 PHP 文件，请检查路径。
)

:: ==================================================
:: 4. 配置防火墙：放行 node.exe (访问专用与公用网络)
:: Configure Firewall: Allow node.exe (Private and Public)
:: ==================================================
echo.
echo [3/5] Allowing Node.js executable... / 正在放行 Node.js 程序...
if exist "%NODE_EXE%" (
    netsh advfirewall firewall delete rule name="MusicSearcher_Node" >nul 2>&1
    netsh advfirewall firewall add rule name="MusicSearcher_Node" dir=in action=allow program="%NODE_EXE%" enable=yes profile=any
    netsh advfirewall firewall add rule name="MusicSearcher_Node" dir=out action=allow program="%NODE_EXE%" enable=yes profile=any
    if %errorLevel% equ 0 (
        echo     [OK] Node.js allowed on Private and Public networks. / √ Node.js 程序已放行（专用和公用网络）
    ) else (
        echo     [FAIL] Failed to allow Node.js. / × Node.js 程序放行失败
    )
) else (
    echo     [ERROR] Node.js not found at: %NODE_EXE%
    echo     × 未找到 Node.js 文件，请检查路径。
)

:: ==================================================
:: 5. 执行 Npx 下载依赖
:: Execute Npx to download dependencies
:: ==================================================
echo.
echo [4/5] Downloading API dependencies... / 正在下载 API 依赖...
if exist "%NPX_CMD%" (
    echo     [INFO] Found portable npx: %NPX_CMD%
    echo     √ 找到便携版 npx
    echo     [INFO] Executing npx (this might take a few minutes)...
    echo     正在执行 npx 下载 (首次运行可能需要几分钟)...
    
    cd /d "%NODE_DIR%"
    
    :: 静默执行一次，触发下载缓存
    call "%NPX_CMD%" -y NeteaseCloudMusicApi@4.33.0 --help >nul 2>&1
    
    if %errorLevel% equ 0 (
        echo     [OK] NeteaseCloudMusicApi downloaded successfully.
        echo     √ NeteaseCloudMusicApi 下载完毕，已存入便携版缓存。
    ) else (
        echo     [FAIL] Npx download failed. Please check your network.
        echo     × Npx 下载失败，可能是网络问题。请检查代理或网络连接。
    )
) else (
    echo     [ERROR] npx.cmd not found at: %NPX_CMD%
    echo     × 未找到便携版 npx.cmd，请检查路径。
)

echo.
echo ==================================================
echo    Configuration Complete! / 配置全部完成！
echo    You can now start the server and visit:
echo    你现在可以启动服务并访问:
echo    http://127.0.0.1:53819
echo ==================================================
echo [5/5] Done. / 环境配置已完成。
pause