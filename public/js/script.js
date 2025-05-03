// 客户端脚本

document.addEventListener('DOMContentLoaded', () => {
  const startGameButton = document.getElementById('start-game-button');
  const gameContainer = document.getElementById('game-container');

  // 创建玩家手牌区域的容器
  const playerAreas = {};
  playerAreas['top'] = createPlayerArea('player-top', '玩家 2'); // 顶部玩家
  playerAreas['left'] = createPlayerArea('player-left', '玩家 3'); // 左侧玩家
  playerAreas['center'] = createPlayerArea('player-center', '玩家 1 (您)'); // 自己的手牌
  playerAreas['right'] = createPlayerArea('player-right', '玩家 4'); // 右侧玩家


  // 创建牌桌区域
  const cardTableDiv = document.createElement('div');
  cardTableDiv.id = 'card-table';
  gameContainer.appendChild(cardTableDiv);


  // 将玩家区域添加到游戏容器
  for (const position in playerAreas) {
      gameContainer.appendChild(playerAreas[position]);
  }


  // 确保按钮元素存在并绑定事件
  if (startGameButton) {
      startGameButton.addEventListener('click', startGame);
  } else {
      console.error("Start game button not found!");
  }


  // 创建玩家手牌区域的函数
  function createPlayerArea(id, title) {
      const playerDiv = document.createElement('div');
      playerDiv.id = id;
      playerDiv.classList.add('player-area');
      playerDiv.innerHTML = `<h3>${title}</h3><div class="cards"></div>`;
      return playerDiv;
  }


  // 根据牌信息对象获取对应的文件名
  function getCardFilename(card) {
      const suits = {
        'C': 'clubs',
        'D': 'diamonds',
        'H': 'hearts',
        'S': 'spades'
      };
      const ranks = {
        '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
        'T': '10',
        'J': 'jack',
        'Q': 'queen',
        'K': 'king',
        'A': 'ace'
      };

      if (card.rank === 'T') {
        return `10_of_${suits[card.suit]}.png`;
      } else {
        return `${ranks[card.rank]}_of_${suits[card.suit]}.png`;
      }
  }


  function displayHands(hands) {
    // 清空之前的手牌显示
    for (const position in playerAreas) {
        playerAreas[position].querySelector('.cards').innerHTML = '';
    }


    hands.forEach((hand, playerIndex) => {
        let targetArea;
        let showFullHand = false;

        if (playerIndex === 0) { // 玩家 1 (自己)
            targetArea = playerAreas['center'].querySelector('.cards');
            showFullHand = true;
        } else if (playerIndex === 1) { // 玩家 2 (顶部)
            targetArea = playerAreas['top'].querySelector('.cards');
        } else if (playerIndex === 2) { // 玩家 3 (左侧)
            targetArea = playerAreas['left'].querySelector('.cards');
        } else if (playerIndex === 3) { // 玩家 4 (右侧)
            targetArea = playerAreas['right'].querySelector('.cards');
        }

        if (showFullHand) {
            hand.forEach(card => {
                const cardDiv = document.createElement('div');
                cardDiv.classList.add('card');
                const filename = getCardFilename(card);
                cardDiv.style.backgroundImage = `url('/images/${filename}')`;
                targetArea.appendChild(cardDiv);
            });
        } else {
            const cardPileDiv = document.createElement('div');
            cardPileDiv.classList.add('card-pile');
            cardPileDiv.classList.add('back');
            cardPileDiv.style.width = '80px';
            cardPileDiv.style.height = '120px';
            cardPileDiv.style.position = 'relative';
            cardPileDiv.style.border = '1px solid #ccc';

            targetArea.appendChild(cardPileDiv);
        }
    });
  }

  // TODO: 添加更多客户端逻辑
});
