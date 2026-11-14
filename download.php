<?php
error_reporting(0);
ini_set('display_errors', 0);

$url = isset($_GET['url']) ? $_GET['url'] : '';
$filename = isset($_GET['filename']) ? $_GET['filename'] : 'music.mp3';

if (empty($url) || strpos($url, 'http') !== 0) {
    die('URL is invalid');
}

$headers = [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept: */*',
    'Referer: https://music.163.com/',
    'Origin: https://music.163.com',
];

// 1. 先用 HEAD 请求独立拿真实文件大小
$fileSize = 0;
$ch_head = curl_init($url);
curl_setopt($ch_head, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch_head, CURLOPT_NOBODY, true);
curl_setopt($ch_head, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch_head, CURLOPT_MAXREDIRS, 5);
curl_setopt($ch_head, CURLOPT_TIMEOUT, 10);
curl_setopt($ch_head, CURLOPT_SSL_VERIFYPEER, false);
curl_exec($ch_head);
$fileSize = curl_getinfo($ch_head, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
if ($fileSize <= 0) {
    $fileSize = curl_getinfo($ch_head, CURLINFO_SIZE_DOWNLOAD);
}
curl_close($ch_head);

// 2. 发送响应头
header('Content-Description: File Transfer');
header('Content-Type: audio/mpeg');
header('Content-Disposition: attachment; filename="' . preg_replace('/[\r\n"]/', '', $filename) . '"; filename*=UTF-8\'\'' . rawurlencode($filename));
header('Content-Transfer-Encoding: binary');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');

// 3. 【最重要】如果有大小，告诉浏览器；如果没有，给个 10MB 的假大小骗过浏览器，让它显示进度
if ($fileSize > 0) {
    header('Content-Length: ' . $fileSize);
} else {
    header('Content-Length: 10485760'); // 兜底 10MB
}

// 4. 真正下载内容的 GET 请求（用全新句柄，避免被 HEAD 污染）
$ch_get = curl_init($url);
curl_setopt($ch_get, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch_get, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch_get, CURLOPT_MAXREDIRS, 5);
curl_setopt($ch_get, CURLOPT_TIMEOUT, 60);
curl_setopt($ch_get, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch_get, CURLOPT_RETURNTRANSFER, false);

// 流式输出
curl_setopt($ch_get, CURLOPT_WRITEFUNCTION, function($ch, $data) {
    echo $data;
    if (ob_get_level() > 0) ob_flush();
    flush();
    return strlen($data);
});

curl_exec($ch_get);
curl_close($ch_get);