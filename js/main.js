/**
 * 主入口 - 初始化地图 + 轮询数据 + 面板交互
 */

(function () {
  // ============ 配置 ============
  var API_URL = 'https://daolongtan.cn/daolongtan/openapi/base-register/list';
  var API_RECENT_URL = 'https://daolongtan.cn/daolongtan/openapi/base-register/recent';
  var POLL_INTERVAL = 10000;
  var FLIGHT_DISPLAY_DURATION = 8000;

  // ============ 统计数据 ============
  var totalCount = 0;
  var cityCountMap = {};
  var occupationMap = {};
  var ageMap = {};

  // ============ DOM ============
  var container = document.getElementById('map-container');
  var totalNomadsEl = document.getElementById('total-nomads');

  // ============ 初始化图表 ============
  var mapChart = echarts.init(container, null, { renderer: 'canvas' });
  var occChart = echarts.init(document.getElementById('chart-occupation'), null, { renderer: 'canvas' });
  var ageChart = echarts.init(document.getElementById('chart-age'), null, { renderer: 'canvas' });

  initPieCharts();

  var PIE_HIGHLIGHT_INTERVAL = 8000;
  var occDataCache = [];
  var ageDataCache = [];
  var occHighlightIdx = 0;
  var ageHighlightIdx = 0;
  var occHighlightTimer = null;
  var ageHighlightTimer = null;

  // 加入列表 - 堆叠卡片翻牌
  var stackIndex = 0;
  var STACK_VISIBLE = 9;

  function updateStack() {
    var listEl = document.getElementById('join-list');
    if (!listEl || listEl.children.length === 0) return;
    var total = listEl.children.length;

    for (var i = 0; i < total; i++) {
      var item = listEl.children[i];
      item.className = 'join-item';
      item.style.display = 'none';
    }

    for (var j = 0; j < STACK_VISIBLE; j++) {
      var idx = (stackIndex + j) % total;
      var el = listEl.children[idx];
      el.style.display = 'flex';
      el.classList.add('stack-' + j);
    }
  }

  function flipStack() {
    var listEl = document.getElementById('join-list');
    if (!listEl || listEl.children.length <= 1) return;
    var total = listEl.children.length;

    var topIdx = stackIndex % total;
    var topEl = listEl.children[topIdx];
    topEl.classList.remove('stack-0');
    topEl.classList.add('stack-exit');

    setTimeout(function () {
      stackIndex = (stackIndex + 1) % total;
      updateStack();
    }, 450);
  }

  setInterval(flipStack, 2500);

  // 动态注册“海外”坐标
  function updateOverseasCoord() {
    var anchorEl = document.querySelector('.globe-overseas-anchor');
    var globeEl = document.querySelector('.globe-image');
    if ((!anchorEl && !globeEl) || typeof CITY_COORDS === 'undefined') return;
    var rect = (anchorEl || globeEl).getBoundingClientRect();
    var mapRect = container.getBoundingClientRect();
    var x = rect.left - mapRect.left + rect.width / 2;
    var y = rect.top - mapRect.top + rect.height / 2;
    var coord = mapChart.convertFromPixel({ geoIndex: 0 }, [x, y]);
    if (coord) {
      CITY_COORDS['海外'] = coord;
    }
  }

  // ============ 加载地图 ============
  fetch('data/china.json')
    .then(function (res) { return res.json(); })
    .then(function (geoJson) {
      if (geoJson && geoJson.features) {
        geoJson.features.forEach(function (f) {
          if (f.properties && f.properties.name) {
            f.properties.name = f.properties.name.replace(/维吾尔|壮族|回族|自治区|特别行政区|省|市/g, '');
          }
        });
      }
      echarts.registerMap('china', geoJson);
      mapChart.setOption(createMapOption());

      // 等待定位完成
      setTimeout(function () {
        updateOverseasCoord();
        pollData();
        pollDanmaku();
        setInterval(pollRecentDanmaku, 10000);
        setInterval(pollRecentRegister, 10000);
      }, 300);
    })
    .catch(function (err) {
      console.error('加载地图数据失败:', err);
    });



  // ============ 轮询获取真实数据 ============
  var isInitialLoad = true;
  var lastDataCount = 0;

  function pollData() {
    fetch(API_URL, {
      headers: {
        'tenant-id': '1'
      }
    })
      .then(function (res) { return res.json(); })
      .then(function (res) {
        if (res.code === 200 || res.code === 0) {

          processApiData(res.data || []);
        }
      })
      .catch(function (e) {
        console.error('接口请求失败:', e);
      });
  }

  function processApiData(dataList) {
    if (!dataList || dataList.length === 0) return;

    if (isInitialLoad) {
      isInitialLoad = false;
      lastDataCount = dataList.length;
      handleInitialData(dataList);
    } else {
      var newCount = dataList.length - lastDataCount;
      if (newCount > 0) {
        var newItems = dataList.slice(0, newCount); // 假设返回的数据 [0] 是最新的
        lastDataCount = dataList.length;
        handleIncrementalData(newItems);
      }
    }
  }

  function pollRecentRegister() {
    fetch(API_RECENT_URL, {
      headers: { 'tenant-id': '1' }
    })
      .then(function (res) { return res.json(); })
      .then(function (res) {
        if ((res.code === 200 || res.code === 0) && res.data && res.data.length > 0) {
          handleIncrementalData(res.data);
        }
      })
      .catch(function (e) {
        console.error('recent register 请求失败:', e);
      });
  }

  function formatCity(c) {
    if (!c) return '海外';
    var s = c.replace(/省|市|维吾尔|壮族|回族|自治区|特别行政区/g, '').trim();
    var parts = s.split(/\s+/);
    if (parts.length > 1 && parts[0] === parts[1]) {
      s = parts[0];
    } else if (parts.length > 1) {
      s = parts[parts.length - 1];
    }
    return s || '海外';
  }

  function handleInitialData(dataList) {
    totalCount = dataList.length;
    cityCountMap = {};
    occupationMap = {};
    ageMap = {};

    dataList.forEach(function (item) {
      var city = formatCity(item.city);
      cityCountMap[city] = (cityCountMap[city] || 0) + 1;

      if (item.skill) {
        var skills = item.skill.split(',');
        skills.forEach(function (s) {
          var t = s.trim();
          if (t) occupationMap[t] = (occupationMap[t] || 0) + 1;
        });
      }
      if (item.age) ageMap[item.age] = (ageMap[item.age] || 0) + 1;
    });

    updateStats();
    updateTopList();
    updatePieCharts();

    // 渲染加入事件列表（取最新30条）
    var latest = dataList.slice(0, 30);
    renderJoinList(latest);

    // 页面刷新时不再用生命周期飞线，直接呈现现有的全部统计飞线
    updateMapChart();
  }

  function handleIncrementalData(newItems) {
    totalCount += newItems.length;

    newItems.forEach(function (item) {
      var city = formatCity(item.city);
      cityCountMap[city] = (cityCountMap[city] || 0) + 1;

      if (item.skill) {
        var skills = item.skill.split(',');
        skills.forEach(function (s) {
          var t = s.trim();
          if (t) occupationMap[t] = (occupationMap[t] || 0) + 1;
        });
      }
      if (item.age) ageMap[item.age] = (ageMap[item.age] || 0) + 1;
    });

    updateStats();
    updateTopList();
    updatePieCharts();

    // 将新数据前置插入列表
    prependNewJoin(newItems);

    // 更新带有最新常驻飞线和计数的地图节点
    updateMapChart();
  }

  // ============ 生成飞线并渲染 ============
  function updateMapChart() {
    var linesData = [];
    var scatterData = [];

    // 对于曾有登记记录的独一无二的城市地级，生成常驻连接线
    Object.keys(cityCountMap).forEach(function (city) {
      if (!city) return;
      var coord;
      if (city === '海外') {
        coord = typeof CITY_COORDS !== 'undefined' ? CITY_COORDS['海外'] : null;
      } else {
        coord = typeof getCityCoord === 'function' ? getCityCoord(city) : null;
      }

      if (!coord) return;

      // 为这个城市生成飞向终点的稳定航线，并开启飞行动画
      linesData.push({
        coords: [coord, TARGET_POINT.coord],
        lineStyle: {
          curveness: coord[0] < 110 ? 0.3 : (coord[1] < 30 ? -0.2 : 0.2)
        }
      });

      // 国内城市则直接在地图上放置对应的标记原点以及该城市的已报到总人数
      if (city !== '海外') {
        scatterData.push({
          name: city,
          value: [coord[0], coord[1], cityCountMap[city]]
        });
      }
    });

    mapChart.setOption({
      series: [
        {}, // 第[0]组数据保留目标 DAO 龙潭标志不变
        { data: linesData },
        { data: scatterData }
      ]
    });
  }

  function updateStats() {
    animateNumberBig(totalNomadsEl, totalCount);
  }

  function animateNumberBig(el, target) {
    var currentStr = el.textContent.replace(/,/g, '');
    var current = parseInt(currentStr) || 0;
    if (current === target) return;
    var diff = target - current;
    var steps = 20;
    var step = Math.max(1, Math.floor(diff / steps));
    var count = 0;
    var timer = setInterval(function () {
      count++;
      current += step;
      if (count >= steps || current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = current.toLocaleString();
    }, 40);
  }

  function updateTopList() {
    var sorted = Object.keys(cityCountMap)
      .map(function (city) { return { city: city, count: cityCountMap[city] }; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 7);

    var listEl = document.getElementById('top-list');
    var html = '';
    for (var i = 0; i < sorted.length; i++) {
      html += '<li class="top-item">'
        + '<span class="rank">' + (i + 1) + '</span>'
        + '<span class="city">' + sorted[i].city + '</span>'
        + '<span class="count">' + sorted[i].count.toLocaleString() + '</span>'
        + '</li>';
    }
    listEl.innerHTML = html;
  }

  function initPieCharts() {
    var pieCommon = {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['42%', '50%'],
        itemStyle: { borderRadius: 4, borderColor: '#463d35', borderWidth: 2 },
        avoidLabelOverlap: false,
        label: {
          show: false,
          color: '#fff2d7',
          fontSize: 15,
          fontWeight: 700,
          formatter: '{b}'
        },
        labelLayout: {
          hideOverlap: false
        },
        labelLine: { show: false, lineStyle: { color: 'rgba(205, 182, 147, 0.4)' }, smooth: 0.2, length: 8, length2: 10 },
        emphasis: { scale: true, scaleSize: 12 },
        data: []
      }]
    };
    occChart.setOption(pieCommon);
    var ageCommon = JSON.parse(JSON.stringify(pieCommon));
    ageCommon.series[0].radius = ['0%', '70%'];
    ageChart.setOption(ageCommon);
  }

  var pieColors = ['#c88461', '#cdb693', '#7ec8aa', '#64a0cd', '#eab35f', '#b094c4', '#d8869c', '#a5c05c'];
  function renderPieHighlight(chart, data, colors, radius, highlightIdx) {
    if (!data || data.length === 0) {
      chart.setOption({ color: colors, series: [{ radius: radius, data: [] }] });
      return;
    }

    var idx = highlightIdx % data.length;
    var styledData = data.map(function (item, i) {
      var active = i === idx;
      return {
        name: item.name,
        value: item.value,
        label: {
          show: active,
          formatter: '{b}',
          color: '#fff2d7',
          fontSize: active ? 16 : 14,
          fontWeight: 700
        },
        labelLine: {
          show: active,
          lineStyle: { color: 'rgba(205, 182, 147, 0.7)' },
          length: 8,
          length2: 10
        },
        itemStyle: {
          opacity: active ? 1 : 0.78
        }
      };
    });

    chart.setOption({
      color: colors,
      series: [{
        radius: radius,
        data: styledData
      }]
    });
  }

  function startPieHighlightLoop() {
    if (!occHighlightTimer) {
      occHighlightTimer = setInterval(function () {
        if (occDataCache.length === 0) return;
        occHighlightIdx = (occHighlightIdx + 1) % occDataCache.length;
        renderPieHighlight(occChart, occDataCache, pieColors, ['35%', '65%'], occHighlightIdx);
      }, PIE_HIGHLIGHT_INTERVAL);
    }

    if (!ageHighlightTimer) {
      ageHighlightTimer = setInterval(function () {
        if (ageDataCache.length === 0) return;
        ageHighlightIdx = (ageHighlightIdx + 1) % ageDataCache.length;
        renderPieHighlight(ageChart, ageDataCache, pieColors.slice().reverse(), ['0%', '70%'], ageHighlightIdx);
      }, PIE_HIGHLIGHT_INTERVAL);
    }
  }

  function updatePieCharts() {
    occDataCache = Object.keys(occupationMap).map(function (k) { return { name: k, value: occupationMap[k] }; });
    ageDataCache = Object.keys(ageMap).map(function (k) { return { name: k, value: ageMap[k] }; });

    if (occDataCache.length > 0) occHighlightIdx = occHighlightIdx % occDataCache.length;
    if (ageDataCache.length > 0) ageHighlightIdx = ageHighlightIdx % ageDataCache.length;

    renderPieHighlight(occChart, occDataCache, pieColors, ['30%', '56%'], occHighlightIdx);
    renderPieHighlight(ageChart, ageDataCache, pieColors.slice().reverse(), ['0%', '62%'], ageHighlightIdx);
    startPieHighlightLoop();
  }

  // ============ DOM 渲染 ============
  function getDefaultAvatar() {
    return "data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'%3E%3Cpath fill=\\'%23888\\' d=\\'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\\'/%3E%3C/svg%3E";
  }

  // 右侧加入列表
  function renderJoinList(items) {
    var listEl = document.getElementById('join-list');
    var html = '';
    items.forEach(function (item) {
      html += createJoinItemHtml(item);
    });
    listEl.innerHTML = html;
    stackIndex = 0;
    updateStack();
  }

  function prependNewJoin(items) {
    var listEl = document.getElementById('join-list');
    if (!listEl) return;
    var total = listEl.children.length;

    var fragment = document.createDocumentFragment();
    var temp = document.createElement('div');
    items.forEach(function (item) { temp.innerHTML += createJoinItemHtml(item); });

    var insertIdx = stackIndex % (total || 1);
    var refNode = listEl.children[insertIdx] || null;
    while (temp.firstElementChild) {
      listEl.insertBefore(temp.firstElementChild, refNode);
    }

    updateStack();
  }

  function createJoinItemHtml(item) {
    var avatar = item.avatar || getDefaultAvatar();
    var name = item.name || item.nickname || '游民';
    return '<li class="join-item">' +
      '<img class="join-avatar" src="' + avatar + '"/>' +
      '<div class="join-info">' +
      '<div class="join-name">' + name + '</div>' +
      '<div class="join-desc">加入DAO龙潭</div>' +
      '</div>' +
      '</li>';
  }

  // ============ 全屏弹幕 ============
  var DANMAKU_API_URL = 'https://daolongtan.cn/daolongtan/openapi/danmaku/list';
  var DANMAKU_RECENT_API_URL = 'http://47.115.206.35:48080/daolongtan/openapi/danmaku/recent';
  var DANMAKU_BASE_LIMIT = 50;
  var danmakuBaseList = [];
  var danmakuBaseIndex = 0;
  var danmakuPriorityQueue = [];
  var danmakuTimer = null;
  var DANMAKU_INTERVAL = 4500;
  var DANMAKU_TRACKS = 6;
  var danmakuTrackBusy = [];
  for (var _t = 0; _t < DANMAKU_TRACKS; _t++) danmakuTrackBusy[_t] = false;

  function pollDanmaku() {
    fetch(DANMAKU_API_URL, {
      headers: { 'tenant-id': '1' }
    })
      .then(function (res) { return res.json(); })
      .then(function (res) {
        if (res.code === 200 || res.code === 0) {
          var items = (res.data || []).slice(0, DANMAKU_BASE_LIMIT);
          startDanmakuLoop(items);
        }
      })
      .catch(function (err) {
        console.error('弹幕请求失败:', err);
      });
  }

  function pollRecentDanmaku() {
    fetch(DANMAKU_RECENT_API_URL, {
      headers: { 'tenant-id': '1' }
    })
      .then(function (res) { return res.json(); })
      .then(function (res) {
        if (res.code === 200 || res.code === 0) {
          var items = res.data || [];
          if (items.length > 0) {
            // recent 弹幕优先展示：插队到最前
            danmakuPriorityQueue = items.concat(danmakuPriorityQueue);
          }
        }
      })
      .catch(function (err) {
        console.error('最新弹幕请求失败:', err);
      });
  }

  function startDanmakuLoop(items) {
    danmakuBaseList = items.slice(0, DANMAKU_BASE_LIMIT);
    danmakuBaseIndex = 0;
    if (danmakuTimer) return;
    danmakuTimer = setInterval(fireDanmaku, DANMAKU_INTERVAL);
    fireDanmaku();
  }

  function pickTrack() {
    var free = [];
    for (var i = 0; i < DANMAKU_TRACKS; i++) {
      if (!danmakuTrackBusy[i]) free.push(i);
    }
    if (free.length === 0) return -1;
    return free[Math.floor(Math.random() * free.length)];
  }

  function fireDanmaku() {
    var track = pickTrack();
    if (track === -1) return;

    var containerEl = document.getElementById('danmaku-container');
    if (!containerEl) return;

    var item = null;
    if (danmakuPriorityQueue.length > 0) {
      item = danmakuPriorityQueue.shift();
    } else if (danmakuBaseList.length > 0) {
      item = danmakuBaseList[danmakuBaseIndex];
      danmakuBaseIndex = (danmakuBaseIndex + 1) % danmakuBaseList.length;
    }
    if (!item) return;

    var avatar = item.avatar || getDefaultAvatar();
    var text = item.content || '...';
    var nameHtml = item.nickname ? '<span style="opacity:0.75;margin-right:6px;">' + item.nickname + ':</span>' : '';

    var el = document.createElement('div');
    el.className = 'danmaku-item';

    var containerH = containerEl.offsetHeight;
    var trackH = containerH / DANMAKU_TRACKS;
    var topPx = track * trackH + trackH * 0.15;
    el.style.top = topPx + 'px';

    var speed = 12 + Math.random() * 6;
    el.style.animationDuration = speed + 's';

    el.innerHTML =
      '<img class="danmaku-avatar" src="' + avatar + '" />' +
      '<span class="danmaku-text">' + nameHtml + text + '</span>';

    containerEl.appendChild(el);
    danmakuTrackBusy[track] = true;

    setTimeout(function () {
      danmakuTrackBusy[track] = false;
    }, 3000);

    el.addEventListener('animationend', function () {
      el.remove();
    });
  }

  window.addEventListener('resize', function () {
    mapChart.resize();
    occChart.resize();
    ageChart.resize();
    setTimeout(updateOverseasCoord, 300);
  });
})();
