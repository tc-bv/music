<?php

namespace site;

class netease
{
    private static $apiBase = 'http://localhost:3000';
    private static $cookie = 'os=pc;';

    public static function search($query, $page)
    {
        if (empty($query)) return;

        $url = self::$apiBase . '/search?keywords=' . urlencode($query)
             . '&limit=10&offset=' . ($page * 10 - 10)
             . '&type=1';

        $result = self::curl_get($url);
        $data = json_decode($result, true);

        if (empty($data['result']['songs'])) {
            return;
        }

        $songs = [];
        $songIds = [];
        $albumIds = [];

        foreach ($data['result']['songs'] as $index => $value) {
            $songId = $value['id'];
            $songIds[] = $songId;
            
            if (isset($value['al']['id'])) $albumIds[$songId] = $value['al']['id'];
            elseif (isset($value['album']['id'])) $albumIds[$songId] = $value['album']['id'];

            $songs[$index] = $value;
            $songs[$index]['_songId'] = $songId;
        }

        $urls = [];
        foreach ($songIds as $id) {
            // 同时请求 128k 外链和 320k API 直链
            $urls["url_128_$id"] = 'https://music.163.com/song/media/outer/url?id=' . $id . '.mp3';
            $urls["url_320_$id"] = self::$apiBase . '/song/url/v1?id=' . $id . '&level=exhigh';
            $urls["lrc_$id"] = self::$apiBase . '/lyric?id=' . $id;
        }
        
        foreach ($albumIds as $sid => $aid) {
            $val = $songs[array_search($sid, array_column($songs, '_songId'))];
            if (empty($val['al']['picUrl']) && empty($val['album']['picUrl'])) {
                $urls["pic_$sid"] = self::$apiBase . '/album?id=' . $aid;
            }
        }

        $responses = self::curl_multi_get($urls);

        $returnSongs = [];
        foreach ($songs as $value) {
            $songId = $value['_songId'];
            
            $authors = [];
            $ar_list = isset($value['ar']) ? $value['ar'] : (isset($value['artists']) ? $value['artists'] : []);
            foreach ($ar_list as $val) {
                $authors[] = $val['name'];
            }
            $author = implode(',', $authors);

            $pic = '';
            if (isset($value['al']['picUrl'])) {
                $pic = $value['al']['picUrl'];
            } elseif (isset($value['album']['picUrl'])) {
                $pic = $value['album']['picUrl'];
            } elseif (isset($responses["pic_$songId"])) {
                $albumData = json_decode($responses["pic_$songId"], true);
                if (!empty($albumData['album']['picUrl'])) {
                    $pic = $albumData['album']['picUrl'];
                }
            }
            if ($pic) {
                $pic = str_replace('http://', 'https://', $pic) . '?param=300x300';
            }

            $lrc = '';
            if (isset($responses["lrc_$songId"])) {
                $lrcData = json_decode($responses["lrc_$songId"], true);
                if (isset($lrcData['lrc']['lyric'])) {
                    $lrc = $lrcData['lrc']['lyric'];
                }
            }

            // 默认播放链接使用 128k
            $playUrl = $urls["url_128_$songId"];
            $playUrl320 = '';

            // 如果 320k 解析成功，则提取出来
            if (isset($responses["url_320_$songId"])) {
                $urlData = json_decode($responses["url_320_$songId"], true);
                if (!empty($urlData['data'][0]['url'])) {
                    $playUrl320 = $urlData['data'][0]['url'];
                }
            }

            $returnSongs[] = [
                'type'    => 'netease',
                'link'    => 'https://music.163.com/#/song?id=' . $songId,
                'songid'  => $songId,
                'title'   => $value['name'],
                'author'  => $author,
                'lrc'     => $lrc,
                'url'     => $playUrl,
                'url_320' => $playUrl320, // 新增字段
                'pic'     => $pic,
                'name'    => $value['name'],
                'artists' => $ar_list,
                'album'   => [
                    'picUrl' => $pic,
                    'name'   => isset($value['al']['name']) ? $value['al']['name'] : (isset($value['album']['name']) ? $value['album']['name'] : '')
                ]
            ];
        }
        return $returnSongs;
    }

    public static function getSong($songid, $multi = false)
    {
        if (empty($songid)) return;
        if ($multi) {
            if (!is_array($songid)) return;
            $songid = implode(',', $songid);
        }

        $detailUrl = self::$apiBase . '/song/detail?ids=' . $songid;
        $detailResult = self::curl_get($detailUrl);
        $detailData = json_decode($detailResult, true);

        if (empty($detailData['songs'])) return;

        $songs = [];
        $ids = explode(',', $songid);
        $urls = [];
        
        foreach ($ids as $id) {
            $urls["url_128_$id"] = 'https://music.163.com/song/media/outer/url?id=' . $id . '.mp3';
            $urls["url_320_$id"] = self::$apiBase . '/song/url/v1?id=' . $id . '&level=exhigh';
            $urls["lrc_$id"] = self::$apiBase . '/lyric?id=' . $id;
        }

        $responses = self::curl_multi_get($urls);

        foreach ($detailData['songs'] as $value) {
            $songId = $value['id'];
            
            $authors = [];
            $ar_list = isset($value['ar']) ? $value['ar'] : (isset($value['artists']) ? $value['artists'] : []);
            foreach ($ar_list as $val) {
                $authors[] = $val['name'];
            }
            $author = implode(',', $authors);

            $pic = '';
            if (isset($value['al']['picUrl'])) {
                $pic = $value['al']['picUrl'];
            } elseif (isset($value['album']['picUrl'])) {
                $pic = $value['album']['picUrl'];
            } elseif (isset($value['al']['id']) || isset($value['album']['id'])) {
                $albumId = isset($value['al']['id']) ? $value['al']['id'] : $value['album']['id'];
                $pic = self::getCoverByAlbumId($albumId);
            }
            if ($pic) {
                $pic = str_replace('http://', 'https://', $pic) . '?param=300x300';
            }

            $lrc = '';
            if (isset($responses["lrc_$songId"])) {
                $lrcData = json_decode($responses["lrc_$songId"], true);
                if (isset($lrcData['lrc']['lyric'])) {
                    $lrc = $lrcData['lrc']['lyric'];
                }
            }

            $playUrl = $urls["url_128_$songId"];
            $playUrl320 = '';

            if (isset($responses["url_320_$songId"])) {
                $urlData = json_decode($responses["url_320_$songId"], true);
                if (!empty($urlData['data'][0]['url'])) {
                    $playUrl320 = $urlData['data'][0]['url'];
                }
            }

            $songs[] = [
                'type'    => 'netease',
                'link'    => 'https://music.163.com/#/song?id=' . $songId,
                'songid'  => $songId,
                'title'   => $value['name'],
                'author'  => $author,
                'lrc'     => $lrc,
                'url'     => $playUrl,
                'url_320' => $playUrl320,
                'pic'     => $pic,
                'name'    => $value['name'],
                'artists' => $ar_list,
                'album'   => [
                    'picUrl' => $pic,
                    'name'   => isset($value['al']['name']) ? $value['al']['name'] : (isset($value['album']['name']) ? $value['album']['name'] : '')
                ]
            ];
        }
        return $songs;
    }

    private static function getCoverByAlbumId($albumId)
    {
        if (!$albumId) return '';
        $url = self::$apiBase . '/album?id=' . $albumId;
        $result = self::curl_get($url);
        $data = json_decode($result, true);
        if (!empty($data['album']['picUrl'])) {
            return $data['album']['picUrl'];
        }
        return '';
    }

    private static function curl_get($url)
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ]);
        if (!empty(self::$cookie)) {
            curl_setopt($ch, CURLOPT_COOKIE, self::$cookie);
        }
        $result = curl_exec($ch);
        curl_close($ch);
        return $result;
    }

    private static function curl_multi_get($urls)
    {
        if (empty($urls)) return [];
        
        $mh = curl_multi_init();
        $chs = [];
        
        foreach ($urls as $key => $url) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ]);
            if (!empty(self::$cookie)) {
                curl_setopt($ch, CURLOPT_COOKIE, self::$cookie);
            }
            curl_multi_add_handle($mh, $ch);
            $chs[$key] = $ch;
        }
        
        $running = null;
        do {
            curl_multi_exec($mh, $running);
            curl_multi_select($mh);
        } while ($running > 0);
        
        $responses = [];
        foreach ($chs as $key => $ch) {
            $responses[$key] = curl_multi_getcontent($ch);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
        }
        
        curl_multi_close($mh);
        return $responses;
    }
}