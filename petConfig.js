/**
 * 宠物配置 v3.0：8 种宠物、专属衰减系数、解锁顺序、装饰锚点
 * 前 4 种初始开放，此后每死亡 1 次解锁 1 种新宠物
 * anchors: 装饰在宠物表情框内的落点（百分比，0 = 表情顶部，100 = 表情底部）
 */
window.PetConfig = {
  baseUnlocked: 4,
  pets: [
    {
      id: 'cat', emoji: '🐱', label: '猫咪', defaultName: '小喵',
      desc: '爱撒娇，清洁需求高',
      factors: { fullness: 0.8, happiness: 1.2, health: 1.0, cleanliness: 1.3 },
      anchors: { hat: 1, glasses: 38, scarf: 78 }, accScale: 1
    },
    {
      id: 'dog', emoji: '🐶', label: '狗狗', defaultName: '豆豆',
      desc: '活力旺，最能吃',
      factors: { fullness: 1.2, happiness: 1.2, health: 1.0, cleanliness: 1.1 },
      anchors: { hat: 1, glasses: 36, scarf: 76 }, accScale: 1
    },
    {
      id: 'turtle', emoji: '🐢', label: '乌龟', defaultName: '小龟',
      desc: '慢悠悠，很省心',
      factors: { fullness: 0.5, happiness: 0.5, health: 0.3, cleanliness: 0.4 },
      anchors: { hat: 12, glasses: 30, scarf: 80 }, accScale: 0.85
    },
    {
      id: 'parrot', emoji: '🦜', label: '鹦鹉', defaultName: '小彩',
      desc: '小话痨，快乐消耗大',
      factors: { fullness: 1.0, happiness: 1.5, health: 1.0, cleanliness: 0.8 },
      anchors: { hat: 2, glasses: 22, scarf: 70 }, accScale: 0.95
    },
    {
      id: 'hamster', emoji: '🐹', label: '仓鼠', defaultName: '花生',
      desc: '贪吃又爱囤粮',
      factors: { fullness: 1.3, happiness: 1.0, health: 0.9, cleanliness: 0.9 },
      anchors: { hat: 4, glasses: 40, scarf: 78 }, accScale: 0.9
    },
    {
      id: 'rabbit', emoji: '🐰', label: '兔子', defaultName: '布丁',
      desc: '蹦得高，体力好',
      factors: { fullness: 1.0, happiness: 1.1, health: 1.1, cleanliness: 1.2 },
      anchors: { hat: 14, glasses: 56, scarf: 84 }, accScale: 0.9
    },
    {
      id: 'gecko', emoji: '🦎', label: '守宫', defaultName: '小蜥',
      desc: '耐旱好养，很省心',
      factors: { fullness: 0.7, happiness: 0.8, health: 0.8, cleanliness: 0.6 },
      anchors: { hat: 8, glasses: 26, scarf: 78 }, accScale: 0.85
    },
    {
      id: 'fish', emoji: '🐟', label: '金鱼', defaultName: '泡泡',
      desc: '爱吐泡泡，怕脏水',
      factors: { fullness: 0.9, happiness: 0.9, health: 0.7, cleanliness: 0.5 },
      anchors: { hat: 14, glasses: 46, scarf: 82 }, accScale: 0.85
    }
  ],
  // 按 id 取宠物配置
  get: function (id) {
    for (var i = 0; i < this.pets.length; i++) {
      if (this.pets[i].id === id) return this.pets[i];
    }
    return this.pets[0];
  },
  // 依据死亡次数计算已解锁的宠物 id 列表
  getUnlockedIds: function (deaths) {
    var count = Math.min(this.pets.length, this.baseUnlocked + (deaths || 0));
    return this.pets.slice(0, count).map(function (p) { return p.id; });
  }
};
