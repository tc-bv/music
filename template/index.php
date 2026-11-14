<?php
/**
 *
 * 音乐搜索器 - 模版文件
 *
 * @author  MaiCong <i@maicong.me>
 * @link    https://github.com/maicong/music
 * @since   1.5.10
 *
 */

if (!defined('MC_CORE')) {
    header("Location: /");
    exit();
}
?><!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>音乐搜索器 - 多站合一音乐搜索,音乐在线试听</title>
    <meta name="renderer" content="webkit">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta http-equiv="Cache-Control" content="no-transform">
    <meta http-equiv="Cache-Control" content="no-siteapp">
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <meta name="keywords" content="音乐搜索,音乐搜索器,音乐试听,音乐在线听,网易云音乐,QQ音乐,酷狗音乐,酷我音乐,虾米音乐、百度音乐、一听音乐、咪咕音乐、荔枝FM、蜻蜓FM、喜马拉雅FM、全民K歌、5sing原创翻唱音乐">
    <meta name="description" content="麦葱特制多站合一音乐搜索解决方案，可搜索试听网易云音乐、QQ音乐、酷狗音乐、酷我音乐、虾米音乐、百度音乐、一听音乐、咪咕音乐、荔枝FM、蜻蜓FM、喜马拉雅FM、全民K歌、5sing原创翻唱音乐。">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black">
    <meta name="apple-mobile-web-app-title" content="音乐搜索器">
    <meta name="application-name" content="音乐搜索器">
    <meta name="format-detection" content="telephone=no">
    <link rel="shortcut icon" href="favicon.ico">
    <link rel="apple-touch-icon" href="static/img/apple-touch-icon.png">
    <link rel="stylesheet" href="//lib.baomitu.com/amazeui/2.3.0/css/amazeui.min.css">
    <link rel="stylesheet" href="static/css/style.css?v<?php echo MC_VERSION; ?>">
    <style>
        /* 顶部 Toast 提示 */
        .toast-msg {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10000;
            display: none;
            font-size: 14px;
        }

        /* 弹窗遮罩 */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9998;
            display: none;
            opacity: 0;
            transition: opacity 0.3s;
        }
        .modal-overlay.show {
            display: block;
            opacity: 1;
        }

        /* 居中下载面板 (75% 宽高) */
        .download-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            width: 75%;
            height: 75%;
            background: #fff;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            border-radius: 8px;
            z-index: 9999;
            display: none;
            flex-direction: column;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .download-panel.show {
            display: flex;
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        .download-panel-header {
            padding: 15px 20px;
            background: #0e90d2;
            color: #fff;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
            font-size: 16px;
        }
        .download-panel-header .close-btn {
            cursor: pointer;
            font-size: 20px;
            line-height: 1;
        }
        .download-panel-body {
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        }
        .download-panel-footer {
            padding: 15px 20px;
            border-top: 1px solid #eee;
            background: #fafafa;
            border-radius: 0 0 8px 8px;
        }
        .download-list {
            list-style: none;
            padding: 0;
            margin: 0 0 10px 0;
        }
        .download-list li {
            padding: 10px 0;
            border-bottom: 1px dashed #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
        }
        .download-list li:last-child {
            border-bottom: none;
        }
        .download-list li .info {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .download-list li .actions a {
            margin-left: 15px;
            color: #f37b1d;
            cursor: pointer;
        }
        
        /* 悬浮球 (常驻右上角) */
        .download-fab {
            position: fixed;
            top: 50px;
            right: 30px;
            width: 50px;
            height: 50px;
            background: #0e90d2;
            color: #fff;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            cursor: pointer;
            z-index: 9997;
            transition: transform 0.2s;
        }
        .download-fab:hover {
            transform: scale(1.1);
        }
        .download-fab .badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #dd514c;
            color: #fff;
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 10px;
            display: none;
        }

        /* 极简进度条原生样式优化 */
        progress {
            -webkit-appearance: none;
            appearance: none;
            border: none;
            border-radius: 3px;
            background: #eee;
        }
        progress::-webkit-progress-bar {
            background: #eee;
            border-radius: 3px;
        }
        progress::-webkit-progress-value {
            background: #0e90d2;
            border-radius: 3px;
        }

        /* 一行展示的所有操作区 */
        .action-row {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: nowrap;
        }

        /* 转码输入区 */
        .transcode-inline {
            display: flex;
            align-items: center;
            background: #fcfcfc;
            padding: 5px 12px;
            border-radius: 4px;
            border: 1px solid #ddd;
            height: 38px;
            box-sizing: border-box;
        }
        .transcode-inline span {
            font-size: 13px;
            color: #333;
            white-space: nowrap;
        }
        .transcode-inline input {
            height: 26px;
            width: 65px;
            margin: 0 5px;
            padding: 0 5px;
            border: 1px solid #ccc;
            border-radius: 3px;
            font-size: 13px;
            text-align: center;
        }

        /* 统一按钮高度 */
        .action-row .am-btn {
            height: 38px;
            line-height: 24px;
            display: flex;
            align-items: center;
            margin: 0;
            flex-shrink: 0;
        }

        details > summary {
            list-style: none;
            cursor: pointer;
            display: inline-block;
            padding: 5px 10px;
            background: #e8f4ff;
            color: #0e90d2;
            border-radius: 3px;
            font-size: 13px;
        }
        details > summary::-webkit-details-marker {
            display: none;
        }
    </style>
</head>
<body>
    <!--[if lte IE 9]>
        <script type="text/javascript">
            (function(){
                var t = '你的浏览器也太挫了吧！大佬换一个噻！';
                document.body.innerHTML = t;
                document.body.style.fontSize = '66px';
                document.body.style.textAlign = 'center';
                document.body.style.background = '#000';
                document.body.style.color = '#fff';
                if (prompt('输入代号 666666 销毁此电脑: ', '') === '666666') {
                    alert('拜拜了您呢~')
                } else {
                    alert('总感觉哪里不对');
                }
                window.open('', '_self', '');
                window.close();
            })();
        </script>
    <![endif]-->
    
    <!-- 全局提示框 -->
    <div class="toast-msg" id="j-toast"></div>

    <section class="am-g about">
        <div class="am-container am-margin-vertical-xl">
            <header class="am-padding-vertical">
                <h2 class="about-title about-color">音乐搜索器</h2>
                <p class="am-text-center">多站合一音乐搜索解决方案</p>
            </header>
            <hr>
            <div class="am-u-lg-12 am-padding-vertical">
                <form id="j-validator" class="am-form am-margin-bottom-lg" method="post">
                    <div class="am-u-md-12 am-u-sm-centered">
                        <ul id="j-nav" class="am-nav am-nav-pills am-nav-justify am-margin-bottom music-tabs">
                            <li class="am-active" data-filter="name"><a>音乐名称</a></li>
                            <li data-filter="id"><a>音乐 ID</a></li>
                            <li data-filter="url"><a>音乐地址</a></li>
                        </ul>
                        <div class="am-form-group">
                            <input id="j-input" data-filter="name" class="am-form-field am-input-lg am-text-center am-radius" placeholder="例如: 不要说话 陈奕迅" data-am-loading="{loadingText: ' '}" pattern="^.+$" required>
                            <div class="am-alert am-alert-danger am-animation-shake"></div>
                        </div>
                        <div id="j-type" class="am-form-group am-text-center music-type">
                        <?php foreach ($music_type_list as $key => $val) { ?>
                            <label class="am-radio-inline">
                                <input type="radio" name="music_type" value="<?php echo $key; ?>" data-am-ucheck<?php if ($key === 'netease') echo ' checked'; ?>>
                                <?php echo $val; ?>
                            </label>
                            <?php if ($key === 'migu') echo '<br />'; ?>
                        <?php } ?>
                        </div>
                        <button id="j-submit" type="submit" class="am-btn am-btn-primary am-btn-lg am-btn-block am-radius" data-am-loading="{spinner: 'cog', loadingText: '正在搜索相关音乐...', resetText: 'Get &#x221A;'}">Get &#x221A;</button>
                    </div>
                </form>
                
                <form id="j-main" class="am-form am-u-md-12 am-u-sm-centered music-main">
                    <a type="button" id="j-back" class="am-btn am-btn-success am-btn-lg am-btn-block am-radius am-margin-bottom-lg">成功 Get &#x221A; 返回继续 <i class="am-icon-reply am-icon-fw"></i></a>
                    
                    <div class="am-g am-margin-bottom-sm">
                        <div class="am-u-lg-12">
                            <div class="am-input-group am-input-group-sm am-margin-bottom-sm" data-am-popover="{content: '音乐地址', trigger: 'hover'}">
                                <span class="am-input-group-label"><i class="am-icon-link am-icon-fw"></i></span>
                                <input id="j-link" class="am-form-field" readonly>
                                <span class="am-input-group-btn">
                                    <a id="j-link-btn" class="am-btn am-btn-default" target="_blank"><i class="am-icon-external-link"></i></a>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="am-g am-margin-bottom-sm">
                        <!-- 320k 左 -->
                        <div class="am-u-lg-6" id="j-src320-wrapper" style="display:none;">
                            <div class="am-input-group am-input-group-sm am-margin-bottom-sm" data-am-popover="{content: '音乐链接 (320k)', trigger: 'hover'}">
                                <span class="am-input-group-label"><i class="am-icon-music am-icon-fw"></i></span>
                                <input id="j-src320" class="am-form-field" readonly>
                                <span class="am-input-group-btn">
                                    <a id="j-src320-btn" class="am-btn am-btn-default" href="javascript:;"><i id="j-src320-btn-icon" class="am-icon-download"></i></a>
                                </span>
                            </div>
                            <progress id="j-progress-320" value="0" max="100" style="width: 100%; height: 6px; display: none; margin-bottom: 10px;"></progress>
                        </div>
                        
                        <!-- 128k 右 -->
                        <div class="am-u-lg-6">
                            <div class="am-input-group am-input-group-sm am-margin-bottom-sm" data-am-popover="{content: '音乐链接 (128k)', trigger: 'hover'}">
                                <span class="am-input-group-label"><i class="am-icon-music am-icon-fw"></i></span>
                                <input id="j-src" class="am-form-field" readonly>
                                <span class="am-input-group-btn">
                                    <a id="j-src-btn" class="am-btn am-btn-default" href="javascript:;"><i id="j-src-btn-icon" class="am-icon-download"></i></a>
                                </span>
                            </div>
                            <progress id="j-progress-128" value="0" max="100" style="width: 100%; height: 6px; display: none; margin-bottom: 10px;"></progress>
                        </div>
                    </div>

                    <!-- 折叠的信息区 -->
                    <details class="am-margin-bottom-sm">
                        <summary><i class="am-icon-list"></i> 显示歌曲信息 (ID / 歌词 / 名称 / 作者)</summary>
                        <div class="am-margin-top-sm">
                            <div class="am-g">
                                <div class="am-u-lg-6">
                                    <div class="am-input-group am-input-group-sm am-margin-bottom-sm">
                                        <span class="am-input-group-label"><i class="am-icon-list-ol am-icon-fw"></i></span>
                                        <input id="j-songid" class="am-form-field" readonly>
                                        <span class="am-input-group-btn"><button class="am-btn am-btn-default j-copy-btn" data-clipboard-target="#j-songid" title="复制"><i class="am-icon-copy"></i></button></span>
                                    </div>
                                </div>
                                <div class="am-u-lg-6">
                                    <div class="am-input-group am-input-group-sm am-margin-bottom-sm">
                                        <span class="am-input-group-label"><i class="am-icon-file-text-o am-icon-fw"></i></span>
                                        <input id="j-lrc" class="am-form-field" readonly>
                                        <span class="am-input-group-btn">
                                            <a id="j-lrc-btn" class="am-btn am-btn-default" target="_blank"><i id="j-lrc-btn-icon" class="am-icon-download"></i></a>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="am-g">
                                <div class="am-u-lg-6">
                                    <div class="am-input-group am-input-group-sm am-margin-bottom-sm">
                                        <span class="am-input-group-label"><i class="am-icon-tag am-icon-fw"></i></span>
                                        <input id="j-name" class="am-form-field" readonly>
                                        <span class="am-input-group-btn"><button class="am-btn am-btn-default j-copy-btn" data-clipboard-target="#j-name" title="复制"><i class="am-icon-copy"></i></button></span>
                                    </div>
                                </div>
                                <div class="am-u-lg-6">
                                    <div class="am-input-group am-input-group-sm am-margin-bottom-sm">
                                        <span class="am-input-group-label"><i class="am-icon-user am-icon-fw"></i></span>
                                        <input id="j-author" class="am-form-field" readonly>
                                        <span class="am-input-group-btn"><button class="am-btn am-btn-default j-copy-btn" data-clipboard-target="#j-author" title="复制"><i class="am-icon-copy"></i></button></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </details>

                    <!-- 底部操作区：强制一行显示 -->
                    <div class="action-row">
                        <div class="transcode-inline">
                            <span>转码</span>
                            <input type="number" id="j-transcode-sr" value="48000" step="100" placeholder="48000">
                            <span>Hz</span>
                            <input type="number" id="j-transcode-br" value="128" step="1" placeholder="0=VBR" style="margin-left: 10px;">
                            <span>Kbps</span>
                        </div>

                        <button type="button" class="am-btn am-btn-primary am-btn-sm am-radius" id="j-transcode-btn">
                            <i class="am-icon-cogs"></i> 转码并下载
                        </button>
                        <button type="button" class="am-btn am-btn-warning am-btn-sm am-radius" id="j-add-to-list">
                            <i class="am-icon-plus"></i> 添加到下载列表
                        </button>
                    </div>
                    
                    <!-- 主页专用双进度条 -->
                    <div id="j-single-progress" style="display: none; margin-top: -10px; margin-bottom: 20px; width: 100%;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 3px;" id="j-pull-text">正在拉取源文件... <span id="j-pull-percent">0%</span></div>
                        <progress id="j-pull-bar" value="0" max="100" style="width: 100%; height: 6px; margin-bottom: 10px;"></progress>
                        
                        <div style="font-size: 12px; color: #666; margin-bottom: 3px;" id="j-trans-text">正在转码... <span id="j-trans-percent">0%</span></div>
                        <progress id="j-trans-bar" value="0" max="100" style="width: 100%; height: 6px;"></progress>
                    </div>

                    <div id="j-show" class="am-margin-vertical">
                        <div id="j-player" class="aplayer"></div>
                    </div>
                </form>

                <!-- 恢复帮助模块 -->
                <div class="am-u-md-12 am-u-sm-centered am-margin-vertical music-tips">
                    <h4>帮助：</h4>
                    <p><b>标红</b> 为 <strong>音乐 ID</strong>，<u>下划线</u> 表示 <strong>音乐地址</strong></p>
                    <ul>
                        <li>蜻蜓 FM 的音乐 ID 需要使用 <code>| (管道符)</code> 组合，例如 <code>158696|5266259</code></li>
                    </ul>
                    <blockquote id="j-quote" class="music-overflow">
                        <p><span>网易：</span><u>https://music.163.com/#/song?id=<b>25906124</b></u></p>
                        <p><span>ＱＱ：</span><u>https://y.qq.com/n/yqq/song/<b>002B2EAA3brD5b</b>.html</u></p>
                        <p><span>酷狗：</span><u>http://www.kugou.com/song/#hash=<b>08228af3cb404e8a4e7e9871bf543ff6</b></u></p>
                        <p><span>酷我：</span><u>https://www.kuwo.cn/play_detail/<b>175264544</b>/</u></p>
                        <p><span>千千：</span><u>https://music.taihe.com/song/<b>266069</b></u></p>
                        <p><span>一听：</span><u>https://www.1ting.com/player/b6/player_<b>357838</b>.html</u></p>
                        <p><span>咪咕：</span><u>https://music.migu.cn/v3/music/song/<b>477803</b></u></p>
                        <p><span>荔枝：</span><u>https://www.lizhi.fm/1947925/<b>2498707770886461446</b></u></p>
                        <p><span>蜻蜓：</span><u>https://www.qingting.fm/channels/<b>158696</b>/programs/<b>5266259</b></u></p>
                        <p><span>喜马拉雅：</span><u>https://www.ximalaya.com/51701370/sound/<b>24755731</b></u></p>
                        <p><span>5sing原创：</span><u>http://5sing.kugou.com/yc/<b>3082899</b>.html</u></p>
                        <p><span>5sing翻唱：</span><u>http://5sing.kugou.com/fc/<b>14369766</b>.html</u></p>
                        <p><span>全民K歌：</span>只支持根据ID或地址解析，不支持搜索名称</p>
                    </blockquote>
                    <div id="j-more" class="music-more">查看更多</div>
                </div>
            </div>
        </div>
    </section>
    <footer class="footer">
        <p class="am-text-sm">v<?php echo MC_VERSION; ?>&nbsp;&copy;&nbsp;<?php echo date('Y'); ?>&nbsp;<a href="javascript:void(0)" data-am-modal="{target: '#copr-info'}">免责声明</a></p>
    </footer>

    <!-- 悬浮球 (常驻右上角) -->
    <div class="download-fab" id="j-fab">
        <i class="am-icon-download am-icon-lg"></i>
        <span class="badge" id="j-fab-badge">0</span>
    </div>

    <!-- 弹窗遮罩 -->
    <div class="modal-overlay" id="j-modal-overlay"></div>

    <!-- 下载管理面板 (居中弹窗 75%宽高) -->
    <div class="download-panel" id="j-download-panel">
        <div class="download-panel-header">
            <span><i class="am-icon-list"></i> 下载列表管理</span>
            <i class="am-icon-close close-btn" id="j-panel-close"></i>
        </div>
        <div class="download-panel-body">
            <!-- 列表 -->
            <ul class="download-list" id="j-download-list-ul"></ul>
        </div>
        <div class="download-panel-footer">
            <button class="am-btn am-btn-success am-btn-sm am-btn-block" id="j-download-all-128"><i class="am-icon-download"></i> 下载列表中所有 128k</button>
            <button class="am-btn am-btn-danger am-btn-sm am-btn-block" id="j-download-all-320" style="margin-top: 5px; display:none;"><i class="am-icon-download"></i> 下载列表中所有 320k</button>
            <button class="am-btn am-btn-default am-btn-sm am-btn-block" id="j-clear-list" style="margin-top: 5px;"><i class="am-icon-trash"></i> 清空列表</button>
            
            <div id="j-download-progress" style="display: none; margin-top: 10px; text-align: center; color: #0e90d2; font-weight: bold; font-size: 14px; white-space: pre-wrap;">
                准备中...
            </div>

            <div class="am-form-group am-form-sm" style="margin-top: 15px; margin-bottom: 5px;">
                <label>自定义命名格式：</label>
                <input type="text" id="j-name-format" class="am-form-field" value="{title}" placeholder="可用变量: {title}, {author}, {songid}, {quality}, {random}">
            </div>

            <div class="am-form-group am-form-sm" style="margin-bottom: 10px;">
                <label>全局转码设置 (Opus/Ogg)：</label>
                <div style="display: flex; gap: 10px;">
                    <input type="number" id="j-global-sr" class="am-form-field" value="48000" step="100" placeholder="采样率" style="width: 50%;">
                    <input type="number" id="j-global-br" class="am-form-field" value="128" step="1" placeholder="码率 (0=VBR)" style="width: 50%;">
                </div>
                <button class="am-btn am-btn-success am-btn-sm am-btn-block" id="j-transcode-all" style="margin-top: 8px;">
                    <i class="am-icon-cogs"></i> 批量转码为 Ogg
                </button>
            </div>

            <div style="margin-bottom: 10px;">
                <label style="cursor: pointer; font-size: 13px; font-weight: normal;">
                    <input type="checkbox" id="j-persist-toggle" style="vertical-align: middle; margin-right: 5px;"> 
                    持久化存储下载列表（刷新不丢失）
                </label>
            </div>

            <!-- 帮助折叠面板 (加宽了行距) -->
            <details style="margin-top: 15px; font-size: 13px; color: #888; border-top: 1px dashed #eee; padding-top: 15px; line-height: 1.8;">
                <summary style="cursor: pointer; font-weight: bold; color: #333;">帮助与说明</summary>
                <div style="margin-top: 10px;">
                    <b>支持变量：</b><br>
                    {title} - 歌名<br>
                    {author} - 歌手<br>
                    {songid} - 歌曲ID<br>
                    {quality} - 音质 (128/320，转码时为设定的码率)<br>
                    {random} - 随机数
                </div>
                <div style="margin-top: 10px;">
                    <b>注意事项：</b><br>
                    1. 修改命名格式后，在此页面直接点击下载即可生效。<br>
                    2. 如果下载没有自动保存，请检查浏览器是否拦截了“多个文件下载”的弹窗。<br>
                    3. 默认不带音质后缀，如果需要区分请加入 <code>{quality}</code> 变量。<br>
                    4. 转码需浏览器支持 WebCodecs (建议使用 Chrome/Edge 最新版)。
                </div>
            </details>
        </div>
    </div>

    <div class="am-popup" id="copr-info">
        <div class="am-popup-inner">
            <div class="am-popup-hd">
                <h4 class="am-popup-title">免责声明</h4>
                <span data-am-modal-close class="am-close">&times;</span>
            </div>
            <div class="am-popup-bd">
                <p>本站音频文件来自各网站接口，本站不会修改任何音频文件</p>
                <p>音频版权来自各网站，本站只提供数据查询服务，不提供任何音频存储和贩卖服务</p>
            </div>
        </div>
    </div>
    
    <script src="//lib.baomitu.com/jquery/1.12.4/jquery.min.js"></script>
    <script src="//lib.baomitu.com/amazeui/2.3.0/js/amazeui.min.js"></script>
    <script src="//lib.baomitu.com/aplayer/1.6.0/APlayer.min.js"></script>
    <script src="//lib.baomitu.com/Base64/1.0.1/base64.min.js"></script>
    
    <!-- 引入 Mediabunny -->
    <script src="static/js/mediabunny.cjs"></script>
    
    <script src="static/js/music.js?v<?php echo MC_VERSION; ?>"></script>
</body>
</html>