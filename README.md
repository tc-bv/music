# 音乐搜索器

## 说明

多站合一音乐搜索解决方案，由[麦葱](https://github.com/maicong/music/releases)开发，彩虹后期优化和修复，[tc-bv](https://github.com/tc-bv/music)优化并重构前端 UI 与网易云双音质解析，支持搜索试听以下网站音乐：

[网易云音乐](http://music.163.com) [QQ音乐](http://y.qq.com) [酷狗音乐](http://www.kugou.com) [酷我音乐](http://www.kuwo.cn) [虾米音乐](http://www.xiami.com) [百度音乐](http://music.baidu.com) [一听音乐](http://www.1ting.com) [咪咕音乐](http://music.migu.cn) [荔枝FM](http://www.lizhi.fm) [蜻蜓FM](http://www.qingting.fm) [喜马拉雅FM](http://www.ximalaya.com) [5sing原创](http://5sing.kugou.com/yc) [5sing翻唱](http://5sing.kugou.com/fc)

数据调用的是各网站的 API 接口，有的接口并不是开放的，随时可能失效，本项目相关代码仅供参考。

## 演示

[http://music.cccyun.cc/](http://www.musictool.top/ "音乐搜索器")

如果获取有误或需要改进，欢迎提交 [Issues](https://github.com/tc-bv/music/issues)

## 🌟 核心特性与架构升级

### 1. 网易云双音质并发解析

已彻底重构网易云模块。支持无 Cookie 并发解析免费歌曲的 **128k 标准音质**与 **320k 极高音质**。前端 UI 已针对网易云进行专属适配，支持双链接同时展示与下载；其他平台自动隐藏 320k 并自动将单链接拉满全宽。

### 2. 必须依赖本地 API 服务

由于网易云官方旧版接口彻底失效，且加密协议已多次升级，网易云模块（`core/site/netease.php`）现已接入 `NeteaseCloudMusicApi` 作为数据源。

请在本地或服务器安装 [Node.js](https://nodejs.org/)，并在运行 PHP 之前，在命令行中执行以下命令启动本地 API 服务（保持窗口不关闭）：

```bash
npx NeteaseCloudMusicApi@latest
```

### 3. 前端 UI 重构

- **三行完美布局**：音乐地址独占一行，128k 与 320k 完美并排，互不干扰。
- **原生气泡提示**：全面接入 AmazeUI `data-am-popover`，鼠标悬停即显示黑底白字提示。
- **一键复制功能**：歌曲 ID、名称、歌手等输入框后置原生 Clipboard API 复制按钮，点按即刻复制。
- **并发极速请求**：网易云模块底层已使用 `curl_multi` 并发请求技术，彻底解决搜索等待时间过长的问题。

## 解决方案

**1. 提示数据获取失败**

方案1：

```
修改 index.php 文件里的 MC_PROXY 为您的代理地址
将 core/music.php 里需要代理的 URL 'proxy' => false 改为 'proxy' => true
```

方案2：

```
在 core/music.php 里查找 setTimeout，将其后面的数值 20 改为更大。
在 static/js/music.js 里查找 `timeout`，将其数值 30000 改为更大。
```

方案3：

```
服务器要支持 curl。
更换服务器，选择延迟更低的服务器。
```

**2. 播放器显示 `Error happens ╥﹏╥`**

音乐链接为空

```
1. 音乐需要付费才能收听
2. 版权限制，外站无法获取
3. 服务器 IP 所在地不在源站允许的区域
4. 音乐下架了，链接被去除
5. [网易云] 本地 NeteaseCloudMusicApi 服务未启动或崩溃
```

音乐链接不为空

```
1. 当前 IP 所在地因版权限制而无法播放
2. 音乐格式浏览器无法正常解析
```

**3. 网易云 320k 音频获取说明**

目前项目已**默认开启**网易云 320k 解析（非 VIP 免费歌曲）。如需获取受版权保护的 VIP 歌曲 320k 音质，需在 `core/site/netease.php` 中填入您个人的 `MUSIC_U` Cookie。

## 更新日志

请查看 [CHANGELOG.md](CHANGELOG.md)

## 免责声明

1. 本站音频文件来自各网站接口，本站不会修改任何音频文件
2. 音频版权来自各网站，本站只提供数据查询服务，不提供任何音频存储和贩卖服务
3. 本项目仅供编程学习与技术交流，请勿用于商业用途，请支持正版音乐。

## 开源协议

The MIT License (MIT)
