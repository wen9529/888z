// 客户端脚本

const socket = io();

let myHand = [];
let selectedCards = [];
let myPlayerId = null;
let myPosition = null;
let playerList = [];
let playerOrder = [];
let currentRoomId = null;

const playCardsButton = document.getElementById('play-cards-button');
const passTurnButton = document.getElementById('pass-turn-button');
const myHandContainer = document.getElementById('player-bottom').querySelector('.cards');
const currentPlayContainer = document.getElementById('current-play').querySelector('.cards');
const messageArea = document.getElementById('message-area');
const turnIndicator = document.getElementById('turn-indicator');
const currentPlayArea = document.getElementById('current-play');
const roomIdSelect = document.getElementById('room-id-select');
const joinRoomButton = document.getElementById('join-room-button');
const roomSelectionArea = document.getElementById('room-selection');
const lobbyArea = document.getElementById('lobby');
const currentRoomDisplay = document.getElementById('current-room-display');
const playerListElement = document.getElementById('player-list');
const readyButton = document.getElementById('ready-button');


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

// 更新玩家列表显示
function updatePlayerList(playersInfo) {
    playerListElement.innerHTML = '';
    playersInfo.forEach(player => {
        const listItem = document.createElement('li');
        listItem.textContent = `玩家 ${playerList.findIndex(p => p.id === player.id) + 1} (${player.position}) - ${player.ready ? '已准备' : '未准备'}`;
        playerListElement.appendChild(listItem);
    });
}


// 游戏事件监听

socket.on('seat_assigned', (position) => {
    myPlayerId = socket.id;
    myPosition = position;
    console.log('您的座位是：', myPosition);
     document.getElementById(`player-${myPosition}`).querySelector('h3').textContent = `玩家 1 (您)`;
});

socket.on('joined_room', (data) => {
    currentRoomId = data.roomId;
    console.log('成功加入房间：', currentRoomId);
    messageArea.textContent = `已加入房间 ${currentRoomId}，等待其他玩家加入并准备...`;

    roomSelectionArea.style.display = 'none'; // 隐藏房间选择区域
    lobbyArea.style.display = 'flex'; // 显示大厅区域
    currentRoomDisplay.textContent = currentRoomId; // 显示当前房间号
    readyButton.style.display = 'inline-block'; // 显示准备按钮

     // 隐藏游戏区域和按钮，等待游戏开始
     turnIndicator.style.display = 'none';
     currentPlayArea.style.display = 'none';
     playCardsButton.style.display = 'none';
     passTurnButton.style.display = 'none';
});


socket.on('player_list_updated', (playersInfo) => {
    playerList = playersInfo;
     console.log('玩家列表更新:', playerList);
     displayOtherPlayersInfo(playerList);
     updatePlayerList(playerList); // 更新玩家列表显示
});

socket.on('player_ready_status', (data) => {
    console.log(`玩家 ${data.playerId} 准备状态更新：${data.ready}`);
    // 更新玩家列表中的准备状态
     const playerInfo = playerList.find(p => p.id === data.playerId);
      if (playerInfo) {
           playerInfo.ready = data.ready;
            updatePlayerList(playerList); // 更新玩家列表显示
      }
});


socket.on('your_hand', (hand) => {
    myHand = hand;
    displayHand(myHand, myHandContainer);
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
     roomSelectionArea.style.display = 'none';
     lobbyArea.style.display = 'none'; // 隐藏大厅区域
     turnIndicator.style.display = 'block';
     currentPlayArea.style.display = 'flex';
     playerOrder = data.playerOrder;
     updateTurnIndicator(data.startPlayerId);
     displayOtherPlayersInfo(data.players);

     // 显示出牌和过牌按钮
      playCardsButton.style.display = 'inline-block';
      passTurnButton.style.display = 'inline-block';

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

socket.on('round_ended', () => {
    console.log('一轮结束，清空桌面');
    currentPlayContainer.innerHTML = ''; // 清空桌面上的牌
    messageArea.textContent = '一轮结束，桌面已清空';
});


socket.on('next_turn', (data) => {
    console.log('下一回合：', data.playerId);
    updateTurnIndicator(data.playerId);
     // 如果轮到自己，提示出牌
      if (data.playerId === myPlayerId) {
           messageArea.textContent = '轮到你出牌了！';
      }
});

socket.on('game_over', (data) => {
    console.log('游戏结束，赢家：', data.winnerId);
     if (data.winnerId) {
         messageArea.textContent = `游戏结束！赢家是：${getPlayerName(data.winnerId)}`;
     } else if (data.message) {
          messageArea.textContent = `游戏结束：${data.message}`;
     } else {
          messageArea.textContent = '游戏结束';
     }

      turnIndicator.style.display = 'none';
      currentPlayArea.style.display = 'none';
      playCardsButton.style.display = 'none';
      passTurnButton.style.display = 'none';

     // 游戏结束后自动请求重置
