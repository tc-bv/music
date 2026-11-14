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
    <meta name="keywords" content="音乐搜索,音乐搜索器,音乐试听,音乐在线听,网易云音乐,QQ音乐,酷狗音乐,酷我音乐,虾米音乐,百度音乐,一听音乐,咪咕音乐,荔枝FM,蜻蜓FM,喜马拉雅FM,全民K歌,5sing原创翻唱音乐">
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

        /* 悬浮下载面板样式 */
        .download-panel {
            position: fixed;
            bottom: 0;
            right: 20px;
            width: 400px;
            background: #fff;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
            border-radius: 8px 8px 0 0;
            z-index: 9999;
            transform: translateY(100%);
            transition: transform 0.3s ease;
            display: flex;
            flex-direction: column;
            max-height: 600px;
        }
        .download-panel.show {
            transform: translateY(0);
        }
        .download-panel-header {
            padding: 10px 15px;
            background: #0e90d2;
            color: #fff;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
            cursor: pointer;
        }
        .download-panel-body {
            padding: 15px;
            overflow-y: auto;
            flex: 1;
        }
        .download-panel-footer {
            padding: 10px 15px;
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
            padding: 8px 0;
            border-bottom: 1px dashed #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
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
            margin-left: 10px;
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
            z-index: 9998;
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

                    <div class="am-margin-bottom-lg" style="text-align: right;">
                        <button type="button" class="am-btn am-btn-warning am-btn-sm am-radius" id="j-add-to-list">
                            <i class="am-icon-plus"></i> 将此歌曲添加到下载列表
                        </button>
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

    <!-- 下载管理面板 -->
    <div class="download-panel" id="j-download-panel">
        <div class="download-panel-header" id="j-panel-toggle">
            <span><i class="am-icon-list"></i> 下载列表管理</span>
            <i class="am-icon-chevron-down"></i>
        </div>
        <div class="download-panel-body">
            <!-- 列表 -->
            <ul class="download-list" id="j-download-list-ul"></ul>
        </div>
        <div class="download-panel-footer">
            <button class="am-btn am-btn-success am-btn-sm am-btn-block" id="j-download-all-128"><i class="am-icon-download"></i> 下载列表中所有 128k</button>
            <button class="am-btn am-btn-danger am-btn-sm am-btn-block" id="j-download-all-320" style="margin-top: 5px; display:none;"><i class="am-icon-download"></i> 下载列表中所有 320k</button>
            <button class="am-btn am-btn-default am-btn-sm am-btn-block" id="j-clear-list" style="margin-top: 5px;"><i class="am-icon-trash"></i> 清空列表</button>
            
            <!-- 新增：任务进度显示区 -->
            <div id="j-download-progress" style="display: none; margin-top: 10px; text-align: center; color: #0e90d2; font-weight: bold; font-size: 13px;">
                准备中...
            </div>

            <!-- 命名格式设置 -->
            <div class="am-form-group am-form-sm" style="margin-top: 10px; margin-bottom: 5px;">
                <label>自定义命名格式：</label>
                <input type="text" id="j-name-format" class="am-form-field" value="{title}" placeholder="可用变量: {title}, {author}, {songid}, {quality}, {random}">
            </div>

            <!-- 新增：持久化存储开关 -->
            <div style="margin-bottom: 10px;">
                <label style="cursor: pointer; font-size: 13px; font-weight: normal;">
                    <input type="checkbox" id="j-persist-toggle" style="vertical-align: middle; margin-right: 5px;"> 
                    持久化存储下载列表（刷新不丢失）
                </label>
            </div>

            <!-- 帮助折叠面板 -->
            <details style="margin-top: 10px; font-size: 12px; color: #888; border-top: 1px dashed #eee; padding-top: 10px;">
                <summary style="cursor: pointer; font-weight: bold; color: #333;">帮助与说明</summary>
                <div style="margin-top: 8px;">
                    <b>支持变量：</b><br>
                    {title} - 歌名<br>
                    {author} - 歌手<br>
                    {songid} - 歌曲ID<br>
                    {quality} - 音质 (128/320)<br>
                    {random} - 随机数
                </div>
                <div style="margin-top: 8px;">
                    <b>注意事项：</b><br>
                    1. 修改命名格式后，在此页面直接点击下载即可生效。<br>
                    2. 如果下载没有自动保存，请检查浏览器是否拦截了“多个文件下载”的弹窗。<br>
                    3. 默认不带音质后缀，如果需要区分请加入 <code>{quality}</code> 变量。
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
    <script src="static/js/music.js?v<?php echo MC_VERSION; ?>"></script>
</body>
</html>