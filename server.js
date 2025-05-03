// ... (其他代码保持不变)

io.on('connection', (socket) => {
  console.log('一个用户连接：', socket.id);

  players[socket.id] = {
    id: socket.id,
    hand: [],
    position: null,
  };

   // 分配座位
   const availablePositions = ['bottom', 'left', 'top', 'right'].filter(pos => !Object.values(players).some(p => p.position === pos));
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
       if (playerIds.length !== 4) {
            socket.emit('error', '需要4个玩家才能开始游戏');
            return;
       }

      const hands = dealCards(); // 调用发牌函数
      let startPlayerId = null;

      playerIds.forEach((id, index) => {
          players[id].hand = hands[index];
          // 找到拥有红桃3的玩家，作为起始玩家
          if (players[id].hand.some(card => card.rank === '3' && card.suit === 'H')) {
              startPlayerId = id;
          }
          io.to(id).emit('your_hand', players[id].hand); // 发送手牌给对应玩家
      });

       playerOrder = playerIds;
       const startIndex = playerOrder.indexOf(startPlayerId);
       playerOrder = playerOrder.slice(startIndex).concat(playerOrder.slice(0, startIndex));

       currentPlayerId = playerOrder[0];
       currentPlay = [];

       io.emit('game_started', {
           startPlayerId: currentPlayerId,
            players: Object.values(players).map(p => ({ id: p.id, position: p.position, handSize: p.hand.length })),
            playerOrder: playerOrder
       });
  });

   // ... (其他代码保持不变)

});

// ... (其他代码保持不变)
