// 客户端脚本

document.addEventListener('DOMContentLoaded', () => {
  const startGameButton = document.getElementById('start-game-button');
  const playerHandsDiv = document.getElementById('player-hands');

  startGameButton.addEventListener('click', startGame);

  function startGame() {
    fetch('/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ numPlayers: 4 }) // 示例：4个玩家
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        displayHands(data.hands);
      } else {
        alert('开始游戏失败：' + data.message);
      }
    })
    .catch(error => {
      console.error('Error starting game:', error);
      alert('发生错误，请查看控制台');
    });
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
    playerHandsDiv.innerHTML = ''; // 清空手牌区域

    hands.forEach((hand, playerIndex) => {
      const playerHandDiv = document.createElement('div');
      playerHandDiv.classList.add('player-hand');
      playerHandDiv.innerHTML = `<h3>玩家 ${playerIndex + 1} 的手牌</h3><div class="cards"></div>`;

      const cardsContainer = playerHandDiv.querySelector('.cards');
      hand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        // 使用新的函数获取文件名并设置背景图片
        const filename = getCardFilename(card);
        cardDiv.style.backgroundImage = `url('/images/${filename}')`;
        cardsContainer.appendChild(cardDiv);
      });

      playerHandsDiv.appendChild(playerHandDiv);
    });
  }

  // TODO: 添加更多客户端逻辑
});
