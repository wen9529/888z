// 客户端脚本

const socket = io();

let myHand = [];
let selectedCards = [];
let myPlayerId = null;
let myPosition = null;
let playerList = [];
let playerOrder = [];
let currentRoomId = null; // 存储当前所在的房间 ID

const startGameButton = document.getElementById('start-game-button');
const playCardsButton = document.getElementById('play-cards-button');
const passTurnButton = document.getElementById('pass-turn-button');
const myHandContainer = document.getElementById('player-bottom').querySelector('.cards');
const currentPlayContainer = document.getElementById('current-play').querySelector('.cards');
const messageArea = document.getElementById('message-area');
const turnIndicator = document.getElementById('turn-indicator');
const currentPlayArea = document.getElementById('current-play');
const roomIdInput = document.getElementById('room-id-input');
const joinRoomButton = document.getElementById('join-room-button');
const roomSelectionArea = document.getElementById('room-selection');


// 定义 getCardFilename 函数 (与之前相同)
function getCardFilename(card) {
    const suits = {
      'C': 'clubs',
      'D': 'diamonds',
      'H': 'hearts',
      'S': 'spades'
    };
    const ranks = {
      '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
      'T': '10',
      'J': 'jack',
      'Q': 'queen',
      'K': 'king',
      'A': 'ace',
      '2': '2'
    };
     if (!card || !card.rank || !card.suit) {
         console.error("Invalid card object:", card);
         return '';
     }

     const rankName = ranks[card.rank];
     const suitName = suits[card.suit];

     if (!rankName || !suitName) {
          console.error("Could not get filename for card:", card);
          return '';
     }

     return `${rankName.toLowerCase()}_of_${suitName}.png`;

}


// 显示手牌 (与之前相同)
function displayHand(hand, container) {
    container.innerHTML = '';
    hand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        const filename = getCardFilename(card);
         if (filename) {
             cardDiv.style.backgroundImage = `url('/images/${filename}')`;
             cardDiv.title = `${card.rank}${card.suit}`;
         } else {
             cardDiv.classList.add('text-only');
             cardDiv.textContent = `${card.rank}${card.suit}`;
         }
        cardDiv.dataset.rank = card.rank;
        cardDiv.dataset.suit = card.suit;
        container.appendChild(cardDiv);
    });
}

// 显示其他玩家的牌背面或数量 (与之前相同)
function displayOtherPlayersInfo(playersInfo) {
    const playerAreas = {
        'top': document.getElementById('player-top'),
        'left': document.getElementById('player-left'),
        'right': document.getElementById('player-right')
    };

    for (const position in playerAreas) {
        const playerArea = playerAreas[position];
        if (playerArea) {
             const cardsContainer = playerArea.querySelector('.cards');
              if (cardsContainer) cardsContainer.innerHTML = '';

             const playerInfo = playersInfo.find(p => p.position === position);
              if (playerInfo) {
                   playerArea.querySelector('h3').textContent = `玩家 ${playerList.findIndex(p => p.id === playerInfo.id) + 1}`;

                   if (cardsContainer && playerInfo.handSize !== undefined) {
                       for (let i = 0; i < playerInfo.handSize; i++) {
                            const cardPileDiv = document.createElement('div');
                            cardPileDiv.classList.add('card-pile');
                            cardPileDiv.classList.add('back');
                            cardsContainer.appendChild(cardPileDiv);
                       }
                   } else if (cardsContainer) {
                       cardsContainer.textContent = '等待发牌...';
                       cardsContainer.style.justifyContent = 'center';
                       cardsContainer.style.alignItems = 'center';
                       cardsContainer.style.textAlign = 'center';
                   }

              } else {
                  playerArea.querySelector('h3').textContent = `玩家 ${Object.keys(playerAreas).indexOf(position) + 2}`;
                   if (cardsContainer) cardsContainer.innerHTML = '';
              }
        }
    }
}


// 游戏事件监听

socket.on('seat_assigned', (position) => {
    myPlayerId = socket.id;
    myPosition = position;
    console.log('您的座位是：', myPosition);
     document.getElementById(`player-${myPosition}`).querySelector('h3').textContent = `玩家 1 (您)`;
});

socket.on('player_list_updated', (playersInfo) => {
    playerList = playersInfo;
     console.log('玩家列表更新:', playerList);
     displayOtherPlayersInfo(playerList);
});


socket.on('your_hand', (hand) => {
    myHand = hand;
    displayHand(myHand, myHandContainer);
     // 添加卡牌点击选中事件
     myHandContainer.querySelectorAll('.card').forEach(cardDiv => {
          cardDiv.addEventListener('click', () => {
              cardDiv.classList.toggle('selected');
               const card = { rank: cardDiv.dataset.rank, suit: cardDiv.dataset.suit };
               const index = selectedCards.findIndex(c => c.rank === card.rank && c.suit === card.suit);
               if (index === -1) {
                   selectedCards.push(card);
               } else {
                   selectedCards.splice(index, 1);
               }
               console.log("选中的牌:", selectedCards);
          });
     });
});

socket.on('game_started', (data) => {
     console.log('游戏开始，起始玩家：', data.startPlayerId);
     startGameButton.style.display = 'none';
     roomSelectionArea.style.display = 'none'; // 隐藏房间选择区域
     turnIndicator.style.display = 'block';
     currentPlayArea.style.display = 'flex';
     playerOrder = data.playerOrder;
     updateTurnIndicator(data.startPlayerId);
     displayOtherPlayersInfo(data.players);

});

socket.on('cards_played', (data) => {
     console.log('玩家出牌：', data.playerId, data.play);
     displayHand(data.play, currentPlayContainer);
      messageArea.textContent = `${getPlayerName(data.playerId)} 出牌`;

     if (data.playerId !== myPlayerId) {
          const playerInfo = playerList.find(p => p.id === data.playerId);
           if (playerInfo && playerInfo.position) {
               const playerArea = document.getElementById(`player-${playerInfo.position}`);
                if (playerArea) {
                     const cardsContainer = playerArea.querySelector('.cards');
                      if (cardsContainer) {
                           cardsContainer.innerHTML = '';
                           for (let i = 0; i < data.handSize; i++) {
                                const cardPileDiv = document.createElement('div');
                                cardPileDiv.classList.add('card-pile');
                                cardPileDiv.classList.add('back');
                                cardsContainer.appendChild(cardPileDiv);
                           }
                      }
                }
           }
     } else {
           myHand = myHand.filter(card => !data.play.some(playedCard => playedCard.rank === card.rank && playedCard.suit === card.suit));
           displayHand(myHand, myHandContainer);
           selectedCards = [];
            myHandContainer.querySelectorAll('.card').forEach(cardDiv => {
               cardDiv.classList.remove('selected');
          });
     }

});

socket.on('player_passed', (data) => {
     console.log('玩家过牌：', data.playerId);
      messageArea.textContent = `${getPlayerName(data.playerId)} 过牌`;
});


socket.on('next_turn', (data) => {
    console.log('下一回合：', data.playerId);
    updateTurnIndicator(data.playerId);
});

socket.on('game_over', (data) => {
    console.log('游戏结束，赢家：', data.winnerId);
    messageArea.textContent = `游戏结束！赢家是：${getPlayerName(data.winnerId)}`;
     startGameButton.style.display = 'block';
     turnIndicator.style.display = 'none';
     currentPlayArea.style.display = 'none';
     // 游戏结束后可以显示重置按钮或者自动重置
      // setTimeout(() => { socket.emit('request_reset'); }, 5000); // 5秒后自动重置
});

socket.on('game_reset', () => {
     console.log('游戏已重置');
     messageArea.textContent = '游戏已重置，等待新游戏开始';
      currentPlayContainer.innerHTML = '';
      myHandContainer.innerHTML = '';
      selectedCards = [];
       const playerAreas = {
            'top': document.getElementById('player-top'),
            'left': document.getElementById('player-left'),
            'right': document.getElementById('player-right')
       };
       for (const position in playerAreas) {
            const playerArea = playerAreas[position];
            if (playerArea) {
                 playerArea.querySelector('h3').textContent = `玩家 ${Object.keys(playerAreas).indexOf(position) + 2}`;
                 const cardsContainer = playerArea.querySelector('.cards');
                 if (cardsContainer) cardsContainer.innerHTML = '';
            }
       }
       document.getElementById('player-bottom').querySelector('h3').textContent = '玩家 1 (您)';

      turnIndicator.style.display = 'none';
      currentPlayArea.style.display = 'none';
      startGameButton.style.display = 'block';
      roomSelectionArea.style.display = 'flex'; // 显示房间选择区域
       currentRoomId = null; // 清空当前房间 ID
});


socket.on('error', (message) => {
    console.error('服务器错误：', message);
    messageArea.textContent = '错误：' + message;
});

socket.on('player_left', (data) => {
     console.log('玩家离开：', data.id, data.position);
     messageArea.textContent = `${getPlayerName(data.id)} 离开了`;
     // 清空离开玩家区域的显示
     const playerArea = document.getElementById(`player-${data.position}`);
      if (playerArea) {
           playerArea.querySelector('.cards').innerHTML = '';
           playerArea.querySelector('h3').textContent = `玩家 ${Object.keys({top:'',left:'',right:''}).indexOf(data.position) + 2}`; // 重置玩家编号
      }
});

socket.on('spectating', (data) => {
     console.log(data.message);
     messageArea.textContent = data.message;
     startGameButton.style.display = 'none'; // 观战模式下隐藏开始按钮
     playCardsButton.style.display = 'none'; // 观战模式下隐藏出牌按钮
     passTurnButton.style.display = 'none'; // 观战模式下隐藏过牌按钮
     roomSelectionArea.style.display = 'none'; // 隐藏房间选择区域
});


// 更新回合指示器 (与之前相同)
function updateTurnIndicator(playerId) {
    turnIndicator.textContent = `当前回合：${getPlayerName(playerId)}`;
}

// 根据玩家 ID 获取玩家名称 (与之前相同)
function getPlayerName(playerId) {
    if (playerId === myPlayerId) {
        return '您';
    }
     const playerInfo = playerList.find(p => p.id === playerId);
      if (playerInfo) {
           return `玩家 ${playerList.findIndex(p => p.id === playerId) + 1}`;
      }
    return '未知玩家';
}


// 按钮事件监听

if (joinRoomButton) {
    joinRoomButton.addEventListener('click', () => {
        const roomId = roomIdInput.value.trim();
        if (roomId) {
            socket.emit('join_room', roomId);
             messageArea.textContent = `尝试加入房间：${roomId}...`;
             roomIdInput.disabled = true; // 加入房间后禁用输入框
             joinRoomButton.disabled = true; // 加入房间后禁用按钮
        } else {
            messageArea.textContent = '请输入房间号！';
        }
    });
}


if (startGameButton) {
    startGameButton.addEventListener('click', () => {
        if (currentRoomId) {
             socket.emit('start_game');
              messageArea.textContent = '';
        } else {
            messageArea.textContent = '请先加入房间！';
        }
    });
}

if (playCardsButton) {
    playCardsButton.addEventListener('click', () => {
        if (currentRoomId && selectedCards.length > 0) {
            socket.emit('play_cards', selectedCards);
        } else if (!currentRoomId) {
             messageArea.textContent = '请先加入房间！';
        } else {
            messageArea.textContent = '请选择要出的牌！';
        }
    });
}

if (passTurnButton) {
    passTurnButton.addEventListener('click', () => {
        if (currentRoomId) {
            socket.emit('pass_turn');
             selectedCards = [];
              myHandContainer.querySelectorAll('.card').forEach(cardDiv => {
                   cardDiv.classList.remove('selected');
              });
        } else {
             messageArea.textContent = '请先加入房间！';
        }
    });
}


// 获取自己的玩家 ID (连接成功后获取)
socket.on('connect', () => {
  myPlayerId = socket.id;
  console.log('已连接，您的 ID 是：', myPlayerId);
   messageArea.textContent = '请输入或选择房间号加入游戏';
    roomSelectionArea.style.display = 'flex'; // 显示房间选择区域
     startGameButton.style.display = 'none'; // 连接后隐藏开始按钮，等待加入房间
});

socket.on('disconnect', () => {
    console.log('断开连接');
     messageArea.textContent = '已断开连接，请刷新页面重试';
      startGameButton.style.display = 'none';
      playCardsButton.style.display = 'none';
      passTurnButton.style.display = 'none';
      turnIndicator.style.display = 'none';
      currentPlayArea
