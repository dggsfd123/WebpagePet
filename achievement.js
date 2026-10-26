/**
 * 成就配置 v3.0：达成条件自动检测并解锁
 * check(state, ctx) 返回 true 表示达成
 */
window.Achievements = {
  list: [
    {
      id: 'firstAdopt', emoji: '🏠', name: '初次领养',
      desc: '完成第一次领养',
      check: function (state) { return !!state.adopted; }
    },
    {
      id: 'survive7', emoji: '📅', name: '七日存活',
      desc: '累计存活 7 天',
      check: function (state, ctx) { return ctx.aliveDays >= 7; }
    },
    {
      id: 'centenarian', emoji: '🎂', name: '百日寿星',
      desc: '累计存活 100 天',
      check: function (state, ctx) { return ctx.aliveDays >= 100; }
    },
    {
      id: 'spendthrift', emoji: '💰', name: '千金散尽',
      desc: '累计获得 1000 金币',
      check: function (state) { return (state.totalCoinsEarned || 0) >= 1000; }
    },
    {
      id: 'shopper', emoji: '🛍️', name: '购物达人',
      desc: '累计购买 10 次商品',
      check: function (state) { return (state.purchaseCount || 0) >= 10; }
    },
    {
      id: 'collector', emoji: '🐾', name: '全宠物收藏家',
      desc: '集齐全部 8 种宠物',
      check: function (state) { return (state.ownedPets || []).length >= window.PetConfig.pets.length; }
    }
  ],
  get: function (id) {
    for (var i = 0; i < this.list.length; i++) {
      if (this.list[i].id === id) return this.list[i];
    }
    return null;
  },
  isUnlocked: function (state, id) {
    return (state.achievements || []).indexOf(id) > -1;
  }
};
