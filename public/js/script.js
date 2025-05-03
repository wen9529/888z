// 客户端脚本

const socket = io();

let myHand = [];
let selectedCards = [];
let myPlayerId = null;
let myPosition = null;
let playerList = [];
let playerOrder = [];

const startGameButton = document.getElementById('start-game-button');
const playCardsButton = document.getElementById('play-cards-button');
const passTurnButton = document.getElementById('pass-turn-button');
const myHandContainer = document.getElementById('player-bottom').querySelector('.cards');
const currentPlayContainer = document.getElementById('current-play').querySelector('.cards');
const messageArea = document.getElementById('message-area');
const turnIndicator = document.getElementById('turn-indicator');
const currentPlayArea = document.getElementById('current-play');


// 定义 getCardFilename 函数，根据您的图片命名规则生成文件名
function getCardFilename(card) {
    const suits = {
      'C': 'clubs',
      'D': 'diamonds',
      'H': 'hearts',
      'S': 'spades'
    };
    const ranks = {
      '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
      'T': '10', // 'T' 对应 '10'
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

     // 确保文件名格式与您的 /public/images 文件夹中的图片一致
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
             cardDiv.title = `${card.rank}${card.suit}`; // 添加 title 属性，鼠标悬停时显示牌面
         } else {
             cardDiv.classList.add('text-only');
             cardDiv.textContent = `${card.rank}${card.suit}`;
         }
        cardDiv.dataset.rank = card.rank;
        cardDiv.dataset.suit = card.suit;
        container.appendChild(cardDiv);
    });
}

// 显示其他玩家的牌背面或数量
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
              if (cardsContainer) cardsContainer.innerHTML = ''; // 清空

             const playerInfo = playersInfo.find(p => p.position === position);
              if (playerInfo) {
                   // 显示玩家名称或编号
                   playerArea.querySelector('h3').textContent = `玩家 ${playerList.findIndex(p => p.id === playerInfo.id) + 1}`;

                   // 显示牌背面或数量
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


     // 更新出牌玩家的手牌数量 (如果不是自己)
     if (data.playerId !== myPlayerId) {
          // 从 playerList 查找玩家信息
          const playerInfo = playerList.find(p => p.id === data.playerId);
           if (playerInfo && playerInfo.position) {
               const playerArea = document.getElementById(`player-${playerInfo.position}`);
                if (playerArea) {
                     const cardsContainer = playerArea.querySelector('.cards');
                      if (cardsContainer) {
                           cardsContainer.innerHTML = '';
                           // 只显示背面牌数量
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
           selectedCards = [];
            myHandContainer.querySelectorAll('.card').forEach(cardDiv => {
               cardDiv.classList.remove('selected');
          });
     }

});

socket.on('player_passed', (data) => {
     console.log('玩家过牌：', data.playerId);
      messageArea.textContent = `${getPlayerName(data.playerId)} 过牌`;
      // TODO: 如果一轮结束，可能需要清空桌面牌
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
});

socket.on('game_reset', () => {
     console.log('游戏已重置');
     messageArea.textContent = '游戏已重置，等待新游戏开始';
      currentPlayContainer.innerHTML = '';
      myHandContainer.innerHTML = '';
      selectedCards = [];
      // 清空其他玩家区域并重置文本
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
       // 重置自己的区域文本
       document.getElementById('player-bottom').querySelector('h3').textContent = '玩家 1 (您)';

      turnIndicator.style.display = 'none';
      currentPlayArea.style.display = 'none';
      startGameButton.style.display = 'block';
});


socket.on('error', (message) => {
    console.error('服务器错误：', message);
    messageArea.textContent = '错误：' + message;
});


// 更新回合指示器
function updateTurnIndicator(playerId) {
    turnIndicator.textContent = `当前回合：${getPlayerName(playerId)}`;
}

// 根据玩家 ID 获取玩家名称 (根据 playerList 查找)
function getPlayerName(playerId) {
    if (playerId === myPlayerId) {
        return '您';
    }
     const playerInfo = playerList.find(p => p.id === playerId);
      if (playerInfo) {
           // 根据在玩家列表中的索引 + 1 作为编号
           return `玩家 ${playerList.findIndex(p => p.id === playerId) + 1}`;
      }
    return '未知玩家'; // 找不到玩家信息时
}


// 按钮事件监听
if (startGameButton) {
    startGameButton.addEventListener('click', () => {
        socket.emit('start_game');
         messageArea.textContent = '';
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
         selectedCards = [];
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
