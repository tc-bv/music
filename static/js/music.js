'use strict';

$(function() {
  function q(key) {
    var value = null;
    var tmp = [];
    location.search.substr(1).split('&').forEach(function(v) {
      tmp = v.split('=');
      if (tmp[0] === key) value = decodeURIComponent(tmp[1]);
    });
    return value;
  }

  function pushState(title, link) {
    if (window.history && window.history.pushState) window.history.pushState(null, title, link);
  }

  function getUrl(path) {
    var url = location.href.split('?')[0];
    return path ? url + path : url;
  }

  function showToast(msg) {
      var $toast = $('#j-toast');
      $toast.text(msg).fadeIn(200);
      clearTimeout(window.toastTimer);
      window.toastTimer = setTimeout(function() { $toast.fadeOut(200); }, 2000);
  }

  // ================== 全局设置 ==================
  var settings = {
      isPersist: localStorage.getItem('mc_persist_list') === 'true',
      use320ForTranscode: localStorage.getItem('mc_use_320_transcode') === 'true',
      autoplay: localStorage.getItem('mc_autoplay') !== 'false',
      pageSize: parseInt(localStorage.getItem('mc_page_size')) || 10,
      nameFormat: localStorage.getItem('mc_name_format') || '{title}',
      fmt: localStorage.getItem('mc_trans_fmt') || 'opus',
      sr: localStorage.getItem('mc_trans_sr') || '48000',
      br: localStorage.getItem('mc_trans_br') || '128',
      ch: localStorage.getItem('mc_trans_ch') || '2',
      depth: localStorage.getItem('mc_trans_depth') || 's16le'
  };

  function updateFormatUI() {
      // 修改：加入 'mp3' 判断
      if (settings.fmt === 'opus' || settings.fmt === 'mp3') {
          $('#j-format-depth-wrap').hide();
          $('#j-transcode-br').prop('disabled', false).attr('placeholder', '码率 (kbps)').show();
      } else {
          $('#j-format-depth-wrap').show();
          $('#j-transcode-br').prop('disabled', true).attr('placeholder', '无损无需码率').hide();
      }
  }

  // 初始化 UI
  $('#j-persist-toggle').prop('checked', settings.isPersist);
  $('#j-use-320-toggle').prop('checked', settings.use320ForTranscode);
  $('#j-autoplay-toggle').prop('checked', settings.autoplay);
  $('#j-page-size').val(settings.pageSize);
  $('#j-name-format').val(settings.nameFormat);
  $('#j-transcode-fmt').val(settings.fmt);
  $('#j-transcode-sr').val(settings.sr);
  $('#j-transcode-br').val(settings.br);
  $('#j-transcode-ch').val(settings.ch);
  $('#j-transcode-depth').val(settings.depth);
  updateFormatUI();

  // 【新增】：注册 Mediabunny 的 MP3 编码器
  if (typeof MediabunnyMp3Encoder !== 'undefined') {
      MediabunnyMp3Encoder.registerMp3Encoder();
  }

  // 绑定设置事件
  $('#j-transcode-fmt').on('change', function() {
      settings.fmt = $(this).val();
      localStorage.setItem('mc_trans_fmt', settings.fmt);
      updateFormatUI();
  });
  $('#j-transcode-sr').on('input change', function() { settings.sr = $(this).val(); localStorage.setItem('mc_trans_sr', settings.sr); });
  $('#j-transcode-br').on('input change', function() { settings.br = $(this).val(); localStorage.setItem('mc_trans_br', settings.br); });
  $('#j-transcode-ch').on('change', function() { settings.ch = $(this).val(); localStorage.setItem('mc_trans_ch', settings.ch); });
  $('#j-transcode-depth').on('change', function() { settings.depth = $(this).val(); localStorage.setItem('mc_trans_depth', settings.depth); });

  var player = null;
  var playerList = [];
  var nopic = 'static/img/nopic.jpg';
  var qName = q('name'), qId = q('id'), qUrl = q('url'), qType = q('type');
  var siteTitle = document.title;

  // ================== 下载列表管理 ==================
  var downloadList = [];
  if (settings.isPersist) {
      downloadList = JSON.parse(localStorage.getItem('mc_download_list') || '[]');
  }
  updateDownloadUI();

  function saveListToLocal() {
      if (settings.isPersist) {
          localStorage.setItem('mc_download_list', JSON.stringify(downloadList));
      }
  }

  function updateDownloadUI() {
      var count = downloadList.length;
      if (count > 0) $('#j-fab-badge').text(count).show(); else $('#j-fab-badge').hide();
      
      var $ul = $('#j-download-list-ul');
      if (count === 0) {
          $ul.html('<li style="color:#999;text-align:center;padding:20px 0;">暂无任务</li>');
          $('#j-download-all-128, #j-download-all-320, #j-transcode-all').hide();
          return;
      }
      $('#j-download-all-128, #j-transcode-all').show();
      
      var html = '';
      downloadList.forEach(function(item, idx) {
          var isNetease = item.type === 'netease' && item.url_320;
          html += '<li>' +
                      '<div class="info"><b>' + item.title + '</b> - ' + item.author + 
                          (isNetease ? ' <span style="color:#0e90d2;font-size:12px;">[有320k]</span>' : '') + '</div>' +
                      '<div class="actions">' +
                          '<a href="javascript:;" class="dl-128" data-idx="' + idx + '">128k</a>' +
                          (isNetease ? '<a href="javascript:;" class="dl-320" data-idx="' + idx + '">320k</a>' : '') +
                          '<a href="javascript:;" class="dl-del" data-idx="' + idx + '" style="color:#999;"><i class="am-icon-times"></i></a>' +
                      '</div></li>';
      });
      $ul.html(html);
      
      if (downloadList.some(function(i){ return i.type === 'netease' && i.url_320; })) $('#j-download-all-320').show();
      else $('#j-download-all-320').hide();
  }

  function generateFileName(item, suffix) {
      var str = $('#j-name-format').val() || settings.nameFormat;
      var fname = str.replace(/{title}/g, item.title)
                     .replace(/{author}/g, item.author)
                     .replace(/{songid}/g, item.songid)
                     .replace(/{quality}/g, suffix || '')
                     .replace(/{random}/g, Math.floor(Math.random() * 2147483647));
      return fname.replace(/[\\/:*?"<>|]/g, '') || item.title;
  }

  function getProxyDownloadUrl(url, filename) {
      if(!url || url.indexOf('data:audio') === 0) return '';
      return getUrl('download.php') + '?url=' + encodeURIComponent(url) + '&filename=' + encodeURIComponent(filename);
  }

  // ================== 核心底层：下载与编解码 ==================
  function fetchBlob(url, onProgress) {
      return new Promise(function(resolve, reject) {
          var proxyUrl = getProxyDownloadUrl(url, 'temp');
          var xhr = new XMLHttpRequest();
          xhr.open('GET', proxyUrl, true);
          xhr.responseType = 'blob';
          xhr.timeout = 20000;

          xhr.onprogress = function(e) {
              if (onProgress) {
                  var mb = (e.loaded / 1024 / 1024).toFixed(1);
                  if (e.lengthComputable) {
                      var percent = (e.loaded / e.total) * 100;
                      onProgress(percent, mb + 'MB / ' + (e.total/1024/1024).toFixed(1) + 'MB');
                  } else {
                      onProgress(Math.min(99, mb * 10), mb + 'MB ...');
                  }
              }
          };
          xhr.onload = function() { this.status === 200 ? resolve(this.response) : reject(new Error('下载失败')); };
          xhr.onerror = function() { reject(new Error('网络错误')); };
          xhr.ontimeout = function() { reject(new Error('链接超时')); };
          xhr.send();
      });
  }

  function saveBlobAsFile(blob, filename) {
      var blobUrl = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
  }

  async function decodeAudioToPCM(blob) {
      var arrayBuffer = await blob.arrayBuffer();
      var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      audioCtx.close();
      return audioBuffer;
  }

  function encodeWAV(audioBuffer, sampleRate, channels, depth, onProgress) {
      var numChannels = Math.min(channels, audioBuffer.numberOfChannels);
      var length = audioBuffer.length;
      var bytesPerSample = 2; 
      if (depth === 's24le') bytesPerSample = 3;
      if (depth === 's32le' || depth === 'f32le') bytesPerSample = 4;
      if (depth === 'u8') bytesPerSample = 1;

      var dataSize = length * numChannels * bytesPerSample;
      var buffer = new ArrayBuffer(44 + dataSize);
      var view = new DataView(buffer);

      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + dataSize, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      
      var formatCode = (depth === 'f32le') ? 3 : 1; 
      view.setUint16(20, formatCode, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
      view.setUint16(32, numChannels * bytesPerSample, true);
      view.setUint16(34, bytesPerSample * 8, true);
      writeString(view, 36, 'data');
      view.setUint32(40, dataSize, true);

      var offset = 44;
      var channelData = [];
      for (var i = 0; i < numChannels; i++) channelData.push(audioBuffer.getChannelData(i));

      for (var i = 0; i < length; i++) {
          for (var c = 0; c < numChannels; c++) {
              var sample = channelData[c][i];
              if (depth === 's16le') {
                  sample = Math.max(-1, Math.min(1, sample));
                  view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                  offset += 2;
              } else if (depth === 's24le') {
                  sample = Math.max(-1, Math.min(1, sample));
                  var s24 = Math.floor(sample < 0 ? sample * 0x800000 : sample * 0x7FFFFF);
                  view.setUint8(offset, s24 & 0xFF);
                  view.setUint8(offset + 1, (s24 >> 8) & 0xFF);
                  view.setUint8(offset + 2, (s24 >> 16) & 0xFF);
                  offset += 3;
              } else if (depth === 's32le') {
                  sample = Math.max(-1, Math.min(1, sample));
                  view.setInt32(offset, sample < 0 ? sample * 0x80000000 : sample * 0x7FFFFFFF, true);
                  offset += 4;
              } else if (depth === 'f32le') {
                  view.setFloat32(offset, sample, true);
                  offset += 4;
              } else if (depth === 'u8') {
                  sample = Math.max(-1, Math.min(1, sample));
                  view.setUint8(offset, (sample + 1) * 127.5);
                  offset += 1;
              }
          }
          if (onProgress && i % 4096 === 0) onProgress((i / length) * 100);
      }
      return new Blob([buffer], { type: 'audio/wav' });
  }

  function writeString(view, offset, string) {
      for (var i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
      }
  }

// ==========================================
// 辅助函数：将 AudioBuffer 转为 WAV Blob (供 Mediabunny 读取)
// ==========================================
function audioBufferToWavBlob(audioBuffer, sampleRate, numChannels, bitDepth) {
    var length = audioBuffer.length;
    var bytesPerSample = bitDepth / 8;
    var dataSize = length * numChannels * bytesPerSample;
    var buffer = new ArrayBuffer(44 + dataSize);
    var view = new DataView(buffer);

    function writeString(view, offset, string) {
        for (var i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    var offset = 44;
    var channelData = [];
    for (var c = 0; c < numChannels; c++) channelData.push(audioBuffer.getChannelData(c));

    var maxVal = (1 << (bitDepth - 1)) - 1;
    var negMaxVal = (1 << (bitDepth - 1));

    for (var i = 0; i < length; i++) {
        for (var c = 0; c < numChannels; c++) {
            var sample = Math.max(-1, Math.min(1, channelData[c][i]));
            var intSample = Math.floor(sample < 0 ? sample * negMaxVal : sample * maxVal);

            if (bitDepth === 16) {
                view.setInt16(offset, intSample, true);
                offset += 2;
            } else if (bitDepth === 24) {
                view.setUint8(offset, intSample & 0xFF);
                view.setUint8(offset + 1, (intSample >> 8) & 0xFF);
                view.setUint8(offset + 2, (intSample >> 16) & 0xFF);
                offset += 3;
            }
        }
    }
    return new Blob([buffer], { type: 'audio/wav' });
}

// ==========================================
// 核心函数：使用 Mediabunny 进行 FLAC 编码
// ==========================================
async function encodeFLAC(audioBuffer, sampleRate, channels, depth, onProgress) {
    if (typeof Mediabunny === 'undefined') {
        throw new Error('Mediabunny 未加载');
    }

    // 检查 FLAC 扩展包是否加载
    if (typeof MediabunnyFlacEncoder === 'undefined') {
        throw new Error('FLAC 编码器扩展包 (@mediabunny/flac-encoder) 未加载！请检查 HTML 中是否引入了本地文件。');
    }

    // 注册 FLAC 编码器（如果尚未注册）
    MediabunnyFlacEncoder.registerFlacEncoder();

    var numChannels = Math.min(channels, audioBuffer.numberOfChannels);
    var bitDepth = (depth === 's24le') ? 24 : 16;

    // 1. 将 AudioBuffer 转换为 WAV Blob
    var wavBlob = audioBufferToWavBlob(audioBuffer, sampleRate, numChannels, bitDepth);

    // 2. 初始化 Mediabunny 转换流程
    var { Input, Output, Conversion, BlobSource, ALL_FORMATS, FlacOutputFormat, BufferTarget } = Mediabunny;

    var input = new Input({ source: new BlobSource(wavBlob), formats: ALL_FORMATS });
    var output = new Output({
        format: new FlacOutputFormat(),
        target: new BufferTarget()
    });

    var conversion = await Conversion.init({
        input,
        output,
        audio: {
            codec: 'flac',
            sampleRate: sampleRate,
            numberOfChannels: numChannels,
            bitDepth: bitDepth
        }
    });

    if (!conversion.isValid) {
        throw new Error('当前环境不支持该配置的 FLAC 编码');
    }

    // 真实的编码进度回调
    conversion.onProgress = function(progress) {
        if (onProgress) onProgress(progress * 100);
    };

    // 执行编码
    await conversion.execute();

    return new Blob([output.target.buffer], { type: 'audio/flac' });
}

  async function transcodeToOpus(sourceUrl, sampleRate, bitrate, channels, onPull, onTrans) {
      var sourceBlob = await fetchBlob(sourceUrl, onPull);
      if (onTrans) onTrans(0, '初始化编码器...');

      const { Input, Output, Conversion, ALL_FORMATS, BlobSource, OggOutputFormat, BufferTarget } = window.Mediabunny;
      const input = new Input({ source: new BlobSource(sourceBlob), formats: ALL_FORMATS });
      const output = new Output({ format: new OggOutputFormat(), target: new BufferTarget() });
      
      var audioConfig = { codec: 'opus', sampleRate: sampleRate, numberOfChannels: parseInt(channels, 10) || 2 };
      if (bitrate > 0) {
          audioConfig.bitrate = bitrate * 1000;
          audioConfig.bitrateMode = 'constant';
      } else {
          audioConfig.bitrateMode = 'variable';
      }

      const conversion = await Conversion.init({ input, output, audio: audioConfig });
      if (!conversion.isValid) throw new Error('不支持 Opus');

      conversion.onProgress = function(progress) {
          if (onTrans) onTrans(Math.floor(progress * 100), '转码中 ' + (progress * 100).toFixed(1) + '%');
      };
      await conversion.execute();

      return new Blob([output.target.buffer], { type: 'audio/ogg' });
  }

  // 【新增】：使用 Mediabunny 进行 MP3 (CBR) 编码
  async function transcodeToMp3(sourceUrl, sampleRate, bitrate, channels, onPull, onTrans) {
      var sourceBlob = await fetchBlob(sourceUrl, onPull);
      if (onTrans) onTrans(0, '初始化 MP3 编码器...');

      const { Input, Output, Conversion, ALL_FORMATS, BlobSource, Mp3OutputFormat, BufferTarget } = window.Mediabunny;
      const input = new Input({ source: new BlobSource(sourceBlob), formats: ALL_FORMATS });
      const output = new Output({ format: new Mp3OutputFormat(), target: new BufferTarget() });
      
      var audioConfig = { 
          codec: 'mp3', 
          sampleRate: sampleRate, 
          numberOfChannels: parseInt(channels, 10) || 2,
          bitrate: (parseInt(bitrate, 10) || 128) * 1000 // MP3 CBR
      };

      const conversion = await Conversion.init({ input, output, audio: audioConfig });
      if (!conversion.isValid) throw new Error('不支持 MP3');

      conversion.onProgress = function(progress) {
          if (onTrans) onTrans(Math.floor(progress * 100), '转码中 ' + (progress * 100).toFixed(1) + '%');
      };
      await conversion.execute();

      return new Blob([output.target.buffer], { type: 'audio/mpeg' });
  }

  async function processSingle(item, baseName, progressCallbacks) {
      var sourceUrl = (settings.use320ForTranscode && item.url_320) ? item.url_320 : item.url;
      var ext = settings.fmt;
      var finalBlob = null;
      
      // 【核心修复】：强制把配置里的字符串转成纯数字，防止底层报错
      var sampleRate = parseInt(settings.sr, 10) || 48000;
      var bitrate = parseInt(settings.br, 10) || 0;
      var channels = parseInt(settings.ch, 10) || 2;
      
      if (ext === 'opus') {
          finalBlob = await transcodeToOpus(sourceUrl, sampleRate, bitrate, channels, progressCallbacks.onPull, progressCallbacks.onTrans);
      } else if (ext === 'mp3') { // 【新增】：MP3 分支
          finalBlob = await transcodeToMp3(sourceUrl, sampleRate, bitrate, channels, progressCallbacks.onPull, progressCallbacks.onTrans);
      } else {
          var rawBlob = await fetchBlob(sourceUrl, progressCallbacks.onPull);
          progressCallbacks.onTrans(0, '正在解码 PCM...');
          var audioBuffer = await decodeAudioToPCM(rawBlob);
          
          if (ext === 'wav') {
              finalBlob = encodeWAV(audioBuffer, sampleRate, channels, settings.depth, function(p) {
                  progressCallbacks.onTrans(p, '编码 WAV 中 ' + Math.floor(p) + '%');
              });
          } else if (ext === 'flac') {
              finalBlob = await encodeFLAC(audioBuffer, sampleRate, channels, settings.depth, function(p) {
                  progressCallbacks.onTrans(p, '编码 FLAC 中 ' + Math.floor(p) + '%');
              });
          }
      }
      saveBlobAsFile(finalBlob, baseName + '.' + ext);
  }
  function getFresh320Url(item) {
      return new Promise(function(resolve, reject) {
          if(!item.songid) return reject('缺少歌曲 ID');
          $.ajax({
              type: 'POST', url: getUrl(), timeout: 10000,
              data: { input: item.songid, filter: 'id', type: item.type || 'netease' },
              dataType: 'json',
              success: function(res) {
                  if (res.code === 200 && res.data && res.data.length > 0 && res.data[0].url_320) {
                      resolve(res.data[0].url_320);
                  } else {
                      reject('暂无 320k 版权');
                  }
              },
              error: function() { reject('获取 320k 失败'); }
          });
      });
  }

  // ================== 弹窗控制 ==================
  function openModal(id) { $('#j-modal-overlay').addClass('show'); $(id).addClass('show'); }
  function closeModals() { $('#j-modal-overlay').removeClass('show'); $('.custom-modal').removeClass('show'); }
  $('#j-fab').on('click', function() { openModal('#j-download-panel'); });
  $('#j-settings-fab').on('click', function() { openModal('#j-settings-panel'); });
  $('#j-panel-close, #j-settings-close').on('click', closeModals);
  $('#j-modal-overlay').on('click', closeModals);

  $('#j-name-format').on('input change', function() { settings.nameFormat = $(this).val(); localStorage.setItem('mc_name_format', settings.nameFormat); });
  $('#j-persist-toggle').on('change', function() {
      settings.isPersist = $(this).prop('checked'); localStorage.setItem('mc_persist_list', settings.isPersist);
      if (settings.isPersist) { localStorage.setItem('mc_download_list', JSON.stringify(downloadList)); showToast('已开启持久化'); }
      else { localStorage.removeItem('mc_download_list'); showToast('已关闭持久化'); }
  });
  $('#j-use-320-toggle').on('change', function() { settings.use320ForTranscode = $(this).prop('checked'); localStorage.setItem('mc_use_320_transcode', settings.use320ForTranscode); });
  $('#j-autoplay-toggle').on('change', function() { settings.autoplay = $(this).prop('checked'); localStorage.setItem('mc_autoplay', settings.autoplay); });
  $('#j-page-size').on('input change', function() { settings.pageSize = parseInt($(this).val(), 10) || 10; localStorage.setItem('mc_page_size', settings.pageSize); });

  // ================== 主页单曲转码 ==================
  $('#j-transcode-btn').on('click', function() {
      var currentData = playerList[player.playIndex];
      if (!currentData || !currentData.url) return showToast('请先解析并播放该歌曲');

      // 【修改】：后缀生成逻辑增加 MP3
      var suffix = (settings.fmt === 'opus' || settings.fmt === 'mp3') ? ((settings.br == 0) ? 'VBR' : settings.br + 'k') : settings.sr + 'Hz_' + settings.depth;
      var baseName = generateFileName(currentData, suffix);
      
      var $btn = $(this).prop('disabled', true);
      $('#j-single-progress').show();
      $('#j-pull-bar').val(0); $('#j-pull-text').html('准备拉取源文件...'); $('#j-pull-percent').text('0%');
      $('#j-trans-bar').val(0); $('#j-trans-text').html('等待处理...'); $('#j-trans-percent').text('0%');

      processSingle(currentData, baseName, {
          onPull: function(percent, text) {
              $('#j-pull-bar').val(percent); $('#j-pull-text').html('拉取: ' + text); $('#j-pull-percent').text(Math.floor(percent) + '%');
          },
          onTrans: function(percent, text) {
              $('#j-trans-bar').val(percent); $('#j-trans-text').html(text); $('#j-trans-percent').text(Math.floor(percent) + '%');
          }
      }).then(function() {
          showToast('导出成功！');
          setTimeout(function() { $('#j-single-progress').fadeOut(); $btn.prop('disabled', false); }, 1500);
      }).catch(function(err) {
          showToast('失败: ' + err.message);
          $('#j-single-progress').fadeOut(); $btn.prop('disabled', false);
      });
  });

  $('#j-add-to-list').on('click', function() {
      var data = playerList[player.playIndex];
      if(!data || !data.url) return showToast('请先解析并播放该歌曲');
      if (downloadList.some(function(i){ return i.songid === data.songid; })) return showToast('已在列表中');
      downloadList.push({ songid: data.songid, title: data.title, author: data.author, type: data.type, url: data.url, url_320: data.url_320 || '', lrc: data.lrc });
      updateDownloadUI(); saveListToLocal(); showToast('已加入下载列表！');
  });

  $(document).on('click', '.dl-del', function() {
      downloadList.splice($(this).data('idx'), 1); updateDownloadUI(); saveListToLocal();
  });

  $(document).on('click', '.dl-128', function() {
      var item = downloadList[$(this).data('idx')];
      var filename = generateFileName(item, '128');
      $('#j-download-progress').show().text('下载中...');
      fetchBlob(item.url, function(p, txt) { $('#j-download-progress').text('下载中 ' + Math.floor(p) + '% (' + txt + ')'); })
      .then(function(blob) { saveBlobAsFile(blob, filename + '.mp3'); $('#j-download-progress').text('完成！'); setTimeout(function(){ $('#j-download-progress').fadeOut(); }, 1500); })
      .catch(function(err){ showToast(err.message); $('#j-download-progress').fadeOut(); });
  });

  $(document).on('click', '.dl-320', function() {
      var item = downloadList[$(this).data('idx')];
      $('#j-download-progress').show().text('获取最新 320k 链接...');
      getFresh320Url(item).then(function(url) {
          $('#j-download-progress').text('下载中...');
          return fetchBlob(url, function(p, txt) { $('#j-download-progress').text('下载中 ' + Math.floor(p) + '% (' + txt + ')'); })
          .then(function(blob) { saveBlobAsFile(blob, generateFileName(item, '320') + '.mp3'); $('#j-download-progress').text('完成！'); setTimeout(function(){ $('#j-download-progress').fadeOut(); }, 1500); });
      }).catch(function(err){ showToast(err); $('#j-download-progress').fadeOut(); });
  });

  // ================== 批量转码 ==================
  $('#j-transcode-all').on('click', function() {
      if (downloadList.length === 0) return;
      var total = downloadList.length; var current = 0;
      var $progress = $('#j-download-progress'); var $btn = $(this);

      $btn.prop('disabled', true).text('处理队列执行中...');
      $progress.show().text('准备中...');

      function processNext() {
          if (current >= total) {
              $progress.text('全部处理完成！');
              setTimeout(function() { $progress.fadeOut(); }, 2000);
              $btn.prop('disabled', false).html('<i class="am-icon-cogs"></i> 批量转码列表中所有');
              return;
          }

          var item = downloadList[current];
          // 【修改】：批量后缀逻辑增加 MP3
          var suffix = (settings.fmt === 'opus' || settings.fmt === 'mp3') ? ((settings.br == 0) ? 'VBR' : settings.br + 'k') : settings.sr + 'Hz_' + settings.depth;
          var filename = generateFileName(item, suffix);
          $progress.text('[' + (current + 1) + '/' + total + '] 准备处理: ' + item.title);

          processSingle(item, filename, {
              onPull: function(p, txt) { $progress.text('[' + (current + 1) + '/' + total + '] ' + txt); },
              onTrans: function(p, txt) { $progress.text('[' + (current + 1) + '/' + total + '] ' + txt); }
          }).then(function() { current++; processNext(); })
          .catch(function(err) { console.error(item.title, err); current++; processNext(); });
      }
      processNext();
  });

  // ================== 批量直接下载 ==================
  function batchDownload(type) {
      if (downloadList.length === 0) return;
      var total = downloadList.length; var current = 0;
      var $progress = $('#j-download-progress');
      var $btn128 = $('#j-download-all-128'); var $btn320 = $('#j-download-all-320');

      $btn128.prop('disabled', true); $btn320.prop('disabled', true);
      $progress.show().text('准备批量下载 ' + type + 'k...');

      function processNext() {
          if (current >= total) {
              $progress.text('批量下载完成！');
              setTimeout(function() { $progress.fadeOut(); }, 2000);
              $btn128.prop('disabled', false); $btn320.prop('disabled', false);
              return;
          }

          var item = downloadList[current];
          var baseName = generateFileName(item, type);
          $progress.text('[' + (current + 1) + '/' + total + '] 正在下载: ' + item.title);

          var doDownload = function(url) {
              return fetchBlob(url, function(p, txt) {
                  $progress.text('[' + (current + 1) + '/' + total + '] ' + Math.floor(p) + '% (' + txt + ')');
              }).then(function(blob) { saveBlobAsFile(blob, baseName + '.mp3'); });
          };

          if (type === '320') {
              getFresh320Url(item).then(function(url) { return doDownload(url); })
              .then(function() { current++; processNext(); })
              .catch(function() { current++; processNext(); });
          } else {
              doDownload(item.url).then(function() { current++; processNext(); });
          }
      }
      processNext();
  }

  $('#j-download-all-128').on('click', function() { batchDownload('128'); });
  $('#j-download-all-320').on('click', function() { batchDownload('320'); });

  // ================== 清理列表 ==================
  var clearPending = false; var clearTimer = null;
  $('#j-clear-list').on('click', function() {
      if (!clearPending) {
          clearPending = true; showToast('再次点击确认清空列表');
          $(this).text('确定清空？').removeClass('am-btn-default').addClass('am-btn-danger');
          clearTimer = setTimeout(function() {
              clearPending = false; $('#j-clear-list').html('<i class="am-icon-trash"></i> 清空列表').removeClass('am-btn-danger').addClass('am-btn-default');
          }, 3000);
      } else {
          clearTimeout(clearTimer); clearPending = false; downloadList = [];
          updateDownloadUI(); saveListToLocal(); showToast('列表已清空');
          $(this).html('<i class="am-icon-trash"></i> 清空列表').removeClass('am-btn-danger').addClass('am-btn-default');
      }
  });

  // ================== 搜索与播放逻辑 (完全保留) ==================
  if ((qName || qId) && qType) {
    setTimeout(function() {
      $('#j-input').val(qName || qId); $('#j-type input[value="' + qType + '"]').prop('checked', true);
      if (qName) $('#j-nav [data-filter="name"]').trigger('click');
      if (qId) $('#j-nav [data-filter="id"]').trigger('click');
      $('#j-validator').trigger('submit');
    }, 0);
  }
  if (qUrl) {
    setTimeout(function() {
      $('#j-type').hide(); $('#j-input').val(qUrl); $('#j-nav [data-filter="url"]').trigger('click'); $('#j-validator').trigger('submit');
    }, 0);
  }

  $('#j-nav').on('click', 'li', function() {
    var holder = {
      name: '例如: 不要说话 陈奕迅', id: '例如: 25906124', url: '例如: http://music.163.com/#/song?id=25906124',
      pattern_name: '^.+$', pattern_id: '^[\\w\\/\\|]+$', pattern_url: '^https?:\\/\\/\\S+$'
    };
    var filter = $(this).data('filter');
    $(this).addClass('am-active').siblings('li').removeClass('am-active');
    $('#j-input').data('filter', filter).attr({ placeholder: holder[filter], pattern: holder['pattern_' + filter] })
      .removeClass('am-field-valid am-field-error am-active').closest('.am-form-group')
      .removeClass('am-form-success am-form-error').find('.am-alert').hide();
    if (filter === 'url') $('#j-type').hide(); else $('#j-type').show();
  });

  $('#j-validator').validator({
    onValid: function onValid(v) { $(v.field).closest('.am-form-group').find('.am-alert').hide(); },
    onInValid: function onInValid(v) {
      var $field = $(v.field); var $group = $field.closest('.am-form-group');
      var msgs = { name: '将 名称 和 作者 一起输入可提高匹配度', id: '输入错误，请查看下面的帮助', url: '输入错误，请查看下面的帮助' };
      var $alert = $group.find('.am-alert'); var msg = msgs[$field.data('filter')] || this.getValidationMessage(v);
      if (!$alert.length) $alert = $('<div class="am-alert am-alert-danger am-animation-shake"></div>').hide().appendTo($group);
      $alert.html(msg).show();
    },
    submit: function submit(v) {
      v.preventDefault();
      if (this.isFormValid()) {
        var input = $.trim($('#j-input').val()); var filter = $('#j-input').data('filter');
        var type = filter === 'url' ? '_' : $('input[name="music_type"]:checked').val(); var page = 1;
        var $more = $('<div class="aplayer-more">载入更多</div>'); var isload = false;
        
        var ajax = function ajax(input, filter, type, page) {
          $.ajax({
            type: 'POST', url: getUrl(), timeout: 30000,
            data: { input: input, filter: filter, type: type, page: page, limit: settings.pageSize }, dataType: 'json',
            beforeSend: function beforeSend() {
              isload = true; var title = document.title;
              switch (filter) {
                case 'name': pushState(title, getUrl('?name=' + input + '&type=' + type)); break;
                case 'id': pushState(title, getUrl('?id=' + input + '&type=' + type)); break;
                case 'url': pushState(title, getUrl('?url=' + encodeURIComponent(input))); break;
              }
              if (page === 1) { $('#j-input').attr('disabled', true); $('#j-submit').button('loading'); }
              else { $more.text('请稍后...'); }
            },
            success: function success(result) {
              if (result.code === 200 && result.data) {
                result.data.map(function(v) {
                  if (!v.title) v.title = '暂无'; if (!v.author) v.author = '暂无';
                  if (!v.pic) v.pic = nopic; if (!v.lrc) v.lrc = '[00:00.00] 暂无歌词';
                  if (!/\[00:(\d{2})\./.test(v.lrc)) v.lrc = '[00:00.00] 无效歌词';
                });
                
                var setValue = function setValue(data) {
                  var $srcRow = $('#j-src').closest('.am-g'); var $wrapper320 = $('#j-src320-wrapper');
                  if ($srcRow.length > 0) $srcRow.prepend($wrapper320);

                  $('#j-link').val(data.link); $('#j-link-btn').attr('href', data.link);
                  $('#j-src').val(data.url); $('#j-src320').val(data.url_320 || '');
                  var $wrapper128 = $('#j-src').closest('.am-u-lg-6, .am-u-lg-12');

                  if (data.type === 'netease' && data.url_320) {
                    $wrapper320.show().removeClass('am-u-lg-12').addClass('am-u-lg-6'); $wrapper128.removeClass('am-u-lg-12').addClass('am-u-lg-6');
                  } else {
                    $wrapper320.hide(); $wrapper128.removeClass('am-u-lg-6').addClass('am-u-lg-12');
                  }

                  $('#j-lrc').val(data.lrc); $('#j-lrc-btn').attr('href', 'data:application/octet-stream;base64,' + btoa(unescape(encodeURIComponent(data.lrc))));
                  $('#j-lrc-btn-icon').attr('class', 'am-icon-download');
                  $('#j-songid').val(data.songid); $('#j-name').val(data.title); $('#j-author').val(data.author);

                  var dlName128 = generateFileName(data, '128'); var dlName320 = generateFileName(data, '320');

                  $('#j-src-btn').off('click').on('click', function(e) {
                      e.preventDefault(); if(!data.url) return showToast('暂无 128k 链接');
                      $('#j-progress-128').val(0).show();
                      fetchBlob(data.url, function(percent) {
                          $('#j-progress-128').val(percent);
                      }).then(function(blob) {
                          saveBlobAsFile(blob, dlName128 + '.mp3');
                          setTimeout(function() { $('#j-progress-128').fadeOut(); }, 1000);
                      }).catch(function() { $('#j-progress-128').fadeOut(); });
                  });

                  if ($('#j-src320-btn').length) {
                      $('#j-src320-btn').off('click').on('click', function(e) {
                          e.preventDefault(); if(!data.url_320) return showToast('暂无 320k 链接');
                          $('#j-progress-320').val(0).show();
                          fetchBlob(data.url_320, function(percent) {
                              $('#j-progress-320').val(percent);
                          }).then(function(blob) {
                              saveBlobAsFile(blob, dlName320 + '.mp3');
                              setTimeout(function() { $('#j-progress-320').fadeOut(); }, 1000);
                          }).catch(function() { $('#j-progress-320').fadeOut(); });
                      });
                  }
                  $('#j-lrc-btn').attr('download', data.title + '-' + data.author + '.lrc');
                };

                if (page === 1) {
                  if (player) player.pause();
                  playerList = result.data; setValue(playerList[0]);
                  $('#j-validator').slideUp(); $('#j-main').slideDown();

                  player = new APlayer({
                    element: $('#j-player')[0], autoplay: settings.autoplay, narrow: false, showlrc: 1, mutex: false, mode: 'circulation', preload: 'metadata', theme: '#0e90d2', music: result.data
                  });
                  $('#j-player').append($more);
                  $more.on('click', function() { if (isload) return; page++; ajax(input, filter, type, page); });
                } else {
                  player.addMusic(result.data); playerList = playerList.concat(result.data);
                }

                player.on('play', function() {
                  var data = playerList[player.playIndex]; if(!data.url) return;
                  var img = new Image(); img.src = data.pic; img.onerror = function() { $('.aplayer-pic').css('background-image', 'url(' + nopic + ')'); };
                  document.title = '正在播放: ' + data.title + ' - ' + data.author; setValue(data);
                });
                player.on('ended', function() { document.title = siteTitle; });

                if (result.data.length < settings.pageSize) $more.hide(); else $more.text('载入更多').show();
              } else {
                if (page === 1) { $('#j-input').closest('.am-form-group').find('.am-alert').html(result.error || '(°ー°〃) 服务器好像罢工了').show(); }
                else { $more.text('没有了'); setTimeout(function() { $more.slideUp(); }, 1000); }
              }
            },
            error: function error(e, t) {
              if (page === 1) {
                var err = '(°ー°〃) 出了点小问题，请重试'; if (t === 'timeout') err = '(°ー°〃) 请求超时了，请稍后重试';
                $('#j-input').closest('.am-form-group').find('.am-alert').html(err).show();
              } else { $more.text('(°ー°〃) 加载失败了，点击重试'); }
            },
            complete: function complete() {
              isload = false; if (page === 1) { $('#j-input').attr('disabled', false); $('#j-submit').button('reset'); }
            }
          });
        };
        ajax(input, filter, type, page);
      }
    }
  });

  $('#j-main input').focus(function() { $(this).select(); });
  $('#j-more').on('click', function() { $(this).hide(); $('#j-quote').removeClass('music-overflow'); });
  $('#j-back').on('click', function() {
    if (player) player.pause();
    $('#j-validator').slideDown(); $('#j-main').slideUp(); $('#j-main input').val('');
    document.title = siteTitle; pushState(siteTitle, getUrl());
  });
});