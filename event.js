/**
 * 随机事件池 v3.0：通用事件 + 每种宠物的专属事件
 * effect: stats 为属性增减，coins 为金币增减
 */
window.EventPool = {
  // 通用事件池（正面 6 / 负面 4 / 中性 2）
  events: [
    /* ---------- 正面事件 ---------- */
    {
      id: 'redPacket', type: 'positive', emoji: '🧧', title: '意外红包',
      desc: '你在宠物垫下发现了一个小红包，拆开全是金币！',
      effect: { coins: 30 }
    },
    {
      id: 'luxuryMeal', type: 'positive', emoji: '🍲', title: '营养大餐',
      desc: '邻居送来了一份豪华营养餐，它吃得头都不抬。',
      effect: { stats: { fullness: 25, health: 15 } }
    },
    {
      id: 'playDay', type: 'positive', emoji: '🎈', title: '陪玩时光',
      desc: '你陪它疯玩了一整天，它开心得转圈圈。',
      effect: { stats: { happiness: 30 } }
    },
    {
      id: 'bathSpa', type: 'positive', emoji: '🛁', title: '泡泡浴',
      desc: '洗得香喷喷，还顺便做了个SPA。',
      effect: { stats: { cleanliness: 35, happiness: 10 } }
    },
    {
      id: 'grooming', type: 'positive', emoji: '💈', title: '精致造型',
      desc: '宠物店帮它做了新造型，走在路上都神气起来了。',
      effect: { stats: { happiness: 20, cleanliness: 20, health: 10 } }
    },
    {
      id: 'growthGift', type: 'positive', emoji: '🌟', title: '成长礼包',
      desc: '它长大了一点点，还悄悄送了你一份礼物。',
      effect: { stats: { health: 20, fullness: 15, happiness: 15 }, coins: 20 }
    },
    /* ---------- 负面事件 ---------- */
    {
      id: 'badStomach', type: 'negative', emoji: '🤢', title: '吃坏肚子',
      desc: '它乱吃了东西，肚子咕噜咕噜不太舒服。',
      effect: { stats: { health: -15, fullness: -10 } }
    },
    {
      id: 'fleas', type: 'negative', emoji: '🐛', title: '长了跳蚤',
      desc: '身上痒痒的，它一直挠个不停。',
      effect: { stats: { cleanliness: -30, happiness: -10 } }
    },
    {
      id: 'nightmare', type: 'negative', emoji: '🌙', title: '做噩梦',
      desc: '半夜惊醒了，缩成一团不肯出来。',
      effect: { stats: { happiness: -20, health: -8 } }
    },
    {
      id: 'toyBroken', type: 'negative', emoji: '🧸', title: '玩具坏了',
      desc: '最喜欢的玩具被咬坏了，它难过了好一阵子。',
      effect: { stats: { happiness: -15, health: -5 }, coins: -10 }
    },
    /* ---------- 中性事件 ---------- */
    {
      id: 'visitor', type: 'neutral', emoji: '🚪', title: '有人来访',
      desc: '客人路过，宠物好奇地盯着门口看了半天。',
      effect: { stats: { happiness: 5 } }
    },
    {
      id: 'weather', type: 'neutral', emoji: '🌤', title: '天气变化',
      desc: '今天天气不错，它在窗边发了好一会儿呆。',
      effect: { stats: { happiness: 3 } }
    }
  ],
  // 专属事件池：按宠物 id 索引
  petEvents: {
    cat: [
      {
        id: 'catYarn', type: 'positive', emoji: '🧶', title: '毛线球大战',
        desc: '它和毛线球战斗了半小时，赢得很得意。',
        effect: { stats: { happiness: 20, fullness: -5 } }
      },
      {
        id: 'catNeighbor', type: 'neutral', emoji: '😺', title: '隔壁来客',
        desc: '邻居家的猫在窗边和它对视了一下午。',
        effect: { stats: { happiness: 15 } }
      }
    ],
    dog: [
      {
        id: 'dogFrisbee', type: 'positive', emoji: '🥏', title: '飞盘狂飙',
        desc: '它叼着飞盘跑了一下午，开心得汪汪叫。',
        effect: { stats: { happiness: 25, fullness: -10, health: -5 } }
      },
      {
        id: 'dogBone', type: 'positive', emoji: '🦴', title: '大骨头',
        desc: '啃到一根大骨头，它满足地眯起眼睛。',
        effect: { stats: { fullness: 30, happiness: 10 } }
      }
    ],
    turtle: [
      {
        id: 'turtleSun', type: 'positive', emoji: '🌿', title: '晒太阳',
        desc: '甲壳晒得暖暖的，它一动不动享受了半小时。',
        effect: { stats: { health: 15, happiness: 10 } }
      },
      {
        id: 'turtleMeditate', type: 'neutral', emoji: '🪸', title: '缩壳冥想',
        desc: '它缩进壳里冥想了很久，似乎想通了什么。',
        effect: { stats: { health: 10, happiness: 15 } }
      }
    ],
    parrot: [
      {
        id: 'parrotTalk', type: 'positive', emoji: '🎤', title: '学说话',
        desc: '它学会了一句新词，反复读了一晚上。',
        effect: { stats: { happiness: 25, health: -5 } }
      },
      {
        id: 'parrotStash', type: 'neutral', emoji: '🌰', title: '藏坚果',
        desc: '它把坚果藏进了沙发缝里，得意洋洋。',
        effect: { stats: { fullness: 20, happiness: 5 } }
      }
    ],
    hamster: [
      {
        id: 'hamsterStash', type: 'positive', emoji: '🌰', title: '囤粮大作战',
        desc: '它把粮食塞满了整个颊囊，开心极了。',
        effect: { stats: { fullness: 25, cleanliness: -15 } }
      },
      {
        id: 'hamsterWheel', type: 'positive', emoji: '🏃', title: '滚轮马拉松',
        desc: '在滚轮上跑了三千圈，活力满满。',
        effect: { stats: { happiness: 20, fullness: -15, health: 5 } }
      }
    ],
    rabbit: [
      {
        id: 'rabbitCabbage', type: 'positive', emoji: '🥬', title: '啃生菜',
        desc: '咔嚓咔嚓，一整棵生菜被它吃光了。',
        effect: { stats: { fullness: 25, happiness: 10 } }
      },
      {
        id: 'rabbitJump', type: 'positive', emoji: '🦘', title: '蹦跳训练',
        desc: '它跳得比昨天更高，肌肉也更结实了。',
        effect: { stats: { happiness: 20, health: 10, fullness: -10 } }
      }
    ],
    gecko: [
      {
        id: 'geckoNight', type: 'neutral', emoji: '🌙', title: '守宫夜行',
        desc: '夜幕降临，它贴着墙开始了夜间巡逻。',
        effect: { stats: { happiness: 15, health: 10 } }
      },
      {
        id: 'geckoHunt', type: 'positive', emoji: '🦟', title: '捕食虫子',
        desc: '它精准地捕到了虫子，露出了得意的表情。',
        effect: { stats: { happiness: 20, fullness: 10, cleanliness: -10 } }
      }
    ],
    fish: [
      {
        id: 'fishBubbles', type: 'positive', emoji: '🫧', title: '吐泡泡',
        desc: '它吐出一串小泡泡，把你逗笑了。',
        effect: { stats: { happiness: 15, cleanliness: 15 } }
      },
      {
        id: 'fishDirty', type: 'negative', emoji: '🌊', title: '水质变差',
        desc: '鱼缸的水有点浑浊，它不太舒服。',
        effect: { stats: { cleanliness: -30, health: -10 } }
      }
    ]
  },
  // 随机抽取事件：60% 概率命中专属事件池
  random: function (petId) {
    var own = this.petEvents[petId];
    if (own && own.length && Math.random() < 0.6) {
      return own[Math.floor(Math.random() * own.length)];
    }
    return this.events[Math.floor(Math.random() * this.events.length)];
  }
};
