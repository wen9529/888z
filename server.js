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

 // Constants for card suits and ranks
 const SUITS = ['C', 'D', 'H', 'S']; // Clubs, Diamonds, Hearts, Spades
 const RANKS = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];

 // Function to create a card object
 function createCard(rank, suit) {
  return { rank, suit };
 }

 // Function to initialize a deck of cards
 function initializeDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
 }

 // Function to shuffle the deck using Fisher-Yates algorithm
 function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
 }

 // Function to deal cards to players
 function dealCards(deck, numPlayers = 4) {
    const hands = [];
    for (let i = 0; i < numPlayers; i++) {
      hands[i] = [];
    }
    for (let i = 0; i < deck.length; i++) {
        hands[i % numPlayers].push(deck[i]);
    }
    return hands;
 }

 // 房间管理
 const rooms = {};

 //io连接
 io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
 });

// Function to create a player object
function createPlayer(id,username) {
  return {
    id,
    hand: [], // Initialize with an empty hand
    username,
  };
}

// Function to create a room
function createRoom(roomId) {
    return {
        id: roomId,
        players: {}, // { playerId: player }
        deck: [],
        currentPlayerId: null,
        currentPlay: [],
        playerOrder: [],
        state: 'waiting', // 'waiting', 'started', 'ended'
        lastPlay: null,
        lastPlayPlayerId: null,
        passedPlayers: 0,
    };
}

// Modify io.on('connection') to handle player joining
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

 function checkPlay(play, lastPlay) {
    const getCardValue = (card) => {
        return rankOrder.indexOf(card.rank) * 4 + suitOrder.indexOf(card.suit);
    };

    // 辅助函数：比较两手牌的大小
    const comparePlays = (play1, play2) => {
        // 炸弹大于一切非炸弹
        const type1 = getPlayType(play1).type;
        const type2 = getPlayType(play2).type;
        if (type1 === 'bomb' && type2 !== 'bomb') return true;
        if (type1 !== 'bomb' && type2 === 'bomb') return false;

        // 同类型牌比较
        if (type1 === type2) {
            if (type1 === 'single' || type1 === 'pair' || type1 === 'triple' || type1 === 'bomb') {
                // 比较点数最大的牌
                return getCardValue(play1[play1.length - 1]) > getCardValue(play2[play2.length - 1]);
            } else if (type1 === 'straight') {
                // 比较顺子中点数最大的牌
                 return getCardValue(play1[play1.length - 1]) > getCardValue(play2[play2.length - 1]);
            }
             // TODO: 添加其他牌型的比较逻辑
        }

        return false; // 默认情况，无法比较或play1不强于play2
    };

    // 辅助函数：获取牌型
    const getPlayType = (play) => {
        const len = play.length;
        if (len === 0) return { type: 'none', valid: false };

        // 按点数分组
        const rankCounts = {};
        play.forEach(card => {
            rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        });
        const uniqueRanks = Object.keys(rankCounts);
        const numUniqueRanks = uniqueRanks.length;

        // 排序手牌以便检查顺子等
        play.sort((a, b) => getCardValue(a) - getCardValue(b));

        // 单张
        if (len === 1) {
            return { type: 'single', valid: true };
        }

        // 对子
        if (len === 2 && numUniqueRanks === 1) {
            return { type: 'pair', valid: true };
        }

        // 三张
        if (len === 3 && numUniqueRanks === 1) {
            return { type: 'triple', valid: true };
        }

        // 炸弹 (四张相同点数的牌)
        if (len === 4 && numUniqueRanks === 1) {
            return { type: 'bomb', valid: true };
        }

        // 顺子 (至少5张，连续点数)
        if (len >= 5 && numUniqueRanks === len) {
            let isStraight = true;
            for (let i = 0; i < len - 1; i++) {
                 const currentRankIndex = rankOrder.indexOf(play[i].rank);
                 const nextRankIndex = rankOrder.indexOf(play[i + 1].rank);
                 if (nextRankIndex !== currentRankIndex + 1) {
                     isStraight = false;
                     break;
                 }
            }
             if (isStraight) return { type: 'straight', valid: true };
        }

        // TODO: 添加其他牌型的判断，例如葫芦、同花、同花顺等（根据游戏规则）

        return { type: 'unknown', valid: false }; // 默认非法牌型
    };

    // 获取当前出的牌的牌型信息
    const currentPlayTypeInfo = getPlayType(play);

    // 如果出的牌本身就不合法
    if (!currentPlayTypeInfo.valid) {
        return { valid: false, stronger: false, type: 'unknown' };
    }

    // 如果是回合的第一次出牌，任何合法牌型都可以
    if (!lastPlay || lastPlay.length === 0) {
        return { valid: true, stronger: true, type: currentPlayTypeInfo.type };
    }

    // 获取上一回合出的牌的牌型信息
    const lastPlayTypeInfo = getPlayType(lastPlay);

    // 如果出的牌是炸弹
    if (currentPlayTypeInfo.type === 'bomb') {
        // 炸弹可以压任何非炸弹的牌型
        if (lastPlayTypeInfo.type !== 'bomb') {
            return { valid: true, stronger: true, type: 'bomb' };
        } else {
            // 比较两个炸弹的大小 (炸弹比较点数)
             return { valid: true, stronger: comparePlays(play, lastPlay), type: 'bomb' };
        }
    }

    // 如果上一回合出的牌是炸弹，当前非炸弹牌无法压制
    if (lastPlayTypeInfo.type === 'bomb') {
        return { valid: false, stronger: false, type: currentPlayTypeInfo.type };
    }

    // 比较同类型牌
    if (currentPlayTypeInfo.type === lastPlayTypeInfo.type) {
         // 确保出的牌数量与上一回合相同 (除了炸弹和顺子，其他牌型数量必须一致)
         if (currentPlayTypeInfo.type !== 'bomb' && currentPlayTypeInfo.type !== 'straight' && play.length !== lastPlay.length) {
              return { valid: false, stronger: false, type: currentPlayTypeInfo.type };
         }
         // 比较大小
         return { valid: true, stronger: comparePlays(play, lastPlay), type: currentPlayTypeInfo.type };
    }

    // 不同类型牌（非炸弹）不能互相压制（例如单张不能压对子，对子不能压顺子等）
    return { valid: false, stronger: false, type: currentPlayTypeInfo.type };

}

  console.log('一个用户连接：', socket.id);

  const fixedRoomId = '1'; // 固定房间号
  let currentRoomId = fixedRoomId; // 存储玩家当前所在的房间 ID

   // 自动加入固定房间
   socket.join(fixedRoomId);
   console.log(`用户 ${socket.id} 加入房间 ${fixedRoomId}`);

   const room = rooms[fixedRoomId];
   const playerIdsInRoom = Object.keys(room.players);

    // 如果房间已满，可以考虑拒绝加入或作为观察者
   if (playerIdsInRoom.length >= 4) {
        socket.emit('error', '房间已满');
        // 可以实现观战逻辑
        return;
   }

       // 添加玩家到房间
       room.players[socket.id] = {
            id: socket.id,
            hand: [],
            position: null,
 username: `玩家${Object.keys(room.players).length + 1}`, // 简化用户名
       };

        // 分配座位
        const availablePositions = ['bottom', 'left', 'top', 'right'].filter(pos => !Object.values(room.players).some(p => p.position === pos));
        if (availablePositions.length > 0) {
            room.players[socket.id].position = availablePositions[0];
        }

   // 通知房间内所有玩家玩家列表更新 (现在只包含 username)
   io.to(fixedRoomId).emit('player_list', Object.values(room.players).map(player => ({ id: player.id, username: player.username })));

    // 成功加入房间的反馈 (包含自己的用户名)
   socket.emit('joined_room', { roomId: fixedRoomId, playerId: socket.id, username: room.players[socket.id].username });

       // 如果房间已满且所有玩家都准备就绪，自动开始游戏
    if (Object.keys(room.players).length === 4 && !room.ready) {
        room.ready = true; // 标记房间准备好开始游戏
        initializeGame(fixedRoomId);
        }

 }); // This is the closing brace for the io.on('connection', ...) block
    // 初始化游戏（洗牌、发牌、确定起始玩家）
   function initializeGame(roomId) {
        const room = rooms[roomId];
        if (!room) return;

        const playerIdsInRoom = Object.keys(room.players);

        room.deck = initializeDeck();
        const hands = dealCards(room.deck);

        // 分发手牌并确定起始玩家（拥有红桃3的玩家）
        let startPlayerId = null;
        playerIdsInRoom.forEach((id, index) => {
            room.players[id].hand = hands[index];
            if (room.players[id].hand.some(card => card.rank === '3' && card.suit === 'H')) {
                startPlayerId = id;
            }
        });


        // 确定玩家顺序，红桃3玩家先出牌
        room.playerOrder = playerIdsInRoom;
        const startIndex = room.playerOrder.indexOf(startPlayerId);
        room.playerOrder = room.playerOrder.slice(startIndex).concat(room.playerOrder.slice(0, startIndex));

        // 重置游戏状态
        room.currentPlayerId = room.playerOrder[0];
        room.currentPlay = [];
        room.lastPlay = null; // 重置上一回合出的牌
        room.lastPlayPlayerId = null; // 重置上一回合出牌玩家
        room.passedPlayers = 0; // 重置连续过牌玩家计数
        room.state = 'started'; // 设置房间状态为已开始

        // 通知所有玩家游戏开始和初始手牌
         playerIdsInRoom.forEach((id) => {
            io.to(id).emit('your_hand', room.players[id].hand);
         });

        io.to(roomId).emit('game_started', {
            startPlayerId: room.currentPlayerId,
            // 发送给客户端的玩家信息只包含需要公开的信息，例如手牌数量
 players: Object.values(room.players).map(p => ({ id: p.id, username: p.username, handSize: p.hand.length }))
        });
   }

   // 玩家出牌
    socket.on('play_cards', (cards) => {
        if (!currentRoomId || !rooms[currentRoomId]) {
             socket.emit('error', '您不在任何房间中');
             return;
        }
        const room = rooms[currentRoomId];

        if (socket.id !== room.currentPlayerId || room.state !== 'started') {
            socket.emit('error', '现在不是你的回合或游戏未开始');
            return;
        }

         if (!Array.isArray(cards) || cards.length === 0) {
             socket.emit('error', '请选择要出的牌');
             return;
         }

        // 检查玩家手牌是否包含要出的牌
        const playerHandRanks = room.players[socket.id].hand.map(card => `${card.rank}${card.suit}`.toUpperCase()); // 确保比较时大小写一致
        const validPlayInHand = cards.every(card =>
             playerHandRanks.includes(`${card.rank}${card.suit}`)
        );


        if (!validPlayInHand) {
            socket.emit('error', '你没有这些牌');
            return;
        }

        // 检查牌型是否合法且大于桌面上的牌
        const playCheck = checkPlay(cards, room.currentPlay);

        if (!playCheck.valid) {
             socket.emit('error', '出的牌不合法');
             return;
        }

         if (room.currentPlay && room.currentPlay.length > 0 && !playCheck.stronger) {
              socket.emit('error', '出的牌不够大');
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
        room.lastPlay = cards; // 更新上一回合出的牌
        room.lastPlayPlayerId = socket.id; // 更新上一回合出牌玩家
        room.passedPlayers = 0; // 重置连续过牌计数

        io.to(currentRoomId).emit('cards_played', { playerId: socket.id, play: cards, handSize: room.players[socket.id].hand.length }); // 通知房间内所有玩家出的牌

        // 检查游戏是否结束
        if (room.players[socket.id].hand.length === 0) {
             io.to(currentRoomId).emit('game_over', { winnerId: socket.id });
             room.state = 'game_over';
             // TODO: 计算得分等结束逻辑
        } else {
            // 轮到下一个玩家
            const currentIndex = room.playerOrder.indexOf(room.currentPlayerId);
            room.currentPlayerId = room.playerOrder[(currentIndex + 1) % room.playerOrder.length];
             io.to(currentRoomId).emit('next_turn', { playerId: room.currentPlayerId });
        }

   });

    // 玩家请求重置游戏
    socket.on('request_reset', () => {
         if (!currentRoomId || !rooms[currentRoomId]) {
             socket.emit('error', '您不在任何房间中');
             return;
        }
         resetGame(currentRoomId);
   });
    socket.on('pass_turn', () => {
             socket.emit('error', '您不在任何房间中');
             return;
        const room = rooms[currentRoomId];

        if (socket.id !== room.currentPlayerId || room.state !== 'started') {
            socket.emit('error', '现在不是你的回合或游戏未开始');
            return;
        }

        // 只有当桌面上有牌时才能过牌
         if (!room.currentPlay || room.currentPlay.length === 0) {
              socket.emit('error', '你是第一个出牌，不能过牌');
              return;
         }

        io.to(currentRoomId).emit('player_passed', { playerId: socket.id }); // 通知玩家过牌

        room.passedPlayers++; // 增加连续过牌计数

        // 判断是否一轮结束 (除了出牌的玩家，其他人都过牌了)
         const playersInRoomCount = Object.keys(room.players).length;
         if (room.passedPlayers === playersInRoomCount - 1) {
              console.log(`房间 ${currentRoomId} 一轮结束，清空桌面`);
              room.currentPlay = []; // 清空桌面上的牌
              room.lastPlay = null; // 清空上一回合出的牌
              room.lastPlayPlayerId = null; // 清空上一回合出牌玩家
              room.passedPlayers = 0; // 重置连续过牌计数

              // 轮到上一个出牌的玩家开始新的一轮
               if (room.lastPlayPlayerId) {
                    room.currentPlayerId = room.lastPlayPlayerId;
                    console.log(`房间 ${currentRoomId} 新一轮由上一个出牌玩家 ${room.currentPlayerId} 开始`);
               } else {
                    // 理论上不会发生，但作为备用，轮到当前玩家的下一个
                    const currentIndex = room.playerOrder.indexOf(room.currentPlayerId);
                    room.currentPlayerId = room.playerOrder[(currentIndex + 1) % room.playerOrder.length];
               }

               // 通知客户端清空桌面牌并更新回合
              io.to(currentRoomId).emit('round_ended'); // 新增事件通知客户端一轮结束
              io.to(currentRoomId).emit('next_turn', { playerId: room.currentPlayerId });

         } else {
              // 轮到下一个玩家
             const currentIndex = room.playerOrder.indexOf(room.currentPlayerId);
             room.currentPlayerId = room.playerOrder[(currentIndex + 1) % room.playerOrder.length];
              io.to(currentRoomId).emit('next_turn', { playerId: room.currentPlayerId });
         }
    });

    // 重置游戏状态 (现在接受 roomId 参数)
    function resetGame(roomId) {
        const room = rooms[roomId];
         if (!room) return;

        room.currentPlayerId = null;
        room.currentPlay = [];
        room.playerOrder = [];
        room.state = 'waiting';
        room.readyPlayers = 0;
        room.lastPlay = null;
        room.lastPlayPlayerId = null;
        room.passedPlayers = 0;

         for (const playerId in room.players) {
             room.players[playerId].hand = [];
             room.players[playerId].ready = false;
         }
        io.to(roomId).emit('game_reset');
         io.to(roomId).emit('player_list_updated', Object.values(room.players).map(p => ({ id: p.id, position: p.position, ready: p.ready })));
    }


  socket.on('disconnect', () => {
    console.log('用户断开连接：', socket.id);

     if (currentRoomId && rooms[currentRoomId]) {
         const room = rooms[currentRoomId];

 let position = room.players[socket.id]?.position;
         if (room.players[socket.id]?.ready) {
 room.readyPlayers--;
        }

          // 从玩家顺序中移除断开连接的玩家
          room.playerOrder = room.playerOrder.filter(id => id !== socket.id);

         if (position) {
             io.to(currentRoomId).emit('player_left', { id: socket.id, position: position });
         }

         io.to(currentRoomId).emit('player_list_updated', Object.values(room.players).map(p => ({ id: p.id, position: p.position, ready: p.ready })));
         if (room.currentPlayerId === socket.id && room.state === 'started') {
              const playerIdsInRoom = Object.keys(room.players);
              if (playerIdsInRoom.length > 0) {
                   const currentIndex = room.playerOrder.indexOf(room.currentPlayerId); // 使用更新后的 playerOrder
                    // 找到断开连接玩家在顺序中的下一个有效玩家
                   let nextIndex = (currentIndex + 1) % room.playerOrder.length;
                    while (!room.players[room.playerOrder[nextIndex]] && Object.keys(room.players).length > 0) {
                         nextIndex = (nextIndex + 1) % room.playerOrder.length;
                         // 如果遍历一圈回到当前位置且玩家仍不存在，说明房间已空
                          if (nextIndex === currentIndex) break;
                    }
                    if (room.players[room.playerOrder[nextIndex]]) {
 room.currentPlayerId = room.playerOrder[nextIndex];
 io.to(currentRoomId).emit('next_turn', { playerId: room.currentPlayerId });
                    } else {
 // 房间内没有玩家了，重置游戏或通知游戏结束
 io.to(currentRoomId).emit('game_over', { winnerId: null, message: '玩家不足，游戏结束' });
                    }
              } else {
}        }


          // 如果断开连接导致房间玩家不足，且游戏已开始，结束游戏并重置房间
          if (room.state === 'started' && Object.keys(room.players).length < 4) {
               console.log(`房间 ${currentRoomId} 玩家不足，游戏结束`);
               io.to(currentRoomId).emit('game_over', { winnerId: null, message: '玩家不足，游戏结束' });
                resetGame(currentRoomId);
          }

          // 如果房间空了，删除房间
           if (Object.keys(room.players).length === 0) {
                delete rooms[currentRoomId];
                console.log(`房间 ${currentRoomId} 已删除`);
           }

     }
 });


// Function to initialize the game
function initializeGame(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    // Shuffle the deck
    room.deck = shuffleDeck(initializeDeck());

    // Deal cards to each player
    const hands = dealCards(room.deck, Object.keys(room.players).length);
    Object.keys(room.players).forEach((playerId, index) => {
        room.players[playerId].hand = hands[index];
    });

    // Determine the starting player (player with 3 of Clubs)
    let startPlayerId = null;
    Object.keys(room.players).forEach(playerId => {
        if (room.players[playerId].hand.some(card => card.rank === '3' && card.suit === 'C')) {
            startPlayerId = playerId;
        }
    });

    // Set the starting player and player order
    room.currentPlayerId = startPlayerId;
    room.playerOrder = Object.keys(room.players);
    const startIndex = room.playerOrder.indexOf(startPlayerId);
    room.playerOrder = room.playerOrder.slice(startIndex).concat(room.playerOrder.slice(0, startIndex));

    // Set the game state to 'started'
    room.state = 'started';

    // Notify all players of their hands
    Object.keys(room.players).forEach((playerId) => {
        io.to(playerId).emit('your_hand', room.players[playerId].hand);
    });
    //Notify all players of the game start and starting player
    io.to(roomId).emit('game_started', {
        startPlayerId: room.currentPlayerId,
        players: Object.values(room.players).map(p => ({ id: p.id, username: p.username, handSize: p.hand.length }))
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
 console.log(`Server running on http://localhost:${PORT}`);
});
