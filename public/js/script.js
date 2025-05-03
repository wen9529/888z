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
        // 根据牌的信息设置背景图片
        cardDiv.style.backgroundImage = `url('/images/${card}.png')`; // 假设牌信息是文件名，例如 'AH.png'
        cardsContainer.appendChild(cardDiv);
      });

      playerHandsDiv.appendChild(playerHandDiv);
    });
  }

  // TODO: 添加更多客户端逻辑，例如：
  // - 允许玩家选择和排列手牌
  // - 发送玩家出牌的请求到服务器
  // - 显示比牌结果
});
