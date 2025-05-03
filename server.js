const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public')); // 确保静态文件服务正确

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// 锄大地游戏逻辑
const players = {}; // 存储玩家信息
let deck = []; // 牌堆
let currentPlayer = null; // 当前出牌玩家
let currentPlay = []; // 当前桌面上的牌

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
     for (const hand of hands) {
         hand.sort((a, b) => {
              const rankOrder = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
              const suitOrder = ['C', 'D', 'H', 'S'];
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

// 检查牌型 (简化版，需要完善)
function checkPlay(play, lastPlay) {
    // TODO: 实现更完整的锄大地牌型判断逻辑
    if (play.length === 0) return false; // 不能出空牌

    if (!lastPlay || lastPlay.length === 0) {
        // 如果是第一手牌，可以是任何合法牌型
        return true; // 简化处理，认为任何非空牌型都合法
    }

    if (play.length !== lastPlay.length) {
        return false; // 牌型数量必须一致
    }

     // 简化比较，只比较单牌
     if (play.length === 1 && lastPlay.length === 1) {
          const ranks = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
          const suits = ['C', 'D', 'H', 'S'];
          const rankA = ranks.indexOf(play[0].rank);
          const rankB = ranks.indexOf(lastPlay[0].rank);
          if (rankA !== rankB) {
               return rankA > rankB;
          }
          return suits.indexOf(play[0].suit) > suits.indexOf(lastPlay[0].suit);
     }


    // TODO: 实现其他牌型的比较
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
   const availablePositions = ['top', 'left', 'right', 'bottom'].filter(pos => !Object.values(players).some(p => p.position === pos));
   if (availablePositions.length > 0) {
       players[socket.id].position = availablePositions[0];
       socket.emit('seat_assigned', players[socket.id].position);
        io.emit('player_joined', { id: socket.id, position: players[socket.id].position }); // 通知所有玩家有新玩家加入
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
      let startIndex = 0; // 第一个出牌的玩家索引

      playerIds.forEach((id, index) => {
          players[id].hand = hands[index];
          // 找到拥有红桃3的玩家，作为起始玩家
          if (players[id].hand.some(card => card.rank === '3' && card.suit === 'H')) {
              startIndex = index;
          }
          io.to(id).emit('your_hand', players[id].hand); // 发送手牌给对应玩家
      });

       currentPlayer = playerIds[startIndex]; // 设置当前出牌玩家
       currentPlay = []; // 清空桌面上的牌
       io.emit('game_started', { startPlayerId: currentPlayer, players: Object.values(players).map(p => ({ id: p.id, position: p.position, handSize: p.hand.length })) }); // 通知游戏开始和起始玩家
  });

   socket.on('play_cards', (cards) => {
        if (socket.id !== currentPlayer) {
            socket.emit('error', '现在不是你的回合');
            return;
        }

        // 检查玩家手牌是否包含要出的牌
        const validPlay = cards.every(card =>
            players[socket.id].hand.some(hCard => hCard.rank === card.rank && hCard.suit === card.suit)
        );

        if (!validPlay) {
            socket.emit('error', '你没有这些牌');
            return;
        }

        // 检查牌型是否合法且大于桌面上的牌
        if (!checkPlay(cards, currentPlay)) {
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
             io.emit('game_over', { winner: socket.id });
             // TODO: 计算得分等结束逻辑
        } else {
            // 轮到下一个玩家
            const playerIds = Object.keys(players);
            const currentIndex = playerIds.indexOf(currentPlayer);
            currentPlayer = playerIds[(currentIndex + 1) % playerIds.length];
             io.emit('next_turn', { playerId: currentPlayer });
        }

   });

    socket.on('pass_turn', () => {
        if (socket.id !== currentPlayer) {
            socket.emit('error', '现在不是你的回合');
            return;
        }

        // TODO: 实现过牌逻辑，判断是否一轮结束，清空桌面牌

        // 轮到下一个玩家
        const playerIds = Object.keys(players);
        const currentIndex = playerIds.indexOf(currentPlayer);
        currentPlayer = playerIds[(currentIndex + 1) % playerIds.length];
         io.emit('next_turn', { playerId: currentPlayer });
    });


  socket.on('disconnect', () => {
    console.log('用户断开连接：', socket.id);
     const position = players[socket.id]?.position;
     delete players[socket.id];
     if (position) {
         io.emit('player_left', { id: socket.id, position: position }); // 通知玩家离开
     }

  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
