/**
 * 道具配置 v3.0：消耗品 / 永久道具 / 装饰
 */
window.ItemConfig = {
  consumables: [
    { id: 'food', emoji: '🍖', name: '普通饲料', price: 5, desc: '饱腹 +15', effect: { fullness: 15 } },
    { id: 'foodPro', emoji: '🍱', name: '高级饲料', price: 15, desc: '饱腹 +40', effect: { fullness: 40 } },
    { id: 'cleanSet', emoji: '🧼', name: '清洁套装', price: 15, desc: '清洁 +50', effect: { cleanliness: 50 } },
    { id: 'medicine', emoji: '💊', name: '治疗药剂', price: 40, desc: '健康 +50', effect: { health: 50 } }
  ],
  props: [
    {
      id: 'autoFeeder', emoji: '🤖', name: '自动喂食器', price: 299,
      desc: '饱腹低于 30 时自动喂食，每天限 3 次', tag: '自动'
    },
    {
      id: 'warmNest', emoji: '🛏️', name: '恒温窝', price: 249,
      desc: '健康度衰减减缓 25%', tag: '被动'
    },
    {
      id: 'funToy', emoji: '🧸', name: '逗乐玩具', price: 149,
      desc: '玩耍操作效果提升 50%', tag: '被动'
    },
    {
      id: 'purifier', emoji: '💧', name: '净水装置', price: 199,
      desc: '清洁度衰减减缓 20%', tag: '被动'
    }
  ],
  // 装饰仅改变外观，不影响属性
  decorations: [
    { id: 'hat1', emoji: '🎩', name: '小礼帽', slot: 'hat', price: 60, desc: '帽子' },
    { id: 'hat2', emoji: '👑', name: '小皇冠', slot: 'hat', price: 120, desc: '帽子' },
    { id: 'scarf1', emoji: '🧣', name: '毛线围巾', slot: 'scarf', price: 80, desc: '围巾' },
    { id: 'scarf2', emoji: '🎀', name: '蝴蝶结', slot: 'scarf', price: 70, desc: '围巾' },
    { id: 'glass1', emoji: '🕶️', name: '酷墨镜', slot: 'glasses', price: 90, desc: '眼镜' },
    { id: 'glass2', emoji: '👓', name: '圆框眼镜', slot: 'glasses', price: 75, desc: '眼镜' },
    { id: 'bg1', emoji: '🌈', name: '彩虹背景', slot: 'background', price: 150, desc: '背景' },
    { id: 'bg2', emoji: '🌸', name: '樱花背景', slot: 'background', price: 130, desc: '背景' },
    { id: 'bg3', emoji: '✨', name: '星空背景', slot: 'background', price: 180, desc: '背景' }
  ],
  slots: [
    { id: 'hat', label: '帽子' },
    { id: 'scarf', label: '围巾' },
    { id: 'glasses', label: '眼镜' },
    { id: 'background', label: '背景' }
  ],
  getConsumable: function (id) {
    for (var i = 0; i < this.consumables.length; i++) {
      if (this.consumables[i].id === id) return this.consumables[i];
    }
    return null;
  },
  getProp: function (id) {
    for (var i = 0; i < this.props.length; i++) {
      if (this.props[i].id === id) return this.props[i];
    }
    return null;
  },
  getDecoration: function (id) {
    for (var i = 0; i < this.decorations.length; i++) {
      if (this.decorations[i].id === id) return this.decorations[i];
    }
    return null;
  }
};
