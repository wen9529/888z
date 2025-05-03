// 客户端脚本

const socket = io();

let myHand = []; // 存储自己的手牌
let selectedCards = []; // 存储当前选中的卡牌
let myPlayerId = null; // 存储自己的玩家 ID
let myPosition = null; // 存储自己的座位位置

const startGameButton = document.getElementById('start-game-button');
const playCardsButton = document.getElementById('play-cards-button');
const passTurnButton = document.getElementById('pass-turn-button');
const myHandContainer = document.getElementById('player-bottom').querySelector('.cards');
const currentPlayContainer = document.getElementById('current-play').querySelector('.cards');
const messageArea = document.getElementById('message-area');
const turnIndicator = document.getElementById('turn-indicator');
const currentPlayArea = document.getElementById('current-play');


// 定义 getCardFilename 函数 (与之前十三水相同)
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


// 显示手牌
function displayHand(hand, container) {
    container.innerHTML = ''; // 清空
    hand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        const filename = getCardFilename(card);
         if (filename) {
             cardDiv.style.backgroundImage = `url('/images/${filename}')`;
         } else {
             cardDiv.classList.add('text-only');
             cardDiv.textContent = `${card.rank}${card.suit}`;
         }
        cardDiv.dataset.rank = card.rank;
        cardDiv.dataset.suit = card.suit;
        container.appendChild(cardDiv);
    });
}

// 显示其他玩家的牌背面
function displayOtherPlayersBacks(playersInfo) {
    const playerAreas = {
        'top': document.getElementById('player-top').querySelector('.cards'),
        'left': document.getElementById('player-left').querySelector('.cards'),
        'right': document.getElementById('player-right').querySelector('.cards')
    };

    for (const position in playerAreas) {
        const container = playerAreas[position];
        if (container) {
             container.innerHTML = ''; // 清空
              const playerInfo = playersInfo.find(p => p.position === position);
              if (playerInfo) {
                  for (let i = 0; i < playerInfo.handSize; i++) {
                       const cardPileDiv = document.createElement('div');
                       cardPileDiv.classList.add('card-pile');
                       cardPileDiv.classList.add('back');
                       container.appendChild(cardPileDiv);
                  }
              }

        }
    }
}


// 锄大地游戏事件监听

socket.on('seat_assigned', (position) => {
    myPosition = position;
    console.log('您的座位是：', myPosition);
     document.getElementById(`player-${myPosition}`).querySelector('h3').textContent = `玩家 1 (您)`;
});

socket.on('player_joined', (playerInfo) => {
    console.log('玩家加入：', playerInfo);
     if (playerInfo.id !== myPlayerId) {
          const playerArea = document.getElementById(`player-${playerInfo.position}`);
           if (playerArea) {
                playerArea.querySelector('h3').textContent = `玩家 ${Object.keys(socket.disconnected).length + Object.keys(socket.connected).indexOf(playerInfo.id) + 1}`; // 简单编号
                playerArea.querySelector('.cards').innerHTML = ''; // 清空手牌区域
           }
     }
});

socket.on('player_left', (playerInfo) => {
     console.log('玩家离开：', playerInfo);
     const playerArea = document.getElementById(`player-${playerInfo.position}`);
      if (playerArea) {
           playerArea.querySelector('h3').textContent = `玩家 ${Object.keys(socket.disconnected).length + Object.keys(socket.connected).indexOf(playerInfo.id) + 1}`; // 恢复简单编号
           playerArea.querySelector('.cards').innerHTML = ''; // 清空手牌区域
      }
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
     turnIndicator.style.display = 'block';
     updateTurnIndicator(data.startPlayerId);
     displayOtherPlayersBacks(data.players);
     currentPlayArea.style.display = 'flex'; // 显示当前桌面牌区域
});

socket.on('cards_played', (data) => {
     console.log('玩家出牌：', data.playerId, data.play);
     displayHand(data.play, currentPlayContainer); // 显示出的牌在桌面

     // 更新出牌玩家的手牌数量 (如果不是自己)
     if (data.playerId !== myPlayerId) {
          const playerInfo = Object.values(socket.connected).find(p => p.id === data.playerId); // 需要服务器发送其他玩家信息
           if (playerInfo && playerInfo.position) {
               const playerArea = document.getElementById(`player-${playerInfo.position}`);
                if (playerArea) {
                     const cardsContainer = playerArea.querySelector('.cards');
                      if (cardsContainer) {
                           cardsContainer.innerHTML = ''; // 清空
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
          // 如果是自己出牌，更新自己的手牌显示
           myHand = myHand.filter(card => !data.play.some(playedCard => playedCard.rank === card.rank && playedCard.suit === card.suit));
           displayHand(myHand, myHandContainer);
           selectedCards = []; // 清空选中
     }

});

socket.on('next_turn', (data) => {
    console.log('下一回合：', data.playerId);
    updateTurnIndicator(data.playerId);
});

socket.on('game_over', (data) => {
    console.log('游戏结束，赢家：', data.winner);
    messageArea.textContent = `游戏结束！赢家是：${data.winner}`;
     startGameButton.style.display = 'block'; // 显示开始按钮
     turnIndicator.style.display = 'none';
     currentPlayArea.style.display = 'none';
});

socket.on('error', (message) => {
    console.error('服务器错误：', message);
    messageArea.textContent = '错误：' + message;
});


// 更新回合指示器
function updateTurnIndicator(playerId) {
    if (playerId === myPlayerId) {
        turnIndicator.textContent = '当前回合：您';
    } else {
         const playerInfo = Object.values(socket.connected).find(p => p.id === playerId);
          if (playerInfo && playerInfo.position) {
               turnIndicator.textContent = `当前回合：玩家 ${Object.keys(socket.disconnected).length + Object.keys(socket.connected).indexOf(playerId) + 1}`; // 简单编号
          } else {
               turnIndicator.textContent = `当前回合：玩家 ${playerId}`;
          }

    }
}


// 按钮事件监听
if (startGameButton) {
    startGameButton.addEventListener('click', () => {
        socket.emit('start_game');
         messageArea.textContent = ''; // 清空消息
    });
}

if (playCardsButton) {
    playCardsButton.addEventListener('click', () => {
        if (selectedCards.length > 0) {
            socket.emit('play_cards', selectedCards);
        } else {
            messageArea.textContent = '请选择要出的牌！';
        }
    });
}

if (passTurnButton) {
    passTurnButton.addEventListener('click', () => {
        socket.emit('pass_turn');
         selectedCards = []; // 清空选中
          myHandContainer.querySelectorAll('.card').forEach(cardDiv => {
               cardDiv.classList.remove('selected');
          });
    });
}


// 获取自己的玩家 ID
socket.on('connect', () => {
  myPlayerId = socket.id;
  console.log('已连接，您的 ID 是：', myPlayerId);
});
