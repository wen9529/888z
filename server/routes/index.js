const express = require('express');
const router = express.Router();
const game = require('../game'); // 引入游戏逻辑

// 游戏主页
router.get('/', (req, res) => {
  res.render('index'); // 渲染游戏主页模板
});

// 开始新游戏
router.post('/start', (req, res) => {
  const numPlayers = req.body.numPlayers || 4;
  try {
    const deck = game.createDeck();
    const shuffledDeck = game.shuffleDeck(deck);
    const hands = game.dealCards(shuffledDeck, numPlayers);
    res.json({ success: true, hands: hands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// TODO: 添加其他游戏相关的路由，例如：
// router.post('/play', (req, res) => { ... }); // 玩家出牌
// router.post('/compare', (req, res) => { ... }); // 比牌

module.exports = router;
