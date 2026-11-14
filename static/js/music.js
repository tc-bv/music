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
      window.toastTimer = setTimeout(function() {
          $toast.fadeOut(200);
      }, 2000);
  }

  var player = null;
  var playerList = [];
  var nopic = 'static/img/nopic.jpg';
  var qName = q('name');
  var qId = q('id');
  var qUrl = q('url');
  var qType = q('type');
  var siteTitle = document.title;

  // ================== 全局设置状态 ==================
  var settings = {
      isPersist: localStorage.getItem('mc_persist_list') === 'true',
      use320ForTranscode: localStorage.getItem('mc_use_320_transcode') === 'true',
      autoplay: localStorage.getItem('mc_autoplay') !== 'false',
      pageSize: parseInt(localStorage.getItem('mc_page_size')) || 10,
      nameFormat: localStorage.getItem('mc_name_format') || '{title}',
      singleSr: localStorage.getItem('mc_single_sr') || '48000',
      singleBr: localStorage.getItem('mc_single_br') || '128',
      globalSr: localStorage.getItem('mc_global_sr') || '48000',
      globalBr: localStorage.getItem('mc_global_br') || '128',
      singleCh: localStorage.getItem('mc_single_ch') || '2',
      globalCh: localStorage.getItem('mc_global_ch') || '2'
  };

  // 初始化 UI 状态
  $('#j-persist-toggle').prop('checked', settings.isPersist);
  $('#j-use-320-toggle').prop('checked', settings.use320ForTranscode);
  $('#j-autoplay-toggle').prop('checked', settings.autoplay);
  $('#j-page-size').val(settings.pageSize);
  $('#j-name-format').val(settings.nameFormat);
  $('#j-transcode-sr').val(settings.singleSr);
  $('#j-transcode-br').val(settings.singleBr);
  $('#j-global-sr').val(settings.globalSr);
  $('#j-global-br').val(settings.globalBr);
  $('#j-transcode-ch').val(settings.singleCh);
  $('#j-global-ch').val(settings.globalCh);

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
      var $badge = $('#j-fab-badge');
      if (count > 0) {
          $badge.text(count).show();
      } else {
          $badge.hide();
      }
      
      var $ul = $('#j-download-list-ul');
      if (count === 0) {
          $ul.html('<li style="color:#999;text-align:center;padding:20px 0;">暂无任务</li>');
          $('#j-download-all-128, #j-download-all-320, #j-transcode-all').hide();
          return;
      }
      $('#j-download-all-128').show();

      var html = '';
      downloadList.forEach(function(item, idx) {
          var isNetease = item.type === 'netease' && item.url_320;
          html += '<li>' +
                      '<div class="info">' +
                          '<b>' + item.title + '</b> - ' + item.author + 
                          (isNetease ? ' <span style="color:#0e90d2;font-size:12px;">[有320k]</span>' : '') +
                      '</div>' +
                      '<div class="actions">' +
                          '<a href="javascript:;" class="dl-128" data-idx="' + idx + '">128k</a>' +
                          (isNetease ? '<a href="javascript:;" class="dl-320" data-idx="' + idx + '">320k</a>' : '') +
                          '<a href="javascript:;" class="dl-del" data-idx="' + idx + '" style="color:#999;"><i class="am-icon-times"></i></a>' +
                      '</div>' +
                  '</li>';
      });
      $ul.html(html);
      
      $('#j-download-all-128').show();
      $('#j-transcode-all').show();

      if (downloadList.some(function(i){ return i.type === 'netease' && i.url_320; })) {
          $('#j-download-all-320').show();
      } else {
          $('#j-download-all-320').hide();
      }
  }

  function generateFileName(item, quality) {
      var qualityStr = quality || '128';
      var randomNum = Math.floor(Math.random() * 2147483647);
      var currentFormat = $('#j-name-format').val() || settings.nameFormat;
      var fname = currentFormat.replace(/{title}/g, item.title)
                            .replace(/{author}/g, item.author)
                            .replace(/{songid}/g, item.songid)
                            .replace(/{quality}/g, qualityStr)
                            .replace(/{random}/g, randomNum);
      fname = fname.replace(/[\\/:*?"<>|]/g, '');
      return fname || item.title;
  }

  function getProxyDownloadUrl(url, filename) {
      if(!url) return '';
      if (url.indexOf('data:audio') === 0) return '';
      return getUrl('download.php') + '?url=' + encodeURIComponent(url) + '&filename=' + encodeURIComponent(filename + '.mp3');
  }

  // ================== 核心：防卡死的 Blob 下载器 ==================
  function fetchBlob(url, progressCallback) {
      return new Promise(function(resolve, reject) {
          var proxyUrl = getProxyDownloadUrl(url, 'temp');
          var xhr = new XMLHttpRequest();
          xhr.open('GET', proxyUrl, true);
          xhr.responseType = 'blob';
          xhr.timeout = 15000; // 【关键】15秒强杀，绝不卡死

          xhr.onprogress = function(e) {
              if (progressCallback) {
                  if (e.lengthComputable) {
                      progressCallback((e.loaded / e.total) * 100);
                  } else {
                      progressCallback(Math.min(99, (e.loaded / 1024 / 1024) * 10)); // 兜底假进度
                  }
              }
          };

          xhr.onload = function() {
              if (this.status === 200) {
                  resolve(this.response);
              } else {
                  reject(new Error('拉取失败: ' + this.status));
              }
          };
          xhr.onerror = function() { reject(new Error('网络错误')); };
          xhr.ontimeout = function() { reject(new Error('拉取超时，可能链接已失效')); };
          xhr.send();
      });
  }

  // 封装一个用 Blob 直接触发下载的函数
  function saveBlobAsFile(blob, filename) {
      var blobUrl = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
  }

  // ================== Mediabunny 转码核心 ==================
  async function transcodeAudio(sourceUrl, outputFilename, sampleRate, bitrateKbps, channels, callbacks) {
      var onPullProgress = callbacks && callbacks.onPullProgress;
      var onTranscodeProgress = callbacks && callbacks.onTranscodeProgress;

      if (onPullProgress) onPullProgress(0, 0, '准备拉取源文件...');
      
      var sourceBlob;
      try {
          sourceBlob = await fetchBlob(sourceUrl, function(percent) {
              if (onPullProgress) onPullProgress(percent, 0, '拉取中 ' + Math.floor(percent) + '%');
          });
      } catch (e) {
          throw new Error('拉取源文件失败: ' + e.message);
      }

      if (onPullProgress) onPullProgress(100, 0, '拉取完成，准备转码...');
      if (onTranscodeProgress) onTranscodeProgress(0, '初始化转码器...');
      
      if (!window.Mediabunny) throw new Error('Mediabunny 未加载');

      const { Input, Output, Conversion, ALL_FORMATS, BlobSource, OggOutputFormat, BufferTarget } = window.Mediabunny;

      const input = new Input({ source: new BlobSource(sourceBlob), formats: ALL_FORMATS });
      const output = new Output({ format: new OggOutputFormat(), target: new BufferTarget() });

      var audioConfig = { codec: 'opus', sampleRate: sampleRate, numberOfChannels: parseInt(channels, 10) || 2 };

      if (bitrateKbps > 0) {
          audioConfig.bitrate = bitrateKbps * 1000;
          audioConfig.bitrateMode = 'constant';
      } else {
          audioConfig.bitrateMode = 'variable';
      }

      const conversion = await Conversion.init({ input, output, audio: audioConfig });

      if (!conversion.isValid) throw new Error('浏览器不支持 Opus 编码或参数不合法');

      conversion.onProgress = function(progress) {
          if (onTranscodeProgress) onTranscodeProgress(Math.floor(progress * 100), '转码中 ' + (progress * 100).toFixed(1) + '%');
      };

      await conversion.execute();

      if (onTranscodeProgress) onTranscodeProgress(100, '转码完成，正在保存...');

      const finalBuffer = output.target.buffer;
      const finalBlob = new Blob([finalBuffer], { type: 'audio/ogg' });
      saveBlobAsFile(finalBlob, outputFilename + '.ogg');
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

  // ================== 设置项绑定 ==================
  $('#j-name-format').on('input change', function() { settings.nameFormat = $(this).val(); localStorage.setItem('mc_name_format', settings.nameFormat); });
  $('#j-persist-toggle').on('change', function() {
      settings.isPersist = $(this).prop('checked'); localStorage.setItem('mc_persist_list', settings.isPersist);
      if (settings.isPersist) { localStorage.setItem('mc_download_list', JSON.stringify(downloadList)); showToast('已开启持久化'); }
      else { localStorage.removeItem('mc_download_list'); showToast('已关闭持久化'); }
  });
  $('#j-use-320-toggle').on('change', function() { settings.use320ForTranscode = $(this).prop('checked'); localStorage.setItem('mc_use_320_transcode', settings.use320ForTranscode); });
  $('#j-autoplay-toggle').on('change', function() { settings.autoplay = $(this).prop('checked'); localStorage.setItem('mc_autoplay', settings.autoplay); });
  $('#j-page-size').on('input change', function() { settings.pageSize = parseInt($(this).val(), 10) || 10; localStorage.setItem('mc_page_size', settings.pageSize); });
  
  $('#j-transcode-sr, #j-global-sr').on('input change', function() {
      settings.singleSr = $('#j-transcode-sr').val(); settings.globalSr = $('#j-global-sr').val();
      localStorage.setItem('mc_single_sr', settings.singleSr); localStorage.setItem('mc_global_sr', settings.globalSr);
  });
  $('#j-transcode-br, #j-global-br').on('input change', function() {
      settings.singleBr = $('#j-transcode-br').val(); settings.globalBr = $('#j-global-br').val();
      localStorage.setItem('mc_single_br', settings.singleBr); localStorage.setItem('mc_global_br', settings.globalBr);
  });
  $('#j-transcode-ch, #j-global-ch').on('change', function() {
      settings.singleCh = $('#j-transcode-ch').val(); settings.globalCh = $('#j-global-ch').val();
      localStorage.setItem('mc_single_ch', settings.singleCh); localStorage.setItem('mc_global_ch', settings.globalCh);
  });

  // ================== 主页单曲转码 ==================
  $('#j-transcode-btn').on('click', function() {
      var currentData = playerList[player.playIndex];
      if (!currentData || !currentData.url) return showToast('请先解析并播放该歌曲');

      var sampleRate = parseInt(settings.singleSr, 10) || 48000;
      var bitrate = parseInt(settings.singleBr, 10);
      var channels = settings.singleCh;
      if (isNaN(bitrate)) bitrate = 128;

      var sourceUrl = (settings.use320ForTranscode && currentData.url_320) ? currentData.url_320 : currentData.url;
      var qualityStr = (bitrate === 0) ? 'VBR' : bitrate;
      var baseName = generateFileName(currentData, qualityStr);
      
      var $btn = $(this).prop('disabled', true);
      $('#j-single-progress').show();
      $('#j-pull-bar').val(0); $('#j-pull-text').html('正在拉取源文件...'); $('#j-pull-percent').text('0%');
      $('#j-trans-bar').val(0); $('#j-trans-text').html('等待转码...'); $('#j-trans-percent').text('0%');

      transcodeAudio(sourceUrl, baseName, sampleRate, bitrate, channels, {
          onPullProgress: function(percent, loaded, text) {
              $('#j-pull-bar').val(percent); $('#j-pull-text').html(text); $('#j-pull-percent').text(Math.floor(percent) + '%');
          },
          onTranscodeProgress: function(percent, text) {
              $('#j-trans-bar').val(percent); $('#j-trans-text').html(text); $('#j-trans-percent').text(Math.floor(percent) + '%');
          }
      })
      .then(function() {
          showToast('转码下载完成！');
          setTimeout(function() { $('#j-single-progress').fadeOut(); $btn.prop('disabled', false); }, 1500);
      })
      .catch(function(err) {
          showToast('转码失败: ' + err.message);
          $('#j-single-progress').fadeOut(); $btn.prop('disabled', false);
      });
  });

  $('#j-add-to-list').on('click', function() {
      var currentData = playerList[player.playIndex];
      if(!currentData || !currentData.url) return showToast('请先解析并播放该歌曲');
      if (downloadList.some(function(i){ return i.songid === currentData.songid; })) return showToast('这首歌已经在列表里啦！');
      
      downloadList.push({ songid: currentData.songid, title: currentData.title, author: currentData.author, type: currentData.type, url: currentData.url, url_320: currentData.url_320 || '', lrc: currentData.lrc });
      updateDownloadUI(); saveListToLocal(); showToast('已加入下载列表！');
  });

  $(document).on('click', '.dl-del', function() {
      var idx = $(this).data('idx'); downloadList.splice(idx, 1); updateDownloadUI(); saveListToLocal();
  });

  // 单曲直接下载 (128k)
  $(document).on('click', '.dl-128', function() {
      var item = downloadList[$(this).data('idx')];
      var filename = generateFileName(item, '128');
      $('#j-download-progress').show().text('正在下载: ' + item.title);

      fetchBlob(item.url, function(percent) {
          $('#j-download-progress').text('下载中 ' + Math.floor(percent) + '%');
      }).then(function(blob) {
          saveBlobAsFile(blob, filename + '.mp3');
          $('#j-download-progress').text('下载完成！');
          setTimeout(function() { $('#j-download-progress').fadeOut(); }, 1500);
      }).catch(function(err) {
          showToast(err.message); $('#j-download-progress').fadeOut();
      });
  });

  // 单曲直接下载 (320k)
  $(document).on('click', '.dl-320', function() {
      var item = downloadList[$(this).data('idx')];
      $('#j-download-progress').show().text('正在获取单曲 320k 链接...');
      
      getFresh320Url(item).then(function(url) {
          var filename = generateFileName(item, '320');
          $('#j-download-progress').text('正在下载: ' + item.title);
          return fetchBlob(url, function(percent) {
              $('#j-download-progress').text('下载中 ' + Math.floor(percent) + '%');
          }).then(function(blob) {
              saveBlobAsFile(blob, filename + '.mp3');
          });
      }).then(function() {
          $('#j-download-progress').text('下载完成！');
          setTimeout(function() { $('#j-download-progress').fadeOut(); }, 1500);
      }).catch(function(err) {
          showToast(err); $('#j-download-progress').fadeOut();
      });
  });

  // ================== 批量转码 ==================
  $('#j-transcode-all').on('click', function() {
      if (downloadList.length === 0) return;
      var sampleRate = parseInt(settings.globalSr, 10) || 48000;
      var bitrate = parseInt(settings.globalBr, 10);
      var channels = settings.globalCh;
      if (isNaN(bitrate)) bitrate = 128;

      var total = downloadList.length; var current = 0;
      var $progress = $('#j-download-progress'); var $btn = $(this);

      $btn.prop('disabled', true).text('转码队列执行中...');
      $progress.show().text('准备中...');

      function processNext() {
          if (current >= total) {
              $progress.text('全部转码完成！');
              setTimeout(function() { $progress.fadeOut(); }, 2000);
              $btn.prop('disabled', false).html('<i class="am-icon-cogs"></i> 批量转码为 Ogg');
              return;
          }

          var item = downloadList[current];
          var qualityStr = (bitrate === 0) ? 'VBR' : bitrate;
          var filename = generateFileName(item, qualityStr);
          $progress.text('[' + (current + 1) + '/' + total + '] 准备处理: ' + item.title);

          var progressCallbacks = {
              onPullProgress: function(percent, loaded, text) { $progress.text('[' + (current + 1) + '/' + total + '] ' + text); },
              onTranscodeProgress: function(percent, text) { $progress.text('[' + (current + 1) + '/' + total + '] ' + text); }
          };

          if (settings.use320ForTranscode && item.type === 'netease') {
              $progress.text('[' + (current + 1) + '/' + total + '] 正在获取最新 320k 链接...');
              getFresh320Url(item).then(function(freshUrl) {
                  return transcodeAudio(freshUrl, filename, sampleRate, bitrate, channels, progressCallbacks);
              }).then(function() { current++; processNext(); })
              .catch(function(err) {
                  transcodeAudio(item.url, filename, sampleRate, bitrate, channels, progressCallbacks)
                      .then(function() { current++; processNext(); })
                      .catch(function(e) { current++; processNext(); });
              });
          } else {
              transcodeAudio(item.url, filename, sampleRate, bitrate, channels, progressCallbacks)
                  .then(function() { current++; processNext(); })
                  .catch(function(err) { current++; processNext(); });
          }
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
              $progress.text('批量下载已全部完成！');
              setTimeout(function() { $progress.fadeOut(); }, 2000);
              $btn128.prop('disabled', false); $btn320.prop('disabled', false);
              return;
          }

          var item = downloadList[current];
          var baseName = generateFileName(item, type);
          $progress.text('[' + (current + 1) + '/' + total + '] 正在下载: ' + item.title);

          var doDownload = function(url) {
              return fetchBlob(url, function(percent) {
                  $progress.text('[' + (current + 1) + '/' + total + '] 下载中 ' + Math.floor(percent) + '%');
              }).then(function(blob) {
                  saveBlobAsFile(blob, baseName + '.mp3');
              });
          };

          if (type === '320') {
              getFresh320Url(item).then(function(freshUrl) { return doDownload(freshUrl); })
              .then(function() { current++; processNext(); })
              .catch(function(err) { current++; processNext(); });
          } else {
              doDownload(item.url).then(function() { current++; processNext(); });
          }
      }
      processNext();
  }

  $('#j-download-all-128').on('click', function() { batchDownload('128'); });
  $('#j-download-all-320').on('click', function() { batchDownload('320'); });

  // ================== 搜素逻辑保持不变 ==================
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