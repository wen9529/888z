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

// 房间管理
const rooms = {}; // 存储房间信息 { roomId: { players: {}, deck: [], currentPlayerId: null, currentPlay: [], playerOrder: [] } }

// 锄大地游戏逻辑 (现在将这些逻辑封装在房间对象中)

// 初始化牌堆
function initializeDeck() {
    const suits = ['C', 'D', 'H', 'S'];
    const ranks = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
    const deck = [];
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
    return deck;
}

// 发牌
function dealCards(deck) {
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

// 检查牌型和比较大小 (需要完善)
function isValidAndStronger(play, lastPlay) {
    if (play.length === 0) return false;

    // TODO: 实现各种牌型的判断和比较逻辑
    // 示例：简化为只判断单牌大小
    if (play.length === 1 && (lastPlay.length === 0 || lastPlay.length === 1)) {
         const rankOrder = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
         const suitOrder = ['C', 'D', 'H', 'S'];
         const rankA = rankOrder.indexOf(play[0].rank);
         const rankB = lastPlay.length === 1 ? rankOrder.indexOf(lastPlay[0].rank) : -1;

         if (rankA > rankB) return true;
         if (rankA < rankB) return false;
         const suitA = suitOrder.indexOf(play[0].suit);
         const suitB = lastPlay.length === 1 ? suitOrder.indexOf(lastPlay[0].suit) : -1;
         return suitA > suitB;
    }

    // TODO: 添加其他牌型的判断和比较

    return false;
}


io.on('connection', (socket) => {
  console.log('一个用户连接：', socket.id);

  let currentRoomId = null; // 存储玩家当前所在的房间 ID

   // 玩家请求加入房间
  socket.on('join_room', (roomId) => {
       if (socket.rooms.has(roomId)) {
            socket.emit('error', '您已在该房间中');
            return;
       }

       // 创建或加入房间
       if (!rooms[roomId]) {
           rooms[roomId] = {
               players: {},
               deck: [],
               currentPlayerId: null,
               currentPlay: [],
               playerOrder: [],
               state: 'waiting', // 房间状态: waiting, started, game_over
           };
           console.log(`房间 ${roomId} 创建`);
       }

       const room = rooms[roomId];
        const playerIdsInRoom = Object.keys(room.players);

        if (playerIdsInRoom.length >= 4) { // 假设房间最多4个玩家
             socket.emit('error', '房间已满');
             return;
        }

       // 加入 Socket.IO 房间
       socket.join(roomId);
       currentRoomId = roomId;

       // 添加玩家到房间
       room.players[socket.id] = {
            id: socket.id,
            hand: [],
            position: null,
       };

        // 分配座位
        const availablePositions = ['bottom', 'left', 'top', 'right'].filter(pos => !Object.values(room.players).some(p => p.position === pos));
        if (availablePositions.length > 0) {
            room.players[socket.id].position = availablePositions[0];
            socket.emit('seat_assigned', room.players[socket.id].position);
        }


       console.log(`用户 ${socket.id} 加入房间 ${roomId}`);

        // 通知房间内所有玩家玩家列表更新
        io.to(roomId).emit('player_list_updated', Object.values(room.players).map(p => ({ id: p.id, position: p.position })));

       // 如果房间已满并且处于等待状态，可以自动开始游戏
        if (Object.keys(room.players).length === 4 && room.state === 'waiting') {
             startGame(roomId);
        } else if (room.state === 'started') {
             // 如果游戏已经开始，新加入的玩家进入观战模式或等待下一局
              socket.emit('spectating', { message: '游戏已开始，您正在观战或等待下一局' });
               // 可以发送当前游戏状态给观战者
        }

  });


   // 玩家请求开始游戏
  socket.on('start_game', () => {
       if (!currentRoomId || !rooms[currentRoomId]) {
            socket.emit('error', '您不在任何房间中');
            return;
       }
       const room = rooms[currentRoomId];
       const playerIdsInRoom = Object.keys(room.players);

       if (playerIdsInRoom.length !== 4) { // 假设需要4个玩家才能开始
            socket.emit('error', '需要4个玩家才能开始游戏');
            return;
       }

       if (room.state !== 'waiting') {
            socket.emit('error', '游戏已经开始或已结束');
            return;
       }

       startGame(currentRoomId);
  });

    // 开始游戏逻辑 (现在接受 roomId 参数)
   function startGame(roomId) {
        const room = rooms[roomId];
        if (!room) return;

        room.state = 'started';
        const playerIdsInRoom = Object.keys(room.players);

        room.deck = initializeDeck(); // 初始化房间的牌堆
        const hands = dealCards(room.deck);

        let startPlayerId = null;

        playerIdsInRoom.forEach((id, index) => {
            room.players[id].hand = hands[index];
            // 找到拥有红桃3的玩家，作为起始玩家
            if (room.players[id].hand.some(card => card.rank === '3' && card.suit === 'H')) {
                startPlayerId = id;
            }
            io.to(id).emit('your_hand', room.players[id].hand); // 发送手牌给对应玩家
        });

        room.playerOrder = playerIdsInRoom; // 设置玩家出牌顺序
        const startIndex = room.playerOrder.indexOf(startPlayerId);
        room.playerOrder = room.playerOrder.slice(startIndex).concat(room.playerOrder.slice(0, startIndex));

        room.currentPlayerId = room.playerOrder[0];
        room.currentPlay = [];

        io.to(roomId).emit('game_started', {
            startPlayerId: room.currentPlayerId,
            players: Object.values(room.players).map(p => ({ id: p.id, position: p.position, handSize: p.hand.length })),
            playerOrder: room.playerOrder
        });
   }


   // 玩家出牌
    socket.on('play_cards', (cards) => {
        if (!currentRoomId || !rooms[currentRoomId]) {
             socket.emit('error', '您不在任何房间中');
             return;
        }
        const room = rooms[currentRoomId];

        if (socket.id !== room.currentPlayerId) {
            socket.emit('error', '现在不是你的回合');
            return;
        }

        // 检查玩家手牌是否包含要出的牌
        const validPlayInHand = cards.every(card =>
            room.players[socket.id].hand.some(hCard => hCard.rank === card.rank && hCard.suit === card.suit)
        );

        if (!validPlayInHand) {
            socket.emit('error', '你没有这些牌');
            return;
        }

        // 检查牌型是否合法且大于桌面上的牌
        if (!isValidAndStronger(cards, room.currentPlay)) {
             socket.emit('error', '出的牌不合法或不够大');
             return;
        }


        // 从玩家手牌中移除出的牌
        for (const card of cards) {
            const index = room.players[socket.id].hand.findIndex(hCard => hCard.rank === card.rank && hCard.suit === card.suit);
            if (index !== -1) {
                room.players[socket.id].hand.splice(index, 1);
            }
        }

        room.currentPlay = cards; // 更新桌面上的牌

        io.to(currentRoomId).emit('cards_played', { playerId: socket.id, play: cards, handSize: room.players[socket.id].hand.length }); // 通知房间内所有玩家出的牌

        // 检查游戏是否结束
        if (room.players[socket.id].hand.length === 0) {
             io.to(currentRoomId).emit('game_over', { winnerId: socket.id });
             room.state = 'game_over';
             // TODO: 计算得分等结束逻辑
             // resetGame(currentRoomId); // 游戏结束后重置
        } else {
            // 轮到下一个玩家
            const currentIndex = room.playerOrder.indexOf(room.currentPlayerId);
            room.currentPlayerId = room.playerOrder[(currentIndex + 1) % room.playerOrder.length];
             io.to(currentRoomId).emit('next_turn', { playerId: room.currentPlayerId });
        }

   });

    // 玩家过牌
    socket.on('pass_turn', () => {
         if (!currentRoomId || !rooms[currentRoomId]) {
             socket.emit('error', '您不在任何房间中');
             return;
        }
        const room = rooms[currentRoomId];

        if (socket.id !== room.currentPlayerId) {
            socket.emit('error', '现在不是你的回合');
            return;
        }

        // TODO: 实现过牌逻辑，判断是否一轮结束，清空桌面牌
        io.to(currentRoomId).emit('player_passed', { playerId: socket.id }); // 通知玩家过牌

         // 轮到下一个玩家
        const currentIndex = room.playerOrder.indexOf(room.currentPlayerId);
        room.currentPlayerId = room.playerOrder[(currentIndex + 1) % room.playerOrder.length];
         io.to(currentRoomId).emit('next_turn', { playerId: room.currentPlayerId });
    });

    // 重置游戏状态 (现在接受 roomId 参数)
    function resetGame(roomId) {
        const room = rooms[roomId];
         if (!room) return;

        room.currentPlayerId = null;
        room.currentPlay = [];
        room.playerOrder = [];
        room.state = 'waiting';
         for (const playerId in room.players) {
             room.players[playerId].hand = [];
         }
        io.to(roomId).emit('game_reset');
         // 通知房间内所有玩家玩家列表更新
        io.to(roomId).emit('player_list_updated', Object.values(room.players).map(p => ({ id: p.id, position: p.position })));
    }

     // 玩家请求重置游戏 (例如，游戏结束后点击按钮)
    socket.on('request_reset', () => {
         if (!currentRoomId || !rooms[currentRoomId]) {
             socket.emit('error', '您不在任何房间中');
             return;
        }
         resetGame(currentRoomId);
    });


  socket.on('disconnect', () => {
    console.log('用户断开连接：', socket.id);

     if (currentRoomId && rooms[currentRoomId]) {
         const room = rooms[currentRoomId];
         const position = room.players[socket.id]?.position;
         delete room.players[socket.id];

         if (position) {
             io.to(currentRoomId).emit('player_left', { id: socket.id, position: position }); // 通知房间内玩家离开
         }

          // 更新房间内玩家列表
         io.to(currentRoomId).emit('player_list_updated', Object.values(room.players).map(p => ({ id: p.id, position: p.position })));


         // 如果断开连接的是当前玩家，轮到下一个
         if (room.currentPlayerId === socket.id && room.state === 'started') {
              const playerIdsInRoom = Object.keys(room.players);
              if (playerIdsInRoom.length > 0) {
                   const currentIndex = room.playerOrder.indexOf(socket.id);
                   // 找到断开连接玩家在顺序中的下一个有效玩家
                   let nextIndex = (currentIndex + 1) % room.playerOrder.length;
                    while (!room.players[room.playerOrder[nextIndex]] && Object.keys(room.players).length > 0) {
                         nextIndex = (nextIndex + 1) % room.playerOrder.length;
                    }
                    if (room.players[room.playerOrder[nextIndex]]) {
                        room.currentPlayerId = room.playerOrder[nextIndex];
                        io.to(currentRoomId).emit('next_turn', { playerId: room.currentPlayerId });
                    } else {
                        // 房间内没有玩家了，重置房间
                        resetGame(currentRoomId);
                         delete rooms[currentRoomId]; // 删除空房间
                    }

              } else {
                   // 房间内没有玩家了，重置房间
                   resetGame(currentRoomId);
                    delete rooms[currentRoomId]; // 删除空房间
              }
         } else {
              // 如果断开连接的不是当前玩家，只需要从顺序中移除
               room.playerOrder = room.playerOrder.filter(id => id !== socket.id);
                // 如果房间空了，删除房间
               if (Object.keys(room.players).length === 0) {
                    delete rooms[currentRoomId];
                    console.log(`房间 ${currentRoomId} 已删除`);
               }
         }


         // 如果断开连接导致房间玩家不足，且游戏已开始，可以考虑结束游戏或等待
          if (room.state === 'started' && Object.keys(room.players).length < 4) {
               console.log(`房间 ${currentRoomId} 玩家不足，游戏暂停或结束`);
               // TODO: 处理玩家不足情况下的游戏状态
          }

     }


  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
