<?php
error_reporting(0);
ini_set('display_errors', 0);

$url = isset($_GET['url']) ? $_GET['url'] : '';
$filename = isset($_GET['filename']) ? $_GET['filename'] : 'music.mp3';

if (empty($url) || strpos($url, 'http') !== 0) {
    die('URL is invalid');
}

$ch = curl_init($url);
$headers = [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept: */*',
    'Referer: https://music.163.com/',
    'Origin: https://music.163.com',
];
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

// 【核心】先获取文件大小，透传给浏览器
curl_setopt($ch, CURLOPT_NOBODY, true);
curl_exec($ch);
$fileSize = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
curl_setopt($ch, CURLOPT_NOBODY, false);

header('Content-Description: File Transfer');
header('Content-Type: audio/mpeg');
header('Content-Disposition: attachment; filename="' . preg_replace('/[\r\n"]/', '', $filename) . '"; filename*=UTF-8\'\'' . rawurlencode($filename));
header('Content-Transfer-Encoding: binary');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');
if ($fileSize > 0) {
    header('Content-Length: ' . $fileSize);
}

// 开始流式输出
curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($ch, $data) {
    echo $data;
    ob_flush();
    flush();
    return strlen($data);
});

curl_exec($ch);
curl_close($ch);