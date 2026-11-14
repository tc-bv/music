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

  // ================== 下载列表管理核心逻辑 ==================
  
  var isPersist = localStorage.getItem('mc_persist_list') === 'true';
  $('#j-persist-toggle').prop('checked', isPersist);

  var downloadList = [];
  if (isPersist) {
      downloadList = JSON.parse(localStorage.getItem('mc_download_list') || '[]');
  }

  var nameFormat = '{title}';
  if (isPersist) {
      nameFormat = localStorage.getItem('mc_name_format') || '{title}';
  }
  $('#j-name-format').val(nameFormat);

  updateDownloadUI();

  function saveListToLocal() {
      if (isPersist) {
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
          $('#j-download-all-128, #j-download-all-320').hide();
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
      
      if (downloadList.some(function(i){ return i.type === 'netease' && i.url_320; })) {
          $('#j-download-all-320').show();
      } else {
          $('#j-download-all-320').hide();
      }
  }

  function generateFileName(item, quality) {
      var qualityStr = quality || '128';
      var randomNum = Math.floor(Math.random() * 2147483647);
      
      var currentFormat = $('#j-name-format').val() || nameFormat;

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

  // ================== 单曲下载核心 (带进度条) ==================
  function downloadWithProgress(url, filename, progressBarId, btnId) {
      var proxyUrl = getProxyDownloadUrl(url, filename);
      var $progressBar = $(progressBarId);
      var $btn = $(btnId);

      $btn.prop('disabled', true).find('i').attr('class', 'am-icon-spinner am-icon-spin');
      $progressBar.val(0).show();

      var xhr = new XMLHttpRequest();
      xhr.open('GET', proxyUrl, true);
      xhr.responseType = 'blob';

      xhr.onprogress = function(e) {
          if (e.lengthComputable) {
              var percentComplete = (e.loaded / e.total) * 100;
              $progressBar.val(percentComplete);
          }
      };

      xhr.onload = function() {
          if (this.status === 200) {
              $progressBar.val(100);
              var blob = this.response;
              var blobUrl = window.URL.createObjectURL(blob);
              var a = document.createElement('a');
              a.href = blobUrl;
              a.download = filename + '.mp3';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(blobUrl);
          } else {
              showToast('下载失败');
          }
          setTimeout(function() {
              $progressBar.fadeOut();
              $btn.prop('disabled', false).find('i').attr('class', 'am-icon-download');
          }, 1000);
      };

      xhr.onerror = function() {
          showToast('网络错误');
          $progressBar.hide();
          $btn.prop('disabled', false).find('i').attr('class', 'am-icon-download');
      };

      xhr.send();
  }

  // ================== 动态获取 320k 链接 (必须提前定义) ==================
  function getFresh320Url(item) {
      return new Promise(function(resolve, reject) {
          if(!item.songid) return reject('缺少歌曲 ID');
          $.ajax({
              type: 'POST',
              url: getUrl(),
              timeout: 10000,
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

  // ================== Mediabunny 转码核心逻辑 ==================

  function fetchBlobWithProgress(url, onProgress) {
      return new Promise(function(resolve, reject) {
          var proxyUrl = getProxyDownloadUrl(url, 'temp');
          var xhr = new XMLHttpRequest();
          xhr.open('GET', proxyUrl, true);
          xhr.responseType = 'blob';

          xhr.onprogress = function(e) {
              if (e.lengthComputable && onProgress) {
                  onProgress(e.loaded, e.total);
              }
          };

          xhr.onload = function() {
              if (this.status === 200) resolve(this.response);
              else reject(new Error('拉取失败: ' + this.status));
          };

          xhr.onerror = function() { reject(new Error('网络错误')); };
          xhr.send();
      });
  }

  async function transcodeAudio(sourceUrl, outputFilename, sampleRate, bitrateKbps, callbacks) {
      var onPullProgress = callbacks && callbacks.onPullProgress;
      var onTranscodeProgress = callbacks && callbacks.onTranscodeProgress;

      if (onPullProgress) onPullProgress(0, 0, '准备拉取源文件...');
      
      var sourceBlob;
      try {
          sourceBlob = await fetchBlobWithProgress(sourceUrl, function(loaded, total) {
              if (onPullProgress) {
                  var percent = Math.floor((loaded / total) * 100);
                  onPullProgress(percent, loaded, '拉取中 ' + percent + '%');
              }
          });
      } catch (e) {
          throw new Error('拉取源文件失败: ' + e.message);
      }

      if (onPullProgress) onPullProgress(100, 0, '拉取完成，准备转码...');
      if (onTranscodeProgress) onTranscodeProgress(0, '初始化转码器...');
      
      if (!window.Mediabunny) {
          throw new Error('Mediabunny 未加载');
      }

      const { Input, Output, Conversion, ALL_FORMATS, BlobSource, OggOutputFormat, BufferTarget } = window.Mediabunny;

      const input = new Input({
          source: new BlobSource(sourceBlob),
          formats: ALL_FORMATS,
      });

      const output = new Output({
          format: new OggOutputFormat(),
          target: new BufferTarget(),
      });

      var audioConfig = {
          codec: 'opus',
          sampleRate: sampleRate,
          numberOfChannels: 1, 
      };

      if (bitrateKbps > 0) {
          audioConfig.bitrate = bitrateKbps * 1000;
          audioConfig.bitrateMode = 'constant';
      } else {
          audioConfig.bitrateMode = 'variable';
      }

      const conversion = await Conversion.init({
          input,
          output,
          audio: audioConfig,
      });

      if (!conversion.isValid) {
          throw new Error('浏览器不支持 Opus 编码或参数不合法');
      }

      conversion.onProgress = function(progress) {
          if (onTranscodeProgress) {
              onTranscodeProgress(Math.floor(progress * 100), '转码中 ' + (progress * 100).toFixed(1) + '%');
          }
      };

      await conversion.execute();

      if (onTranscodeProgress) onTranscodeProgress(100, '转码完成，正在保存...');

      const finalBuffer = output.target.buffer;
      const finalBlob = new Blob([finalBuffer], { type: 'audio/ogg' });
      const blobUrl = window.URL.createObjectURL(finalBlob);
      
      var a = document.createElement('a');
      a.href = blobUrl;
      a.download = outputFilename + '.ogg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
  }

  // ================== 列表单曲下载事件 ==================
  
  // 128k 下载
  $(document).on('click', '.dl-128', function() {
      var idx = $(this).data('idx');
      var item = downloadList[idx];
      var $progress = $('#j-download-progress');
      var filename = generateFileName(item, '128');
      var proxyUrl = getProxyDownloadUrl(item.url, filename);
      
      if(!proxyUrl) return showToast('暂无 128k 链接');

      $progress.show().text('正在下载: ' + item.title);
      
      var xhr = new XMLHttpRequest();
      xhr.open('GET', proxyUrl, true);
      xhr.responseType = 'blob';

      xhr.onprogress = function(e) {
          if (e.lengthComputable) {
              var percent = Math.floor((e.loaded / e.total) * 100);
              $progress.text('下载中 ' + percent + '% (' + (e.loaded/1024/1024).toFixed(1) + 'MB / ' + (e.total/1024/1024).toFixed(1) + 'MB)');
          }
      };

      xhr.onload = function() {
          if (this.status === 200) {
              $progress.text('下载完成，保存中...');
              var blob = this.response;
              var blobUrl = window.URL.createObjectURL(blob);
              var a = document.createElement('a');
              a.href = blobUrl;
              a.download = filename + '.mp3';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(blobUrl);
          } else {
              showToast('下载失败');
          }
          setTimeout(function() { $progress.fadeOut(); }, 1500);
      };

      xhr.onerror = function() {
          showToast('网络错误');
          $progress.fadeOut();
      };

      xhr.send();
  });

  // 320k 下载
  $(document).on('click', '.dl-320', function() {
      var idx = $(this).data('idx');
      var item = downloadList[idx];
      var $progress = $('#j-download-progress');
      
      $progress.show().text('正在获取单曲 320k 链接...');
      
      getFresh320Url(item).then(function(url) {
          $progress.text('正在下载: ' + item.title);
          var filename = generateFileName(item, '320');
          var proxyUrl = getProxyDownloadUrl(url, filename);

          var xhr = new XMLHttpRequest();
          xhr.open('GET', proxyUrl, true);
          xhr.responseType = 'blob';

          xhr.onprogress = function(e) {
              if (e.lengthComputable) {
                  var percent = Math.floor((e.loaded / e.total) * 100);
                  $progress.text('下载中 ' + percent + '% (' + (e.loaded/1024/1024).toFixed(1) + 'MB / ' + (e.total/1024/1024).toFixed(1) + 'MB)');
              }
          };

          xhr.onload = function() {
              if (this.status === 200) {
                  $progress.text('下载完成，保存中...');
                  var blob = this.response;
                  var blobUrl = window.URL.createObjectURL(blob);
                  var a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = filename + '.mp3';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(blobUrl);
              } else {
                  showToast('下载失败');
              }
              setTimeout(function() { $progress.fadeOut(); }, 1500);
          };

          xhr.onerror = function() {
              showToast('网络错误');
              $progress.fadeOut();
          };

          xhr.send();

      }).catch(function(err) {
          $progress.fadeOut();
          showToast(err);
      });
  });

  // ================== 事件绑定 ==================

  $('#j-name-format').on('input change', function() {
      nameFormat = $(this).val();
      if (isPersist) {
          localStorage.setItem('mc_name_format', nameFormat);
      }
  });

  $('#j-persist-toggle').on('change', function() {
      isPersist = $(this).prop('checked');
      localStorage.setItem('mc_persist_list', isPersist);
      
      if (isPersist) {
          localStorage.setItem('mc_download_list', JSON.stringify(downloadList));
          localStorage.setItem('mc_name_format', nameFormat);
          showToast('已开启持久化存储，刷新不丢失');
      } else {
          localStorage.removeItem('mc_download_list');
          localStorage.removeItem('mc_name_format');
          showToast('已关闭持久化存储，刷新将清空');
      }
  });

  // === 弹窗开关控制 ===
  function openDownloadPanel() {
      $('#j-modal-overlay').addClass('show');
      $('#j-download-panel').addClass('show');
  }

  function closeDownloadPanel() {
      $('#j-modal-overlay').removeClass('show');
      $('#j-download-panel').removeClass('show');
  }

  // 点击悬浮球打开
  $('#j-fab').on('click', function() {
      openDownloadPanel();
  });

  // 点击关闭按钮
  $('#j-panel-close').on('click', function() {
      closeDownloadPanel();
  });

  // 点击遮罩层关闭
  $('#j-modal-overlay').on('click', function() {
      closeDownloadPanel();
  });

  $('#j-add-to-list').on('click', function() {
      var currentData = playerList[player.playIndex];
      if(!currentData || !currentData.url) {
          showToast('请先解析并播放该歌曲');
          return;
      }
      
      if (downloadList.some(function(i){ return i.songid === currentData.songid; })) {
          showToast('这首歌已经在列表里啦！');
          return;
      }
      
      downloadList.push({
          songid: currentData.songid,
          title: currentData.title,
          author: currentData.author,
          type: currentData.type,
          url: currentData.url,
          url_320: currentData.url_320 || '',
          lrc: currentData.lrc
      });
      
      updateDownloadUI();
      saveListToLocal();
      showToast('已加入下载列表！');
  });

  $(document).on('click', '.dl-del', function() {
      var idx = $(this).data('idx');
      downloadList.splice(idx, 1);
      updateDownloadUI();
      saveListToLocal();
  });

  // 主页单曲转码
  $('#j-transcode-btn').on('click', function() {
      var currentData = playerList[player.playIndex];
      if (!currentData || !currentData.url) {
          showToast('请先解析并播放该歌曲');
          return;
      }

      var sampleRate = parseInt($('#j-transcode-sr').val(), 10) || 48000;
      var bitrate = parseInt($('#j-transcode-br').val(), 10);
      if (isNaN(bitrate)) bitrate = 128;

      var sourceUrl = currentData.url_320 || currentData.url;
      
      var qualityStr = (bitrate === 0) ? 'VBR' : bitrate;
      var baseName = generateFileName(currentData, qualityStr);
      
      var $btn = $(this);
      var $singleProgress = $('#j-single-progress');
      var $pullBar = $('#j-pull-bar');
      var $pullText = $('#j-pull-text');
      var $pullPercent = $('#j-pull-percent');
      var $transBar = $('#j-trans-bar');
      var $transText = $('#j-trans-text');
      var $transPercent = $('#j-trans-percent');

      $btn.prop('disabled', true);
      
      $singleProgress.show();
      $pullBar.val(0);
      $pullText.html('正在拉取源文件...');
      $pullPercent.text('0%');
      $transBar.val(0);
      $transText.html('等待转码...');
      $transPercent.text('0%');

      transcodeAudio(sourceUrl, baseName, sampleRate, bitrate, {
          onPullProgress: function(percent, loaded, text) {
              $pullBar.val(percent);
              $pullText.html(text);
              $pullPercent.text(percent + '%');
          },
          onTranscodeProgress: function(percent, text) {
              $transBar.val(percent);
              $transText.html(text);
              $transPercent.text(percent + '%');
          }
      })
      .then(function() {
          showToast('转码下载完成！');
          setTimeout(function() {
              $singleProgress.fadeOut();
              $btn.prop('disabled', false);
          }, 1500);
      })
      .catch(function(err) {
          showToast('转码失败: ' + err.message);
          $singleProgress.fadeOut();
          $btn.prop('disabled', false);
      });
  });

  // ================== 批量转码与批量下载 ==================

  // 批量转码
  $('#j-transcode-all').on('click', function() {
      if (downloadList.length === 0) return;

      var sampleRate = parseInt($('#j-global-sr').val(), 10) || 48000;
      var bitrate = parseInt($('#j-global-br').val(), 10);
      if (isNaN(bitrate)) bitrate = 128;

      var total = downloadList.length;
      var current = 0;
      var $progress = $('#j-download-progress');
      var $btn = $(this);

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
          var sourceUrl = item.url_320 || item.url;
          
          var qualityStr = (bitrate === 0) ? 'VBR' : bitrate;
          var filename = generateFileName(item, qualityStr);

          $progress.text('[' + (current + 1) + '/' + total + '] 准备处理: ' + item.title);

          transcodeAudio(sourceUrl, filename, sampleRate, bitrate, {
              onPullProgress: function(percent, loaded, text) {
                  $progress.text('[' + (current + 1) + '/' + total + '] ' + text);
              },
              onTranscodeProgress: function(percent, text) {
                  $progress.text('[' + (current + 1) + '/' + total + '] ' + text);
              }
          })
          .then(function() {
              current++;
              processNext();
          })
          .catch(function(err) {
              console.error('批量转码失败: ', item.title, err);
              current++;
              processNext();
          });
      }

      processNext();
  });
  
  function batchDownload(type) {
      if (downloadList.length === 0) return;

      var total = downloadList.length;
      var current = 0;
      var $progress = $('#j-download-progress');
      var $btn128 = $('#j-download-all-128');
      var $btn320 = $('#j-download-all-320');

      $btn128.prop('disabled', true);
      $btn320.prop('disabled', true);
      $progress.show().text('准备批量下载 ' + type + 'k...');

      function processNext() {
          if (current >= total) {
              $progress.text('批量下载已全部完成！');
              setTimeout(function() { $progress.fadeOut(); }, 2000);
              $btn128.prop('disabled', false);
              $btn320.prop('disabled', false);
              return;
          }

          var item = downloadList[current];
          var baseName = generateFileName(item, type);
          
          $progress.text('[' + (current + 1) + '/' + total + '] 正在下载: ' + item.title);

          function downloadPromise(url) {
              return new Promise(function(resolve) {
                  var proxyUrl = getProxyDownloadUrl(url, baseName);
                  var xhr = new XMLHttpRequest();
                  xhr.open('GET', proxyUrl, true);
                  xhr.responseType = 'blob';

                  // 【新增】：绑定实时下载进度
                  xhr.onprogress = function(e) {
                      if (e.lengthComputable) {
                          var mb = (e.loaded / 1024 / 1024).toFixed(1);
                          var totalMb = (e.total / 1024 / 1024).toFixed(1);
                          var percent = Math.floor((e.loaded / e.total) * 100);
                          $progress.text('[' + (current + 1) + '/' + total + '] 下载中 ' + percent + '% (' + mb + 'MB / ' + totalMb + 'MB)');
                      }
                  };

                  xhr.onload = function() {
                      if (this.status === 200) {
                          $progress.text('[' + (current + 1) + '/' + total + '] 下载完成，正在保存...');
                          var blob = this.response;
                          var blobUrl = window.URL.createObjectURL(blob);
                          var a = document.createElement('a');
                          a.href = blobUrl;
                          a.download = baseName + '.mp3';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(blobUrl);
                      }
                      resolve();
                  };
                  xhr.onerror = function() { resolve(); };
                  xhr.send();
              });
          }
          if (type === '320') {
              getFresh320Url(item).then(function(freshUrl) {
                  return downloadPromise(freshUrl);
              }).then(function() {
                  current++;
                  processNext();
              }).catch(function(err) {
                  console.error('获取 320k 失败: ', item.title, err);
                  current++;
                  processNext();
              });
          } else {
              downloadPromise(item.url).then(function() {
                  current++;
                  processNext();
              });
          }
      }

      processNext();
  }

  $('#j-download-all-128').on('click', function() { batchDownload('128'); });
  $('#j-download-all-320').on('click', function() { batchDownload('320'); });

  // ================== 原有下载 / 搜索逻辑 ==================

  var clearPending = false;
  var clearTimer = null;
  
  $('#j-clear-list').on('click', function() {
      if (!clearPending) {
          clearPending = true;
          showToast('再次点击确认清空列表');
          $(this).text('确定清空？').removeClass('am-btn-default').addClass('am-btn-danger');
          
          clearTimer = setTimeout(function() {
              clearPending = false;
              $('#j-clear-list').html('<i class="am-icon-trash"></i> 清空列表').removeClass('am-btn-danger').addClass('am-btn-default');
          }, 3000);
      } else {
          clearTimeout(clearTimer);
          clearPending = false;
          downloadList = [];
          updateDownloadUI();
          saveListToLocal();
          showToast('列表已清空');
          
          $(this).html('<i class="am-icon-trash"></i> 清空列表').removeClass('am-btn-danger').addClass('am-btn-default');
      }
  });

  if ((qName || qId) && qType) {
    setTimeout(function() {
      $('#j-input').val(qName || qId);
      $('#j-type input[value="' + qType + '"]').prop('checked', true);
      if (qName) $('#j-nav [data-filter="name"]').trigger('click');
      if (qId) $('#j-nav [data-filter="id"]').trigger('click');
      $('#j-validator').trigger('submit');
    }, 0);
  }

  if (qUrl) {
    setTimeout(function() {
      $('#j-type').hide();
      $('#j-input').val(qUrl);
      $('#j-nav [data-filter="url"]').trigger('click');
      $('#j-validator').trigger('submit');
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
      var $field = $(v.field);
      var $group = $field.closest('.am-form-group');
      var msgs = { name: '将 名称 和 作者 一起输入可提高匹配度', id: '输入错误，请查看下面的帮助', url: '输入错误，请查看下面的帮助' };
      var $alert = $group.find('.am-alert');
      var msg = msgs[$field.data('filter')] || this.getValidationMessage(v);
      if (!$alert.length) $alert = $('<div class="am-alert am-alert-danger am-animation-shake"></div>').hide().appendTo($group);
      $alert.html(msg).show();
    },
    submit: function submit(v) {
      v.preventDefault();
      if (this.isFormValid()) {
        var input = $.trim($('#j-input').val());
        var filter = $('#j-input').data('filter');
        var type = filter === 'url' ? '_' : $('input[name="music_type"]:checked').val();
        var page = 1;
        var $more = $('<div class="aplayer-more">载入更多</div>');
        var isload = false;
        
        var ajax = function ajax(input, filter, type, page) {
          $.ajax({
            type: 'POST', url: getUrl(), timeout: 30000,
            data: { input: input, filter: filter, type: type, page: page }, dataType: 'json',
            beforeSend: function beforeSend() {
              isload = true;
              var title = document.title;
              switch (filter) {
                case 'name': pushState(title, getUrl('?name=' + input + '&type=' + type)); break;
                case 'id': pushState(title, getUrl('?id=' + input + '&type=' + type)); break;
                case 'url': pushState(title, getUrl('?url=' + encodeURIComponent(input))); break;
              }
              if (page === 1) {
                $('#j-input').attr('disabled', true); $('#j-submit').button('loading');
              } else {
                $more.text('请稍后...');
              }
            },
            success: function success(result) {
              if (result.code === 200 && result.data) {
                result.data.map(function(v) {
                  if (!v.title) v.title = '暂无';
                  if (!v.author) v.author = '暂无';
                  if (!v.pic) v.pic = nopic;
                  if (!v.lrc) v.lrc = '[00:00.00] 暂无歌词';
                  if (!/\[00:(\d{2})\./.test(v.lrc)) v.lrc = '[00:00.00] 无效歌词';
                });
                
                var setValue = function setValue(data) {
                  var $srcRow = $('#j-src').closest('.am-g');
                  var $wrapper320 = $('#j-src320-wrapper');
                  
                  if ($srcRow.length > 0) {
                      $srcRow.prepend($wrapper320);
                  }

                  $('#j-link').val(data.link);
                  $('#j-link-btn').attr('href', data.link);
                  $('#j-src').val(data.url);
                  $('#j-src320').val(data.url_320 || '');

                  var $wrapper128 = $('#j-src').closest('.am-u-lg-6, .am-u-lg-12');

                  if (data.type === 'netease' && data.url_320) {
                    $wrapper320.show().removeClass('am-u-lg-12').addClass('am-u-lg-6');
                    $wrapper128.removeClass('am-u-lg-12').addClass('am-u-lg-6');
                  } else {
                    $wrapper320.hide(); 
                    $wrapper128.removeClass('am-u-lg-6').addClass('am-u-lg-12');
                  }

                  $('#j-lrc').val(data.lrc);
                  $('#j-lrc-btn').attr('href', 'data:application/octet-stream;base64,' + btoa(unescape(encodeURIComponent(data.lrc))));
                  $('#j-lrc-btn-icon').attr('class', 'am-icon-download');
                  
                  $('#j-songid').val(data.songid); 
                  $('#j-name').val(data.title); 
                  $('#j-author').val(data.author);

                  var dlName128 = generateFileName(data, '128');
                  var dlName320 = generateFileName(data, '320');

                  $('#j-src-btn').off('click').on('click', function(e) {
                      e.preventDefault();
                      if(!data.url) return showToast('暂无 128k 链接');
                      downloadWithProgress(data.url, dlName128, '#j-progress-128', '#j-src-btn');
                  });

                  if ($('#j-src320-btn').length) {
                      $('#j-src320-btn').off('click').on('click', function(e) {
                          e.preventDefault();
                          if(!data.url_320) return showToast('暂无 320k 链接');
                          downloadWithProgress(data.url_320, dlName320, '#j-progress-320', '#j-src320-btn');
                      });
                  }

                  $('#j-lrc-btn').attr('download', data.title + '-' + data.author + '.lrc');
                };

                if (page === 1) {
                  if (player) player.pause();
                  playerList = result.data;
                  setValue(playerList[0]);
                  
                  $('#j-validator').slideUp();
                  $('#j-main').slideDown();

                  player = new APlayer({
                    element: $('#j-player')[0],
                    autoplay: true,
                    narrow: false,
                    showlrc: 1,
                    mutex: false,
                    mode: 'circulation',
                    preload: 'metadata',
                    theme: '#0e90d2',
                    music: result.data
                  });

                  $('#j-player').append($more);

                  $more.on('click', function() {
                    if (isload) return;
                    page++;
                    ajax(input, filter, type, page);
                  });
                } else {
                  player.addMusic(result.data);
                  playerList = playerList.concat(result.data);
                }

                player.on('play', function() {
                  var data = playerList[player.playIndex];
                  if(!data.url) return;

                  var img = new Image();
                  img.src = data.pic;
                  img.onerror = function() {
                    $('.aplayer-pic').css('background-image', 'url(' + nopic + ')');
                  };
                  document.title = '正在播放: ' + data.title + ' - ' + data.author;
                  setValue(data);
                });

                player.on('ended', function() { document.title = siteTitle; });

                if (result.data.length < 10) $more.hide(); else $more.text('载入更多');
              } else {
                if (page === 1) {
                  $('#j-input').closest('.am-form-group').find('.am-alert').html(result.error || '(°ー°〃) 服务器好像罢工了').show();
                } else {
                  $more.text('没有了');
                  setTimeout(function() { $more.slideUp(); }, 1000);
                }
              }
            },
            error: function error(e, t) {
              if (page === 1) {
                var err = '(°ー°〃) 出了点小问题，请重试';
                if (t === 'timeout') err = '(°ー°〃) 请求超时了，请稍后重试';
                $('#j-input').closest('.am-form-group').find('.am-alert').html(err).show();
              } else {
                $more.text('(°ー°〃) 加载失败了，点击重试');
              }
            },
            complete: function complete() {
              isload = false;
              if (page === 1) {
                $('#j-input').attr('disabled', false); $('#j-submit').button('reset');
              }
            }
          });
        };
        ajax(input, filter, type, page);
      }
    }
  });

  $('#j-main input').focus(function() { $(this).select(); });
  $('#j-more').on('click', function() {
    $(this).hide();
    $('#j-quote').removeClass('music-overflow');
  });

  $('#j-back').on('click', function() {
    if (player) player.pause();
    $('#j-validator').slideDown();
    $('#j-main').slideUp();
    $('#j-main input').val('');
    document.title = siteTitle;
    pushState(siteTitle, getUrl());
  });
});