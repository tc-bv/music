<?php
error_reporting(0);
ini_set('display_errors', 0);

$url = isset($_GET['url']) ? $_GET['url'] : '';
$filename = isset($_GET['filename']) ? $_GET['filename'] : 'music.mp3';

if (empty($url) || strpos($url, 'http') !== 0) {
    http_response_code(400);
    die('URL is invalid');
}

$headers = [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept: */*',
    'Accept-Encoding: identity', // 重点：禁止gzip，否则长度不准！
    'Connection: keep-alive',
    'Referer: https://music.163.com/',
];

$isImage = (strpos($filename, 'cover') !== false || preg_match('/\.(jpg|jpeg|png|gif)/i', $url));
if ($isImage) {
    header('Content-Type: image/jpeg');
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $data = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($httpCode == 200 && $data) {
        echo $data;
    } else {
        if (file_exists('static/img/nopic.jpg')) readfile('static/img/nopic.jpg');
    }
    exit;
}

// ========= 音频代理，支持 Range 分片、进度条 =========
$range = $_SERVER['HTTP_RANGE'] ?? '';
if ($range) {
    $headers[] = "Range: $range";
}

// 先只发HEAD请求，拿文件大小、校验是否支持分片
$chHead = curl_init($url);
curl_setopt_array($chHead, [
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_NOBODY => true, // HEAD请求，只拿头
    CURLOPT_RETURNTRANSFER => true,
]);
curl_exec($chHead);
$totalLen = curl_getinfo($chHead, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
$supportRange = curl_getinfo($chHead, CURLINFO_HTTP_CODE) === 206 || strpos(curl_getinfo($chHead, CURLINFO_CONTENT_TYPE), 'audio') !== false;
curl_close($chHead);

// 清理缓冲区
while (ob_get_level() > 0) ob_end_clean();

if ($range && $totalLen > 0) {
    // 解析 Range: bytes=start-
    preg_match('/bytes=(\d+)-(\d*)/', $range, $m);
    $start = (int)$m[1];
    $end = !empty($m[2]) ? (int)$m[2] : $totalLen - 1;
    $sendLen = $end - $start + 1;

    http_response_code(206);
    header("Content-Range: bytes $start-$end/$totalLen");
    header("Content-Length: $sendLen");
} else {
    http_response_code(200);
    header("Content-Length: $totalLen");
}
header('Accept-Ranges: bytes'); // 告诉播放器：支持拖动分片
header('Content-Type: audio/mpeg');
header('Content-Disposition: inline; filename="' . preg_replace('/[\r\n"]/', '', $filename) . '"');
header('Cache-Control: no-cache');

// 正式拉取流输出
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 120,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_BUFFERSIZE => 128000,
    CURLOPT_WRITEFUNCTION => function ($ch, $data) {
        echo $data;
        flush();
        return strlen($data);
    }
]);
curl_exec($ch);
curl_close($ch);
