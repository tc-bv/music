<?php
error_reporting(0);
ini_set('display_errors', 0);

$url = isset($_GET['url']) ? $_GET['url'] : '';
$filename = isset($_GET['filename']) ? $_GET['filename'] : 'music.mp3';

if (empty($url) || strpos($url, 'http') !== 0) {
    die('URL is invalid');
}

// 1. 设置下载响应头（直接发给浏览器）
header('Content-Description: File Transfer');
header('Content-Type: audio/mpeg');
// 解决空格变 + 和中文乱码的终极写法
header('Content-Disposition: attachment; filename="' . preg_replace('/[\r\n"]/', '', $filename) . '"; filename*=UTF-8\'\'' . rawurlencode($filename));
header('Content-Transfer-Encoding: binary');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');

$ch = curl_init($url);

$headers = [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept: */*',
    'Referer: https://music.163.com/',
    'Origin: https://music.163.com',
];

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_MAXREDIRS, 5); 
curl_setopt($ch, CURLOPT_TIMEOUT, 60);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

// 【核心】关闭输出缓冲，直接流向浏览器
curl_setopt($ch, CURLOPT_RETURNTRANSFER, false); 

// 【核心】这里是流式输出的魔法：每当 cURL 收到一块数据，直接 echo 给浏览器
curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($ch, $data) {
    echo $data;
    // 强制刷新 PHP 和 Web 服务器的缓冲区，确保数据立刻传送
    ob_flush();
    flush();
    return strlen($data);
});

curl_exec($ch);
curl_close($ch);