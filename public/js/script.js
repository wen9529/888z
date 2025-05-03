// 客户端脚本

const socket = io();

let myHand = []; // 存储自己的手牌
let selectedCards = []; // 存储当前选中的卡牌
let myPlayerId = null; // 存储自己的玩家 ID
let myPosition = null; // 存储自己的座位位置
let playerList = []; // 存储所有玩家信息 (id, position)
let playerOrder = []; // 存储玩家出牌顺序的 ID 列表

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
                   playerArea.querySelector('h3').textContent = `玩家 ${playerList.findIndex(p => p.id === playerInfo.id) + 1}`; // 根据玩家列表索引简单编号

                   // 显示牌背面或数量
                   if (cardsContainer && playerInfo.handSize !== undefined) {
                       for (let i = 0; i < playerInfo.handSize; i++) {
                            const cardPileDiv = document.createElement('div');
                            cardPileDiv.classList.add('card-pile');
                            cardPileDiv.classList.add('back');
                            cardsContainer.appendChild(cardPileDiv);
                       }
                   } else if (cardsContainer) {
                       // 如果没有手牌数量信息，可以显示“等待发牌”或空白
                       cardsContainer.textContent = '等待发牌...';
                       cardsContainer.style.justifyContent = 'center';
                       cardsContainer.style.alignItems = 'center';
                       cardsContainer.style.textAlign = 'center';
                   }

              } else {
                   // 如果该位置没有玩家
                  playerArea.querySelector('h3').textContent = `玩家 ${Object.keys(playerAreas).indexOf(position) + 2}`; // 显示默认编号
                   if (cardsContainer) cardsContainer.innerHTML = ''; // 清空手牌区域
              }
        }
    }
}


// 锄大地游戏事件监听

socket.on('seat_assigned', (position) => {
    myPlayerId = socket.id;
    myPosition = position;
    console.log('您的座位是：', myPosition);
     document.getElementById(`player-${myPosition}`).querySelector('h3').textContent = `玩家 1 (您)`;
});

socket.on('player_list_updated', (playersInfo) => {
    playerList = playersInfo;
     console.log('玩家列表更新:', playerList);
     // 根据更新后的玩家列表更新其他玩家的显示
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
     currentPlayArea.style.display = 'flex'; // 显示当前桌面牌区域
     playerOrder = data.playerOrder; // 存储玩家出牌顺序
     updateTurnIndicator(data.startPlayerId);
     displayOtherPlayersInfo(data.players); // 根据游戏开始时的玩家信息显示手牌数量

});

socket.on('cards_played', (data) => {
     console.log('玩家出牌：', data.playerId, data.play);
     displayHand(data.play, currentPlayContainer); // 显示出的牌在桌面
      messageArea.textContent = `${getPlayerName(data.playerId)} 出牌`; // 显示出牌信息


     // 更新出牌玩家的手牌数量 (如果不是自己)
     if (data.playerId !== myPlayerId) {
          const playerInfo = playerList.find(p => p.id === data.playerId);
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
            myHandContainer.querySelectorAll('.card').forEach(cardDiv => {
               cardDiv.classList.remove('selected');
          });
     }

});

socket.on('player_passed', (data) => {
     console.log('玩家过牌：', data.playerId);
      messageArea.textContent = `${getPlayerName(data.playerId)} 过牌`; // 显示过牌信息
      // TODO: 可能需要更新桌面上的牌 (如果一轮结束清空)

});


socket.on('next_turn', (data) => {
    console.log('下一回合：', data.playerId);
    updateTurnIndicator(data.playerId);
});

socket.on('game_over', (data) => {
    console.log('游戏结束，赢家：', data.winnerId);
    messageArea.textContent = `游戏结束！赢家是：${getPlayerName(data.winnerId)}`;
     startGameButton.style.display = 'block'; // 显示开始按钮
     turnIndicator.style.display = 'none';
     currentPlayArea.style.display = 'none';
});

socket.on('game_reset', () => {
     console.log('游戏已重置');
     messageArea.textContent = '游戏已重置，等待新游戏开始';
      currentPlayContainer.innerHTML = ''; // 清空桌面牌
      myHandContainer.innerHTML = ''; // 清空手牌
      selectedCards = [];
      // 清空其他玩家区域
       const playerAreas = {
            'top': document.getElementById('player-top').querySelector('.cards'),
            'left': document.getElementById('player-left').querySelector('.cards'),
            'right': document.getElementById('player-right').querySelector('.cards')
       };
       for (const position in playerAreas) {
            if (playerAreas[position]) playerAreas[position].innerHTML = '';
       }
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

// 根据玩家 ID 获取玩家名称 (简单实现，可以根据玩家列表查找)
function getPlayerName(playerId) {
    if (playerId === myPlayerId) {
        return '您';
    }
     const playerInfo = playerList.find(p => p.id === playerId);
      if (playerInfo && playerOrder.length > 0) {
           const indexInOrder = playerOrder.indexOf(playerId);
           if (indexInOrder !== -1) {
                // 根据在玩家顺序中的位置编号 (例如，第一个出牌的是玩家1)
                // 注意：这可能与座位编号不同
