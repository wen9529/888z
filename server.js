const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// 锄大地游戏逻辑
const players = {}; // 存储玩家信息 { socket.id: { id, hand, position } }
let deck = []; // 牌堆
let currentPlayerId = null; // 当前出牌玩家的 socket.id
let currentPlay = []; // 当前桌面上的牌
let playerOrder = []; // 玩家出牌顺序

// 初始化牌堆
function initializeDeck() {
    const suits = ['C', 'D', 'H', 'S'];
    const ranks = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
    deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ rank, suit });
        }
    }
    // 打乱牌堆
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// 发牌
function dealCards() {
    initializeDeck();
    const hands = [[], [], [], []]; // 假设4个玩家
    for (let i = 0; i < deck.length; i++) {
        hands[i % 4].push(deck[i]);
    }
     // 将牌排序 (按点数和花色)
     const rankOrder = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
     const suitOrder = ['C', 'D', 'H', 'S'];
     for (const hand of hands) {
         hand.sort((a, b) => {
              const rankA = rankOrder.indexOf(a.rank);
              const rankB = rankOrder.indexOf(b.rank);
              if (rankA !== rankB) {
                  return rankA - rankB;
              }
              return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
         });
     }
    return hands;
}

// 检查牌型和比较大小 (锄大地核心逻辑，需要完善)
// 返回 true 如果 play 合法且大于 lastPlay，否则返回 false
function isValidAndStronger(play, lastPlay) {
    if (play.length === 0) return false; // 不能出空牌

    // TODO: 实现各种牌型的判断和比较逻辑
    // 示例：简化为只判断单牌大小
    if (play.length === 1 && (lastPlay.length === 0 || lastPlay.length === 1)) {
         const rankOrder = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
         const suitOrder = ['C', 'D', 'H', 'S'];
         const rankA = rankOrder.indexOf(play[0].rank);
         const rankB = lastPlay.length === 1 ? rankOrder.indexOf(lastPlay[0].rank) : -1; // -1 for empty lastPlay

         if (rankA > rankB) return true;
         if (rankA < rankB) return false;
         // 如果点数相同，比较花色
         const suitA = suitOrder.indexOf(play[0].suit);
         const suitB = lastPlay.length === 1 ? suitOrder.indexOf(lastPlay[0].suit) : -1;
         return suitA > suitB;
    }

    // TODO: 添加其他牌型的判断和比较 (对子，三条，顺子，同花，葫芦，四条，同花顺)

    return false; // 默认认为不合法
}


io.on('connection', (socket) => {
  console.log('一个用户连接：', socket.id);

  players[socket.id] = {
    id: socket.id,
    hand: [],
    position: null, // 存储玩家位置 (top, left, right, bottom)
  };

   // 分配座位
   const availablePositions = ['bottom', 'left', 'top', 'right'].filter(pos => !Object.values(players).some(p => p.position === pos)); // 玩家1坐 bottom
   if (availablePositions.length > 0) {
       players[socket.id].position = availablePositions[0];
       socket.emit('seat_assigned', players[socket.id].position);
        // 通知所有玩家有新玩家加入，并发送所有当前玩家信息
       io.emit('player_list_updated', Object.values(players).map(p => ({ id: p.id, position: p.position })));

   } else {
        socket.emit('error', '游戏已满');
        socket.disconnect();
        return;
   }


  socket.on('start_game', () => {
      const playerIds = Object.keys(players);
       if (playerIds.length !== 4) { // 假设需要4个玩家才能开始
            socket.emit('error', '需要4个玩家才能开始游戏');
            return;
       }

      const hands = dealCards();
      let startPlayerId = null; // 第一个出牌的玩家 ID

      playerIds.forEach((id, index) => {
          players[id].hand = hands[index];
          // 找到拥有红桃3的玩家，作为起始玩家
          if (players[id].hand.some(card => card.rank === '3' && card.suit === 'H')) {
              startPlayerId = id;
          }
          io.to(id).emit('your_hand', players[id].hand); // 发送手牌给对应玩家
      });

       playerOrder = playerIds; // 设置玩家出牌顺序
       const startIndex = playerOrder.indexOf(startPlayerId);
       playerOrder = playerOrder.slice(startIndex).concat(playerOrder.slice(0, startIndex)); // 调整顺序，从起始玩家开始

       currentPlayerId = playerOrder[0]; // 设置当前出牌玩家
       currentPlay = []; // 清空桌面上的牌

       io.emit('game_started', {
           startPlayerId: currentPlayerId,
            players: Object.values(players).map(p => ({ id: p.id, position: p.position, handSize: p.hand.length })),
            playerOrder: playerOrder // 发送玩家顺序给客户端
       }); // 通知游戏开始和起始玩家
  });

   socket.on('play_cards', (cards) => {
        if (socket.id !== currentPlayerId) {
            socket.emit('error', '现在不是你的回合');
            return;
        }

        // 检查玩家手牌是否包含要出的牌
        const validPlayInHand = cards.every(card =>
            players[socket.id].hand.some(hCard => hCard.rank === card.rank && hCard.suit === card.suit)
        );

        if (!validPlayInHand) {
            socket.emit('error', '你没有这些牌');
            return;
        }

        // 检查牌型是否合法且大于桌面上的牌
        if (!isValidAndStronger(cards, currentPlay)) {
             socket.emit('error', '出的牌不合法或不够大');
             return;
        }


        // 从玩家手牌中移除出的牌
        for (const card of cards) {
            const index = players[socket.id].hand.findIndex(hCard => hCard.rank === card.rank && hCard.suit === card.suit);
            if (index !== -1) {
                players[socket.id].hand.splice(index, 1);
            }
        }

        currentPlay = cards; // 更新桌面上的牌

        io.emit('cards_played', { playerId: socket.id, play: cards, handSize: players[socket.id].hand.length }); // 通知所有玩家出的牌

        // 检查游戏是否结束 (有玩家手牌出完)
        if (players[socket.id].hand.length === 0) {
             io.emit('game_over', { winnerId: socket.id });
             // TODO: 计算得分等结束逻辑
             resetGame(); // 游戏结束后重置
        } else {
            // 轮到下一个玩家
            const currentIndex = playerOrder.indexOf(currentPlayerId);
            currentPlayerId = playerOrder[(currentIndex + 1) % playerOrder.length];
             io.emit('next_turn', { playerId: currentPlayerId });
        }

   });

    socket.on('pass_turn', () => {
        if (socket.id !== currentPlayerId) {
            socket.emit('error', '现在不是你的回合');
            return;
        }

        // TODO: 实现过牌逻辑，判断是否一轮结束，清空桌面牌
        io.emit('player_passed', { playerId: socket.id }); // 通知玩家过牌

         // 轮到下一个玩家
        const currentIndex = playerOrder.indexOf(currentPlayerId);
        currentPlayerId = playerOrder[(currentIndex + 1) % playerOrder.length];
         io.emit('next_turn', { playerId: currentPlayerId });
    });

    // 重置游戏状态
    function resetGame() {
        currentPlayerId = null;
        currentPlay = [];
        playerOrder = [];
         for (const playerId in players) {
             players[playerId].hand = [];
         }
    }


  socket.on('disconnect', () => {
    console.log('用户断开连接：', socket.id);
     const position = players[socket.id]?.position;
     delete players[socket.id];
     if (position) {
         io.emit('player_left', { id: socket.id, position: position }); // 通知玩家离开
     }
      // 更新玩家列表给所有客户端
     io.emit('player_list_updated', Object.values(players).map(p => ({ id: p.id, position: p.position })));

      // 如果断开连接的是当前玩家，轮到下一个
      if (socket.id === currentPlayerId) {
           const playerIds = Object.keys(players);
           if (playerIds.length > 0) {
                const currentIndex = playerOrder.indexOf(socket.id);
                // 找到断开连接玩家在顺序中的下一个有效玩家
                let nextIndex = (currentIndex + 1) % playerOrder.length;
                 while (!players[playerOrder[nextIndex]] && Object.keys(players).length > 0) {
                      nextIndex = (nextIndex + 1) % playerOrder.length;
                 }
                 if (players[playerOrder[nextIndex]]) {
                     currentPlayerId = playerOrder[nextIndex];
                     io.emit('next_turn', { playerId: currentPlayerId });
                 } else {
                     // 所有玩家都离开了，重置游戏
                     resetGame();
                     io.emit('game_reset');
                 }

           } else {
                // 所有玩家都离开了，重置游戏
                resetGame();
                io.emit('game_reset');
           }
      } else {
           // 如果断开连接的不是当前玩家，只需要从顺序中移除
            playerOrder = playerOrder.filter(id => id !== socket.id);
      }


  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
