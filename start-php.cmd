@echo off
chcp 65001

echo 正在启动 NeteaseCloudMusicApi (端口 3000)...
start "NeteaseCloudMusicApi" cmd /c "npx @neteasecloudmusicapienhanced/api@4.41.1"
echo 正在启动 PHP 本地服务器 (端口 53819)...
%~dp0\php\php.exe -S 0.0.0.0:53819
