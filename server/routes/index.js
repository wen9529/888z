const express = require('express');
const router = express.Router();
const game = require('../game'); // 引入游戏逻辑

// 存储每个玩家整理好的手牌 (临时存储)
const arrangedHands = {};
let playersReady = 0;
let totalPlayers = 0;

// 游戏主页
router.get('/', (req, res) => {
  res.render('index'); // 渲染游戏主页模板
});

// 开始新游戏
router.post('/start', (req, res) => {
  totalPlayers = req.body.numPlayers || 4;
  playersReady = 0;
  // 清空之前的数据
  for(const playerId in arrangedHands) {
      delete arrangedHands[playerId];
  }

  try {
    const deck = game.createDeck();
    const shuffledDeck = game.shuffleDeck(deck);
    const hands = game.dealCards(shuffledDeck, totalPlayers);

    // 将发好的手牌存储起来，等待玩家整理
    // 这里的存储方式需要根据您的实际应用场景调整，
    // 例如使用 Session 或更复杂的房间管理
    // 简化示例：直接存储在服务器内存中
    const playerIdPrefix = 'player';
    for(let i = 0; i < totalPlayers; i++) {
        arrangedHands[playerIdPrefix + (i + 1)] = { originalHand: hands[i], arranged: false };
    }

    // 将发好的手牌返回给客户端 (只返回自己的手牌)
    // 在实际应用中，您需要一种方式区分玩家，例如使用用户ID或 WebSocket 连接
    res.json({ success: true, hand: hands[0] }); // 假设玩家 1 是自己
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 接收玩家整理好的手牌
router.post('/arrange', (req, res) => {
    const playerId = req.body.playerId; // 玩家标识
    const arrangedHand = req.body.arrangedHand; // 整理好的手牌 { head: [...], middle: [...], tail: [...] }

    if (!arrangedHands[playerId]) {
        return res.status(400).json({ success: false, message: "无效的玩家或游戏已结束" });
    }

    // TODO: 验证 arrangedHand 的格式和牌的数量 (3, 5, 5)

    arrangedHands[playerId].arrangedHand = arrangedHand;
    arrangedHands[playerId].arranged = true;
    playersReady++;

    // 检查所有玩家是否都已整理好手牌
    if (playersReady === totalPlayers) {
        // 所有玩家都已准备好，进行比牌和计分
        const playerResults = [];
        for (const playerId in arrangedHands) {
            playerResults.push({ playerId: playerId, hand: arrangedHands[playerId].arrangedHand });
        }

        const scores = game.compareAndScore(playerResults.map(p => p.hand)); // 提取整理好的手牌进行计分

        // 将比牌结果和得分发送给所有玩家
        // 在实际应用中，这需要通过 WebSocket 或其他方式广播给所有连接的客户端
        // 简化示例：直接返回结果
        const results = playerResults.map((p, index) => ({
            playerId: p.playerId,
            arrangedHand: p.hand,
            score: scores[index]
        }));

        // 清空数据以便开始下一局
        playersReady = 0;
         for(const playerId in arrangedHands) {
             delete arrangedHands[playerId];
         }


        res.json({ success: true, results: results });

    } else {
        res.json({ success: true, message: "等待其他玩家整理手牌" });
    }
});


module.exports = router;
