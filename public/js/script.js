// 客户端脚本

let myHand = []; // 存储自己的手牌
let arrangedMyHand = { head: [], middle: [], tail: [] }; // 存储自己整理好的手牌

document.addEventListener('DOMContentLoaded', () => {
  const startGameButton = document.getElementById('start-game-button');
  const gameContainer = document.getElementById('game-container');
  const playerHandsDiv = document.getElementById('player-hands'); // 用于显示自己的原始手牌

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

   // 添加自己的原始手牌显示区域
   const myOriginalHandArea = document.createElement('div');
   myOriginalHandArea.id = 'my-original-hand';
   myOriginalHandArea.classList.add('player-area'); // 可以重用 player-area 样式
   myOriginalHandArea.innerHTML = '<h3>我的手牌</h3><div class="cards"></div>';
   gameContainer.appendChild(myOriginalHandArea);


   // 添加整理牌型的区域
   const arrangeArea = document.createElement('div');
   arrangeArea.id = 'arrange-area';
   arrangeArea.innerHTML = `
     <div class="hand-section" id="head-section">
       <h4>头道 (3张)</h4>
       <div class="cards"></div>
     </div>
     <div class="hand-section" id="middle-section">
       <h4>中道 (5张)</h4>
       <div class="cards"></div>
     </div>
     <div class="hand-section" id="tail-section">
       <h4>尾道 (5张)</h4>
       <div class="cards"></div>
     </div>
     <button id="submit-arrange">提交牌型</button>
   `;
   gameContainer.appendChild(arrangeArea); // 将整理区域添加到游戏容器

   const submitArrangeButton = document.getElementById('submit-arrange');


  if (startGameButton) {
      startGameButton.addEventListener('click', startGame);
  } else {
      console.error("Start game button not found!");
  }

  if (submitArrangeButton) {
      submitArrangeButton.addEventListener('click', submitArrangement);
  }


  // 开始游戏函数
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
        myHand = data.hand; // 存储自己的手牌
        displayMyOriginalHand(myHand); // 显示自己的原始手牌供整理
        displayOtherPlayersBacks(); // 显示其他玩家的牌背面
        // TODO: 进入整理牌型阶段，隐藏开始按钮，显示整理区域
        startGameButton.style.display = 'none';
        arrangeArea.style.display = 'block';


      } else {
        alert('开始游戏失败：' + data.message);
      }
    })
    .catch(error => {
      console.error('Error starting game:', error);
      alert('发生错误，请查看控制台');
    });
  }

  // 显示自己的原始手牌供整理
  function displayMyOriginalHand(hand) {
      const originalHandContainer = document.getElementById('my-original-hand').querySelector('.cards');
      originalHandContainer.innerHTML = ''; // 清空

      hand.forEach(card => {
          const cardDiv = document.createElement('div');
          cardDiv.classList.add('card');
          const filename = getCardFilename(card);
          cardDiv.style.backgroundImage = `url('/images/${filename}')`;
          // TODO: 使卡牌可拖动或点击选择
          cardDiv.dataset.rank = card.rank; // 将牌的信息存储在 data 属性中
          cardDiv.dataset.suit = card.suit;
          cardDiv.draggable = true; // 使卡牌可拖动

           cardDiv.addEventListener('dragstart', (event) => {
                event.dataTransfer.setData('text/plain', JSON.stringify({ rank: event.target.dataset.rank, suit: event.target.dataset.suit }));
           });

          originalHandContainer.appendChild(cardDiv);
      });
  }

  // 显示其他玩家的牌背面
  function displayOtherPlayersBacks() {
       const playerAreas = {};
        playerAreas['top'] = document.getElementById('player-top');
        playerAreas['left'] = document.getElementById('player-left');
        playerAreas['right'] = document.getElementById('player-right');

        for (const position in playerAreas) {
             const cardsContainer = playerAreas[position].querySelector('.cards');
             if (cardsContainer) {
                 cardsContainer.innerHTML = ''; // 清空
                 const cardPileDiv = document.createElement('div');
                 cardPileDiv.classList.add('card-pile');
                 cardPileDiv.classList.add('back');
                 cardPileDiv.style.width = '80px';
                 cardPileDiv.style.height = '120px';
                 cardPileDiv.style.position = 'relative';
                 cardPileDiv.style.border = '1px solid #ccc';
                 cardsContainer.appendChild(cardPileDiv);
             }
        }
  }


  // 实现拖放功能
  const handSections = document.querySelectorAll('.hand-section .cards');
  handSections.forEach(section => {
      section.addEventListener('dragover', (event) => {
          event.preventDefault(); // 允许放置
      });

      section.addEventListener('drop', (event) => {
          event.preventDefault();
          const cardData = JSON.parse(event.dataTransfer.getData('text/plain'));
          const droppedCard = { rank: cardData.rank, suit: cardData.suit };

          // TODO: 验证放置的区域和牌的数量
          const sectionId = section.closest('.hand-section').id;
          if (sectionId === 'head-section' && arrangedMyHand.head.length < 3) {
              arrangedMyHand.head.push(droppedCard);
              addCardToSection(droppedCard, section);
               // 从原始手牌中移除
               removeCardFromOriginalHand(droppedCard);

          } else if (sectionId === 'middle-section' && arrangedMyHand.middle.length < 5) {
              arrangedMyHand.middle.push(droppedCard);
              addCardToSection(droppedCard, section);
               removeCardFromOriginalHand(droppedCard);
          } else if (sectionId === 'tail-section' && arrangedMyHand.tail.length < 5) {
              arrangedMyHand.tail.push(droppedCard);
              addCardToSection(droppedCard, section);
               removeCardFromOriginalHand(droppedCard);
          } else {
              alert("这个位置不能放这张牌！");
          }

           console.log("整理好的手牌:", arrangedMyHand);
      });
  });

    // 将牌添加到整理区域
    function addCardToSection(card, sectionElement) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        const filename = getCardFilename(card);
        cardDiv.style.backgroundImage = `url('/images/${filename}')`;
        // TODO: 使整理区域的牌可拖回
         cardDiv.dataset.rank = card.rank; // 存储牌的信息
         cardDiv.dataset.suit = card.suit;
         cardDiv.draggable = true; // 使卡牌可拖动

         cardDiv.addEventListener('dragstart', (event) => {
            event.dataTransfer.setData('text/plain', JSON.stringify({ rank: event.target.dataset.rank, suit: event.target.dataset.suit }));
             // 标记拖动源是整理区域的牌
            event.dataTransfer.setData('text/from-arrange', 'true');
         });


        sectionElement.appendChild(cardDiv);
    }

    // 从原始手牌区域移除牌
    function removeCardFromOriginalHand(card) {
        const originalHandContainer = document.getElementById('my-original-hand').querySelector('.cards');
        const cardsInOriginalHand = originalHandContainer.querySelectorAll('.card');
        cardsInOriginalHand.forEach(cardDiv => {
            if (cardDiv.dataset.rank === card.rank && cardDiv.dataset.suit === card.suit) {
                cardDiv.remove();
            }
        });
         // TODO: 从 myHand 数组中移除对应的牌
         myHand = myHand.filter(c => !(c.rank === card.rank && c.suit === card.suit));
    }


    // 允许将牌拖回原始手牌区域 (需要修改原始手牌区域的放置事件)
     const myOriginalHandCardsContainer = document.getElementById('my-original-hand').querySelector('.cards');
     myOriginalHandCardsContainer.addEventListener('dragover', (event) => {
          event.preventDefault();
     });

     myOriginalHandCardsContainer.addEventListener('drop', (event) => {
         event.preventDefault();
         const cardData = JSON.parse(event.dataTransfer.getData('text/plain'));
         const droppedCard = { rank: cardData.rank, suit: cardData.suit };
         const fromArrange = event.dataTransfer.getData('text/from-arrange') === 'true';

         if (fromArrange) {
             // 将牌添加回原始手牌区域
             myHand.push(droppedCard);
             addCardToSection(droppedCard, myOriginalHandCardsContainer);

              // 从整理区域移除对应的牌
              removeCardFromArrangedHand(droppedCard);
         }
     });

    // 从整理区域移除牌
    function removeCardFromArrangedHand(card) {
         for (const section in arrangedMyHand) {
             arrangedMyHand[section] = arrangedMyHand[section].filter(c => !(c.rank === card.rank && c.suit === card.suit));
             // 同时从 DOM 中移除对应的牌元素
             const sectionElement = document.getElementById(`${section}-section`).querySelector('.cards');
             const cardsInSection = sectionElement.querySelectorAll('.card');
             cardsInSection.forEach(cardDiv => {
                 if (cardDiv.dataset.rank === card.rank && cardDiv.dataset.suit === card.suit) {
                     cardDiv.remove();
                 }
             });
         }
    }


  // 提交整理好的手牌
  function submitArrangement() {
      // 检查手牌数量是否正确 (3, 5, 5)
      if (arrangedMyHand.head.length !== 3 || arrangedMyHand.middle.length !== 5 || arrangedMyHand.tail.length !== 5) {
          alert("请将手牌整理为头道3张，中道5张，尾道5张！");
          return;
      }

      // TODO: 发送整理好的手牌到服务器
      // 需要有一个玩家标识，这里简化使用 'player1'
      fetch('/arrange', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ playerId: 'player1', arrangedHand: arrangedMyHand })
      })
      .then(response => response.json())
      .then(data => {
          if (data.success) {
              if (data.results) { // 比牌结果已返回
                   displayGameResults(data.results);
                   // TODO: 隐藏整理区域，显示比牌结果
                    arrangeArea.style.display = 'none';
                    // 可以显示开始游戏按钮以便开始下一局
                    startGameButton.style.display = 'block';

              } else {
                  alert("手牌已提交，等待其他玩家...");
                  // TODO: 禁用整理区域，显示等待信息
                  arrangeArea.style.pointerEvents = 'none'; // 禁用交互
              }
          } else {
              alert("提交手牌失败：" + data.message);
          }
      })
      .catch(error => {
          console.error('Error submitting arrangement:', error);
          alert('提交手牌时发生错误，请查看控制台');
      });
  }

  // TODO: 显示比牌结果
  function displayGameResults(results) {
      console.log("游戏结果:", results);
      // 在界面上显示每个玩家的牌型、得分和胜负情况
      // 您可以在 gameContainer 中添加一个结果显示区域
       let resultsHtml = '<h2>游戏结果</h2>';
       results.forEach(playerResult => {
            resultsHtml += `<h3>${playerResult.playerId}</h3>`;
            resultsHtml += `<p>得分: ${playerResult.score}</p>`;
            // TODO: 显示整理好的手牌和牌型信息
             resultsHtml += `<div class="arranged-hand-result">`;
             resultsHtml += `<h4>头道 (${game.getHandType(playerResult.arrangedHand.head).type})</h4><div class="cards"></div>`;
             resultsHtml += `<h4>中道 (${game.getHandType(playerResult.arrangedHand.middle).type})</h4><div class="cards"></div>`;
             resultsHtml += `<h4>尾道 (${game.getHandType(playerResult.arrangedHand.tail).type})</h4><div class="cards"></div>`;
             resultsHtml += `</div>`;
       });

       // 创建或更新结果显示区域
       let resultsArea = document.getElementById('results-area');
       if (!resultsArea) {
            resultsArea = document.createElement('div');
            resultsArea.id = 'results-area';
            gameContainer.appendChild(resultsArea);
       }
       resultsArea.innerHTML = resultsHtml;

       // 在结果区域显示每个玩家整理好的手牌图片
       results.forEach(playerResult => {
            const arrangedHandResultDiv = resultsArea.querySelector(`.arranged-hand-result`);
            if (arrangedHandResultDiv) {
                 const headCardsContainer = arrangedHandResultDiv.querySelector('h4:contains("头道") + .cards');
                 const middleCardsContainer = arrangedHandResultDiv.querySelector('h4:contains("中道") + .cards');
                 const tailCardsContainer = arrangedHandResultDiv.querySelector('h4:contains("尾道") + .cards');

                 if (headCardsContainer) {
                     playerResult.arrangedHand.head.forEach(card => {
                         const cardDiv = document.createElement('div');
                         cardDiv.classList.add('card');
                         const filename = getCardFilename(card);
                         cardDiv.style.backgroundImage = `url('/images/${filename}')`;
                         headCardsContainer.appendChild(cardDiv);
                     });
                 }
                 if (middleCardsContainer) {
                      playerResult.arrangedHand.middle.forEach(card => {
                          const cardDiv = document.createElement('div');
                          cardDiv.classList.add('card');
                          const filename = getCardFilename(card);
                          cardDiv.style.backgroundImage = `url('/images/${filename}')`;
                          middleCardsContainer.appendChild(cardDiv);
                      });
                 }
                 if (tailCardsContainer) {
                       playerResult.arrangedHand.tail.forEach(card => {
                           const cardDiv = document.createElement('div');
                           cardDiv.classList.add('card');
                           const filename = getCardFilename(card);
                           cardDiv.style.backgroundImage = `url('/images/${filename}')`;
                           tailCardsContainer.appendChild(cardDiv);
                       });
                 }

            }
       });


  }


  // TODO: 添加更多客户端逻辑，例如：
  // - 牌型判断的视觉反馈
  // - 特殊牌型的显示
  // - 比牌过程的动画或视觉效果
});
