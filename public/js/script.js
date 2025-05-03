// 客户端脚本

document.addEventListener('DOMContentLoaded', () => {
  const gameArea = document.getElementById('game-area');

  // 开始新游戏按钮（示例）
  const startButton = document.createElement('button');
  startButton.textContent = '开始游戏';
  startButton.addEventListener('click', startGame);
  gameArea.appendChild(startButton);

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
        // 显示玩家的手牌（示例）
        displayHands(data.hands);
      } else {
        alert('开始游戏失败');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('发生错误');
    });
  }

  function displayHands(hands) {
    gameArea.innerHTML = ''; // 清空游戏区域

    hands.forEach((hand, playerIndex) => {
      const playerDiv = document.createElement('div');
      playerDiv.innerHTML = `<h2>玩家 ${playerIndex + 1} 的手牌</h2>`;
      hand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        // 根据牌的信息设置背景图片
        cardDiv.style.backgroundImage = `url('/images/${card}.png')`; // 假设牌信息是文件名
        playerDiv.appendChild(cardDiv);
      });
      gameArea.appendChild(playerDiv);
    });
  }

  // 您需要添加更多的客户端逻辑，例如选择牌、出牌、显示结果等
});
