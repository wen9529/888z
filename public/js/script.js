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


  // 将玩家区域添加到游戏容器
  for (const position in playerAreas) {
      gameContainer.appendChild(playerAreas[position]);
  }


  startGameButton.addEventListener('click', startGame);

  // 创建玩家手牌区域的函数
  function createPlayerArea(id, title) {
      const playerDiv = document.createElement('div');
      playerDiv.id = id;
      playerDiv.classList.add('player-area');
      playerDiv.innerHTML = `<h3>${title}</h3><div class="cards"></div>`; // 保持cards容器，用于显示自己的手牌或牌堆
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
        let showFullHand = false; // 默认不显示完整手牌

        // 根据玩家索引确定显示区域和是否显示完整手牌
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
            // 显示自己的完整手牌
            hand.forEach(card => {
                const cardDiv = document.createElement('div');
                cardDiv.classList.add('card');
                const filename = getCardFilename(card);
                cardDiv.style.backgroundImage = `url('/images/${filename}')`;
                targetArea.appendChild(cardDiv);
            });
        } else {
            // 为其他玩家显示一个代表牌堆的元素
            const cardPileDiv = document.createElement('div');
            cardPileDiv.classList.add('card-pile'); // 添加新的类来表示牌堆
            cardPileDiv.classList.add('back'); // 使用牌背面样式
             // 可以根据需要调整牌堆的大小
            cardPileDiv.style.width = '80px';
            cardPileDiv.style.height = '120px';
            cardPileDiv.style.position = 'relative'; // 为了实现堆叠效果
            cardPileDiv.style.border = '1px solid #ccc'; // 添加边框

            // 可以通过添加多个元素或使用阴影来模拟堆叠效果
            // 这里简单地只添加一个元素
            targetArea.appendChild(cardPileDiv);
        }
    });
  }

  // TODO: 添加更多客户端逻辑
});
