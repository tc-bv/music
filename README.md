# 音乐搜索器

## 说明

多站合一音乐搜索解决方案。本项目基于 [麦葱](https://github.com/maicong/music/releases) 的原版进行二次开发与维护。

支持搜索试听以下网站音乐：

[网易云音乐](http://music.163.com) [QQ音乐](http://y.qq.com) [酷狗音乐](http://www.kugou.com) [酷我音乐](http://www.kuwo.cn) [百度音乐](http://music.baidu.com) [一听音乐](http://www.1ting.com) [咪咕音乐](http://music.migu.cn) [荔枝FM](http://www.lizhi.fm) [蜻蜓FM](http://www.qingting.fm) [喜马拉雅FM](http://www.ximalaya.com) [5sing原创](http://5sing.kugou.com/yc) [5sing翻唱](http://5sing.kugou.com/fc)

数据调用的是各网站的非官方 API 接口，随时可能失效，本项目代码仅供学习参考。

## 演示

[http://music.cccyun.cc/](http://www.musictool.top/ "音乐搜索器")

如果获取有误或需要改进，欢迎提交 [Issues](https://github.com/tc-bv/music/issues)

## 运行依赖

由于网易云官方旧版接口变动，网易云模块（`core/site/netease.php`）目前接入了 `NeteaseCloudMusicApi` 作为数据源。

请在运行 PHP 服务前，安装 [Node.js](https://nodejs.org/)，并在命令行中启动本地 API 服务（保持窗口不关闭）：

```bash
npx NeteaseCloudMusicApi@latest
```

## 功能说明

### 1. 音质解析

重构了网易云模块，支持并发解析免费歌曲的 128k 标准音质与 320k 极高音质。前端针对该模块进行了布局适配，支持双链接同时展示；其他平台则自动隐藏 320k 链接并自适应全宽。

如需获取受版权保护的 VIP 歌曲 320k 音质，需在 `core/site/netease.php` 中填入个人的 `MUSIC_U` Cookie。

支持转码/批量转码可配置的Opus格式导出。

### 2. 前端 UI

- 调整了音乐地址与双音质链接的排列布局。
- 接入了 AmazeUI `data-am-popover` 属性，添加了鼠标悬停提示。
- 在歌曲 ID、名称、歌手等输入框后增加了基于 Clipboard API 的复制按钮。
- 底部增加了下载列表管理面板，支持批量下载、实时进度显示以及自定义命名格式（支持 `{title}`、`{author}`、`{quality}`、`{random}` 等变量）。
- 批量下载采用串行队列与动态链接获取，避免浏览器多文件拦截和接口风控。
- 新增了 `download.php` 作为流式下载代理，处理部分外部音频链接的防盗链与时效性问题。
- 在下载歌曲时使用进度条显示反馈实时进度。

### 3. 性能优化

网易云模块底层使用了 `curl_multi` 并发请求技术，以提高数据拉取速度。

## 常见问题

**1. 提示数据获取失败**

- 修改 `index.php` 文件里的 `MC_PROXY` 为您的代理地址，并将 `core/music.php` 里需要代理的 URL `'proxy' => false` 改为 `'proxy' => true`。
- 在 `core/music.php` 里查找 `setTimeout`，将其后面的数值 `20` 改大；在 `static/js/music.js` 里查找 `timeout`，将其数值 `30000` 改大。
- 确保服务器支持 `curl`，或更换延迟更低的服务器。

**2. 播放器显示 `Error happens ╥﹏╥`**

*音乐链接为空*

1. 音乐需要付费才能收听
2. 版权限制，外站无法获取
3. 服务器 IP 所在地不在源站允许的区域
4. 音乐下架了，链接被去除
5. [网易云] 本地 NeteaseCloudMusicApi 服务未启动或崩溃

*音乐链接不为空*

1. 当前 IP 所在地因版权限制而无法播放
2. 音乐格式浏览器无法正常解析

**3. 下载功能报错或无法保存**

- 检查浏览器是否拦截了“多文件下载”的弹窗。
- 确认 `download.php` 与主程序在同一目录，且 PHP 环境支持 `curl` 扩展。

## 更新日志

请查看 [CHANGELOG.md](CHANGELOG.md)

## 免责声明

1. 本站音频文件来自各网站接口，本站不会修改任何音频文件。
2. 音频版权来自各网站，本站只提供数据查询服务，不提供任何音频存储和贩卖服务。
3. 本项目仅供编程学习与技术交流，请勿用于商业用途，请支持正版音乐。

## 开源协议

The MIT License (MIT)
