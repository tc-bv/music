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
  var downloadList = [];
  var nameFormat = '{title}';

  updateDownloadUI();

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
      
      // 强行从 DOM 里拿一次最新的值，防止 change 事件没触发
      var currentFormat = $('#j-name-format').val() || nameFormat;

      var fname = currentFormat.replace(/{title}/g, item.title)
                            .replace(/{author}/g, item.author)
                            .replace(/{songid}/g, item.songid)
                            .replace(/{quality}/g, qualityStr)
                            .replace(/{random}/g, randomNum);
      
      fname = fname.replace(/[\\/:*?"<>|]/g, '');
      return fname || item.title;
  }

  function triggerDownload(url, filename) {
      if(!url) {
          showToast('暂无此音质链接');
          return;
      }
      if (url.indexOf('data:audio') === 0) return;

      var proxyUrl = getUrl('download.php') + '?url=' + encodeURIComponent(url) + '&filename=' + encodeURIComponent(filename + '.mp3');
      
      var $iframe = $('<iframe style="display:none;"></iframe>').attr('src', proxyUrl);
      $('body').append($iframe);
      setTimeout(function() { $iframe.remove(); }, 10000);
  }
  
  $('#j-name-format').on('input change', function() {
      nameFormat = $(this).val();
  });

  $('#j-fab').on('click', function() {
      $('#j-download-panel').addClass('show');
  });

  $('#j-panel-toggle').on('click', function() {
      if($('#j-download-panel').hasClass('show')) {
          $('#j-download-panel').removeClass('show');
      }
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
      showToast('已加入下载列表！');
  });

  $(document).on('click', '.dl-del', function() {
      var idx = $(this).data('idx');
      downloadList.splice(idx, 1);
      updateDownloadUI();
  });

  $(document).on('click', '.dl-128', function() {
      var idx = $(this).data('idx');
      var item = downloadList[idx];
      triggerDownload(item.url, generateFileName(item, '128'));
  });
  $(document).on('click', '.dl-320', function() {
      var idx = $(this).data('idx');
      var item = downloadList[idx];
      triggerDownload(item.url_320 || item.url, generateFileName(item, '320'));
  });

  function batchDownload(type) {
      if (downloadList.length === 0) return;
      downloadList.forEach(function(item) {
          var finalUrl = (type === '320' && item.url_320) ? item.url_320 : item.url;
          triggerDownload(finalUrl, generateFileName(item, type));
      });
      showToast('已触发批量下载！');
  }

  $('#j-download-all-128').on('click', function() { batchDownload('128'); });
  $('#j-download-all-320').on('click', function() { batchDownload('320'); });

  $('#j-clear-list').on('click', function() {
      if(confirm('确定清空所有下载任务吗？')) {
          downloadList = [];
          updateDownloadUI();
          showToast('列表已清空');
      }
  });
  // =========================================================

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
                  // 暴力挪动 DOM 节点，强制 320k 在左，128k 在右
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

                  // === 核心修改：将主页的下载按钮全部劫持为本地代理流式下载 ===
                  var dlName128 = generateFileName(data, '128');
                  var dlName320 = generateFileName(data, '320');

                  // 劫持 128k 下载按钮
                  $('#j-src-btn').attr('href', data.url).attr('download', dlName128 + '.mp3');
                  $('#j-src-btn').off('click').on('click', function(e) {
                      e.preventDefault();
                      if(!data.url) {
                          showToast('暂无 128k 链接');
                          return;
                      }
                      triggerDownload(data.url, dlName128);
                  });

                  // 劫持 320k 下载按钮
                  if ($('#j-src320-btn').length) {
                      $('#j-src320-btn').attr('href', data.url_320 || '').attr('download', dlName320 + '.mp3');
                      $('#j-src320-btn').off('click').on('click', function(e) {
                          e.preventDefault();
                          if(!data.url_320) {
                              showToast('暂无 320k 链接');
                              return;
                          }
                          triggerDownload(data.url_320, dlName320);
                      });
                  }

                  // 歌词下载保持原样
                  $('#j-lrc-btn').attr('download', data.title + '-' + data.author + '.lrc');
                  // =========================================================
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