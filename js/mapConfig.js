/**
 * ECharts 地图配置生成器 - 严格依据设计图配色
 */

// 目标地点：DAO龙潭 (福建省宁德市屏南县熙岭乡)
var TARGET_POINT = {
  name: 'DAO龙潭',
  coord: [119.05038, 26.81519] // 龙潭村确切坐标
};

/**
 * 生成地图基础配置
 */
function createMapOption() {
  return {
    backgroundColor: 'transparent',
    geo: [
      // 底层 - 产生阴影厚度感与白色边缘
      {
        map: 'china',
        roam: false,
        zoom: 1.21,
        center: [104.5, 36.5],
        zlevel: 1,
        silent: true,
        itemStyle: {
          areaColor: '#f8f4ec', // 乳白色3D边缘厚度
          borderColor: '#f8f4ec',
          borderWidth: 2,
          shadowColor: 'rgba(0, 0, 0, 0.25)', // 底部投射的阴影
          shadowBlur: 20,
          shadowOffsetX: 2,
          shadowOffsetY: 15
        }
      },
      // 顶层 - 实际地图面
      {
        map: 'china',
        roam: false,
        zoom: 1.21,
        center: [104.5, 36.5],
        zlevel: 2,
        label: {
          show: false
        },
        emphasis: {
          disabled: true
        },
        itemStyle: {
          areaColor: '#ddd0b8', // 默认垫背浅色
          borderColor: 'rgba(255, 255, 255, 0.4)', // 区划白线
          borderWidth: 1
        },
        regions: buildRegionStyles()
      }
    ],
    series: [
      // 目标地点 - DAO龙潭 图标标签
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 6,
        rippleEffect: {
          show: true,
          brushType: 'stroke',
          scale: 4,
          period: 3
        },
        itemStyle: {
          color: '#34d4f8', // 水蓝色的中心点和波纹
          shadowBlur: 10,
          shadowColor: '#34d4f8'
        },
        symbol: 'circle', 
        symbolSize: 8, // 放开隐藏的点，让它展示发光源
        label: {
          show: true,
          position: 'right', // 根据图示，标签在终点偏右侧
          formatter: [
            '{icon|} {title|{b}}' // 使用 rich 文本构建带有 icon 的绿色胶囊
          ].join('\n'),
          rich: {
            icon: {
              // 完整重绘带有绿色底色、高亮荧光边框和白色房子的复合 SVG
              backgroundColor: {
                image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect x='1.5' y='1.5' width='29' height='29' rx='8' fill='%2348884c' stroke='%23bfff43' stroke-width='3'/%3E%3Cpath fill='%23ffffff' d='M8 12 H24 V16 H8 Z M12 8 H20 V12 H12 Z M6 16 H26 V18 H6 Z M10 18 H14 V26 H10 Z M18 18 H22 V26 H18 Z M8 26 H24 V28 H8 Z'/%3E%3C/svg%3E"
              },
              width: 26,
              height: 26,
              align: 'center'
            },
            title: {
              color: '#333333',
              fontSize: 15,
              fontWeight: 600,
              padding: [0, 8, 0, 6]
            }
          },
          backgroundColor: '#dee1de', // 准确的浅灰底 backgroundColor
          padding: [3, 4, 3, 3], // T R B L 胶囊内衬
          borderRadius: 20,
          distance: 4, 
          shadowColor: 'rgba(0,0,0,0.15)',
          shadowBlur: 6,
          shadowOffsetY: 3
        },
        data: [{
          name: TARGET_POINT.name,
          value: TARGET_POINT.coord
        }]
      },
      // 飞线 (动态添加)
      {
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 4,
        effect: {
          show: true,
          period: 4,
          trailLength: 0.1,
          symbol: 'path://M1705.06,1318.313v-89.254l-319.9-221.799l0.073-208.063c0.521-84.662-26.629-121.796-63.961-121.491c-37.332-0.305-64.482,36.829-63.961,121.491l0.073,208.063l-319.9,221.799v89.254l330.343-157.288l12.238,241.308l-134.449,92.931l0.531,42.034l175.125-42.917l175.125,42.917l0.531-42.034l-134.449-92.931l12.238-241.308L1705.06,1318.313z',
          symbolSize: 12, // 小飞机的合适大小
          color: '#ffffff', 
          loop: true
        },
        lineStyle: {
          color: '#34d4f8', // 亮水蓝色
          width: 1.5,
          curveness: 0.25,
          opacity: 0.75
        },
        data: []
      },
      // 出发地光点和地名 (动态添加)
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 5,
        rippleEffect: {
          show: false // 不发光，只是实心黑点
        },
        symbol: 'circle',
        symbolSize: function (val) {
          var count = (val && val[2]) ? val[2] : 1;
          return Math.max(7, Math.min(20, 5 + Math.sqrt(count) * 2.2));
        },
        itemStyle: {
          color: '#00f5ff', // 高亮青色，和棕色底对比更强
          shadowBlur: 10,
          shadowColor: 'rgba(0, 245, 255, 0.8)'
        },
        label: {
          show: true,
          formatter: function(params) { return params.name + ' ' + params.value[2]; },
          position: 'bottom',
          color: '#ffffff', // 亮白文字
          textBorderColor: '#1f140a', // 深褐描边，提升可读性
          textBorderWidth: 3,
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 20,
          distance: 8
        },
        labelLayout: {
          hideOverlap: true,
          moveOverlap: 'shiftY'
        },
        data: []
      },
      // 系列 [3]: 实时飞线 (新加入时触发)
      {
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 10, // 置于最顶层
        effect: {
          show: true,
          period: 2, // 速度更快
          trailLength: 0.2,
          symbol: 'path://M1705.06,1318.313v-89.254l-319.9-221.799l0.073-208.063c0.521-84.662-26.629-121.796-63.961-121.491c-37.332-0.305-64.482,36.829-63.961,121.491l0.073,208.063l-319.9,221.799v89.254l330.343-157.288l12.238,241.308l-134.449,92.931l0.531,42.034l175.125-42.917l175.125,42.917l0.531-42.034l-134.449-92.931l12.238-241.308L1705.06,1318.313z',
          symbolSize: 15,
          color: '#ffeb3b', // 金色飞机
          loop: true
        },
        lineStyle: {
          color: '#ffeb3b',
          width: 2,
          opacity: 0.8,
          curveness: 0.3
        },
        data: []
      },
      // 系列 [4]: 实时高亮出发点
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 11,
        rippleEffect: {
          show: true,
          brushType: 'fill',
          scale: 6,
          period: 2
        },
        symbol: 'circle',
        symbolSize: 12,
        itemStyle: {
          color: '#ffeb3b',
          shadowBlur: 15,
          shadowColor: '#ffeb3b'
        },
        label: {
          show: true,
          formatter: '{b}',
          position: 'top',
          color: '#ffeb3b',
          fontSize: 18,
          fontWeight: 'bold',
          textBorderColor: '#000',
          textBorderWidth: 2
        },
        data: []
      }
    ]
  };
}

/**
 * 区域特殊样式（严格还原设计稿中各省色块分配）
 */
function buildRegionStyles() {
  const regions = [];
  
  // 严格从设计图吸取的实色列表
  const colorMap = {
    // A: 浅灰白 (如四川、西藏、黑龙江等)
    '四川': '#e6e7e1', '西藏': '#e6e7e1', '黑龙江': '#e6e7e1',
    '北京': '#e6e7e1', '上海': '#e6e7e1', '宁夏': '#e6e7e1',

    // B: 浅米黄 (如新疆、内蒙古、云南等)
    '新疆': '#ddd0b8', '云南': '#ddd0b8', '广西': '#ddd0b8',
    '内蒙古': '#ddd0b8', '甘肃': '#ddd0b8', '吉林': '#ddd0b8',
    '天津': '#ddd0b8',

    // C: 浅卡其 (如青海、广东、河南等)
    '青海': '#cdbb9e', '广东': '#cdbb9e', '河南': '#cdbb9e',
    '重庆': '#cdbb9e', '辽宁': '#cdbb9e', '陕西': '#cdbb9e',
    '海南': '#cdbb9e', '台湾': '#cdbb9e', '香港': '#cdbb9e', '澳门': '#cdbb9e',

    // D: 中黄褐 (如贵州、山西等)
    '贵州': '#b89467', '山西': '#b89467', '浙江': '#b89467',
    '河北': '#b89467',

    // E: 深黄土 (如湖北、江苏等)
    '湖北': '#a37545', '江苏': '#a37545', '江西': '#a37545',
    '福建': '#a37545',

    // F: 最深焦糖/暗咖 (如湖南、安徽等)
    '湖南': '#8c5d31', '安徽': '#8c5d31', '山东': '#8c5d31'
  };
  
  Object.keys(colorMap).forEach(p => {
    regions.push({
      name: p,
      itemStyle: {
        areaColor: colorMap[p]
      }
    });
  });

  return regions;
}

/**
 * 根据数据生成飞线和出发地黑点
 */
function buildFlightData(dataList) {
  var linesData = [];
  var scatterData = [];

  for (var i = 0; i < dataList.length; i++) {
    var item = dataList[i];
    var fromCoord = getCityCoord(item.from);
    if (!fromCoord) continue;

    // 添加飞线
    linesData.push({
      coords: [fromCoord, TARGET_POINT.coord],
      // 为了好看，给从西部飞来的线和南北飞来的线适当分配不同的曲率符号
      lineStyle: {
        curveness: fromCoord[0] < 110 ? 0.3 : (fromCoord[1] < 30 ? -0.2 : 0.2)
      }
    });

    // 只有非“海外”的数据点才在地图上画出带汉字的黑点（海外的话是在 DOM 处，不一定在地图内）
    if (item.from !== '海外') {
      scatterData.push({
        name: item.from,
        value: [fromCoord[0], fromCoord[1], item.value] // 把数值存入第三的维度供label显示
      });
    }
  }

  return {
    linesData: linesData,
    scatterData: scatterData
  };
}
