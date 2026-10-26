/**
 * 成长阶段配置 v3.0：按累计在线时长（每 24 小时 = 1 天）计算年龄
 * 幼年(0-7) → 成年(8-30) → 老年(31+)
 */
window.Growth = {
  stages: [
    {
      id: 'baby', name: '幼年', emoji: '🌱', minDay: 0, maxDay: 7,
      cap: 90,        // 属性上限
      decayMul: 1.1,  // 衰减快 10%
      healthMul: 1.0, // 健康额外倍率
      coinBonus: 0,   // 金币奖励加成
      scale: 0.78,    // 体型缩小
      filter: 'saturate(1.18) brightness(1.04)'
    },
    {
      id: 'adult', name: '成年', emoji: '🌳', minDay: 8, maxDay: 30,
      cap: 100, decayMul: 1.0, healthMul: 1.0, coinBonus: 0,
      scale: 1.0, filter: 'none'
    },
    {
      id: 'old', name: '老年', emoji: '🍂', minDay: 31, maxDay: 99999,
      cap: 100, decayMul: 1.0, healthMul: 1.3, // 健康衰减快 30%
      coinBonus: 0.2,                            // 金币奖励 +20%
      scale: 1.2, filter: 'sepia(.32) saturate(.92)'
    }
  ],
  // 依据年龄天数取成长阶段
  getStage: function (day) {
    var d = day || 0;
    for (var i = 0; i < this.stages.length; i++) {
      if (d >= this.stages[i].minDay && d <= this.stages[i].maxDay) return this.stages[i];
    }
    return this.stages[this.stages.length - 1];
  },
  // 年龄天数 = 累计在线时长 / 24 小时
  ageDays: function (state) {
    return Math.floor((state.onlineMs || 0) / 86400000);
  },
  // 当前阶段（结合存档状态）
  current: function (state) {
    return this.getStage(this.ageDays(state));
  }
};
