const express = require('express');
const router = express.Router();
const game = require('../game'); // 引入游戏逻辑

// 游戏主页
router.get('/', (req, res) => {
  res.render('index'); // 渲染游戏主页模板
});

// 开始新游戏（示例路由）
router.post('/start', (req, res) => {
  const numPlayers = req.body.numPlayers || 4; // 获取玩家数量
  const deck = game.shuffleCards();
  const hands = game.dealCards(deck, numPlayers);
  res.json({ success: true, hands: hands });
});

// 玩家出牌（示例路由）
router.post('/play', (req, res) => {
  const playerId = req.body.playerId;
  const cards = req.body.cards; // 玩家出的牌
  // ... 处理玩家出牌逻辑
  res.json({ success: true, message: "牌已出" });
});

// 更多游戏相关的路由...

module.exports = router;
