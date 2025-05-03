// 客户端脚本

let myHand = []; // 存储自己的手牌
let arrangedMyHand = { head: [], middle: [], tail: [] }; // 存储自己整理好的手牌

// 定义 startGame 函数
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
      // 进入整理牌型阶段
      const startGameButton = document.getElementById('start-game-button');
      const arrangeArea = document.getElementById('arrange-area');
      const myOriginalHandArea = document.getElementById('my-original-hand'); // 显示我的手牌区域
      if(startGameButton) startGameButton.style.display = 'none';
      if(arrangeArea) arrangeArea.style.display = 'flex';
      if(myOriginalHandArea) myOriginalHandArea.style.display = 'flex';


    } else {
      alert('开始游戏失败：' + data.message);
    }
  })
  .catch(error => {
    console.error('Error starting game:', error);
    alert('发生错误，请查看控制台');
  });
}

// 定义 createPlayerArea 函数
function createPlayerArea(id, title) {
    const playerDiv = document.createElement('div');
    playerDiv.id = id;
    playerDiv.classList.add('player-area');
    playerDiv.innerHTML = `<h3>${title}</h3><div class="cards"></div>`;
    return playerDiv;
}

// 定义 getCardFilename 函数
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

// 定义 displayMyOriginalHand 函数
function displayMyOriginalHand(hand) {
    const myOriginalHandArea = document.getElementById('my-original-hand');
    if (!myOriginalHandArea) {
        console.error("#my-original-hand element not found!");
        return;
    }
    const originalHandContainer = myOriginalHandArea.querySelector('.cards');
    if (!originalHandContainer) {
         console.error(".cards container in #my-original-hand not found!");
         return;
    }

    originalHandContainer.innerHTML = ''; // 清空

    hand.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        const filename = getCardFilename(card);
         if (filename) {
             cardDiv.style.backgroundImage = `url('/images/${filename}')`;
         } else {
             cardDiv.classList.add('text-only'); // 添加一个类以便设置文本样式
             cardDiv.textContent = `${card.rank}${card.suit}`;
         }

        cardDiv.dataset.rank = card.rank;
        cardDiv.dataset.suit = card.suit;
        cardDiv.draggable = true;

         cardDiv.addEventListener('dragstart', (event) => {
              event.dataTransfer.setData('text/plain', JSON.stringify({ rank: event.target.dataset.rank, suit: event.target.dataset.suit }));
         });

        originalHandContainer.appendChild(cardDiv);
    });
}

// 定义 displayOtherPlayersBacks 函数
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
               cardsContainer.appendChild(cardPileDiv);
           }
      }
}

// 定义 addCardToSection 函数
function addCardToSection(card, sectionElement) {
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
     cardDiv.draggable = true;

     cardDiv.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', JSON.stringify({ rank: event.target.dataset.rank, suit: event.target.dataset.suit }));
        event.dataTransfer.setData('text/from-arrange', 'true');
     });

    sectionElement.appendChild(cardDiv);
}

// 定义 removeCardFromOriginalHand 函数
function removeCardFromOriginalHand(card) {
    const originalHandContainer = document.getElementById('my-original-hand').querySelector('.cards');
    if (!originalHandContainer) return;

    const cardsInOriginalHand = originalHandContainer.querySelectorAll('.card');
    cardsInOriginalHand.forEach(cardDiv => {
        if (cardDiv.dataset.rank === card.rank && cardDiv.dataset.suit === card.suit) {
            cardDiv.remove();
            const index = myHand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
             if (index !== -1) {
                 myHand.splice(index, 1);
             }
            return;
        }
    });
}

// 定义 removeCardFromArrangedHand 函数
function removeCardFromArrangedHand(card) {
     for (const section in arrangedMyHand) {
         const index = arrangedMyHand[section].findIndex(c => c.rank === card.rank && c.suit === card.suit);
          if (index !== -1) {
              arrangedMyHand[section].splice(index, 1);
               const sectionElement = document.getElementById(`${section}-section`).querySelector('.cards');
               if (sectionElement) {
                    const cardsInSection = sectionElement.querySelectorAll('.card');
                    cardsInSection.forEach(cardDiv => {
                        if (cardDiv.dataset.rank === card.rank && cardDiv.dataset.suit === card.suit) {
                            cardDiv.remove();
                            return;
                        }
                    });
               }
               return;
          }
     }
}

// 定义 submitArrangement 函数
function submitArrangement() {
    if (arrangedMyHand.head.length !== 3 || arrangedMyHand.middle.length !== 5 || arrangedMyHand.tail.length !== 5) {
        alert("请将手牌整理为头道3张，中道5张，尾道5张！");
        return;
    }

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
            if (data.results) {
                 displayGameResults(data.results);
                 const arrangeArea = document.getElementById('arrange-area');
                 const startGameButton = document.getElementById('start-game-button');
                 const myOriginalHandArea = document.getElementById('my-original-hand');
                 if(arrangeArea) arrangeArea.style.display = 'none';
                 if(startGameButton) startGameButton.style.display = 'block';
                 if(myOriginalHandArea) myOriginalHandArea.style.display = 'none';


            } else {
                alert("手牌已提交，等待其他玩家...");
                const arrangeArea = document.getElementById('arrange-area');
                 if(arrangeArea) arrangeArea.style.pointerEvents = 'none'; // 禁用交互
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

// 定义 displayGameResults 函数
function displayGameResults(results) {
    console.log("游戏结果:", results);
     let resultsHtml = '<h2>游戏结果</h2>';
     results.forEach(playerResult => {
          resultsHtml += `<h3>${playerResult.playerId}</h3>`;
          resultsHtml += `<p>得分: ${playerResult.score}</p>`;
           resultsHtml += `<div class="arranged-hand-result">`;
           resultsHtml += `<h4>头道 (${playerResult.arrangedHand.head && playerResult.arrangedHand.head.length > 0 ? getHandType(playerResult.arrangedHand.head).type : '无牌'})</h4><div class="cards"></div>`;
           resultsHtml += `<h4>中道 (${playerResult.arrangedHand.middle && playerResult.arrangedHand.middle.length > 0 ? getHandType(playerResult.arrangedHand.middle).type : '无牌'})</h4><div class="cards"></div>`;
           resultsHtml += `<h4>尾道 (${playerResult.arrangedHand.tail && playerResult.arrangedHand.tail.length > 0 ? getHandType(playerResult.arrangedHand.tail).type : '无牌'})</h4><div class="cards"></div>`;
           resultsHtml += `</div>`;
     });

     let resultsArea = document.getElementById('results-area');
     if (!resultsArea) {
          resultsArea = document.createElement('div');
          resultsArea.id = 'results-area';
          const gameContainer = document.getElementById('game-container');
           if (gameContainer) gameContainer.appendChild(resultsArea);
     }
     resultsArea.innerHTML = resultsHtml;

     // 在结果区域显示每个玩家整理好的手牌图片
     results.forEach(playerResult => {
          const arrangedHandResultDiv = resultsArea.querySelector(`#results-area h3:contains("${playerResult.playerId}") + p + div.arranged-hand-result`);
          if (arrangedHandResultDiv) {
               const headCardsContainer = arrangedHandResultDiv.querySelector('h4:contains("头道") + .cards');
               const middleCardsContainer = arrangedHandResultDiv.querySelector('h4:contains("中道") + .cards');
               const tailCardsContainer = arrangedHandResultDiv.querySelector('h4:contains("尾道") + .cards');

               if (headCardsContainer && playerResult.arrangedHand.head) {
                   playerResult.arrangedHand.head.forEach(card => {
                       const cardDiv = document.createElement('div');
                       cardDiv.classList.add('card');
                       const filename = getCardFilename(card);
                        if (filename) {
                           cardDiv.style.backgroundImage = `url('/images/${filename}')`;
                        } else {
                            cardDiv.classList.add('text-only');
                            cardDiv.textContent = `${card.rank}${card.suit}`;
                        }
                       headCardsContainer.appendChild(cardDiv);
                   });
               }
               if (middleCardsContainer && playerResult.arrangedHand.middle) {
                    playerResult.arrangedHand.middle.forEach(card => {
                        const cardDiv = document.createElement('div');
                        cardDiv.classList.add('card');
                        const filename = getCardFilename(card);
                         if (filename) {
                            cardDiv.style.backgroundImage = `url('/images/${filename}')`;
                         } else {
                            cardDiv.classList.add('text-only');
                            cardDiv.textContent = `${card.rank}${card.suit}`;
                         }
                        middleCardsContainer.appendChild(cardDiv);
                    });
               }
               if (tailCardsContainer && playerResult.arrangedHand.tail) {
                       playerResult.arrangedHand.tail.forEach(card => {
                           const cardDiv = document.createElement('div');
                           cardDiv.classList.add('card');
                           const filename = getCardFilename(card);
                           if (filename) {
                              cardDiv.style.backgroundImage = `url('/images/${filename}')`;
                           } else {
                                cardDiv.classList.add('text-only');
                                cardDiv.textContent = `${card.rank}${card.suit}`;
                           }
                           tailCardsContainer.appendChild(cardDiv);
                       });
               }

          }
     });


}


// TODO: 实现 getHandType 函数 (前端用于显示牌型名称)
// 这需要与后端的牌型判断逻辑一致
function getHandType(hand) {
     if (!hand || hand.length === 0) return { type: '无牌' };

     if (hand.length === 3) {
         if (isThreeOfAKind(hand)) return { type: '三条' };
         if (isPair(hand)) return { type: '对子' };
         return { type: '散牌' };
     } else if (hand.length === 5) {
          if (isStraightFlush(hand)) return { type: '同花顺' };
          if (isFourOfAKind(hand)) return { type: '四条' };
          if (isFullHouse(hand)) return { type: '葫芦' };
          if (isFlush(hand)) return { type: '同花' };
          if (isStraight(hand)) return { type: '顺子' };
          if (isThreeOfAKind(hand)) return { type: '三条' };
          if (isTwoPair(hand)) return { type: '两对' };
          if (isPair(hand)) return { type: '对子' };
         return { type: '散牌' };
     }
     return { type: '无效牌型' };
}

// 前端简化牌型判断函数 (只用于显示名称) - 与后端的逻辑保持一致
function isPair(hand) {
     const rankCounts = {};
     for (const card of hand) {
         rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
     }
     return Object.values(rankCounts).some(count => count === 2);
}

function isTwoPair(hand) {
     const rankCounts = {};
      for (const card of hand) {
          rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
      }
      let pairs = 0;
      for (const count of Object.values(rankCounts)) {
          if (count === 2) pairs++;
      }
      return pairs === 2;
}

function isThreeOfAKind(hand) {
     const rankCounts = {};
      for (const card of hand) {
          rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
      }
      return Object.values(rankCounts).some(count => count === 3);
}

function isStraight(hand) {
    if (hand.length < 5) return false;
    const ranks = {
       '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
       'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    const ranksValue = hand.map(card => ranks[card.rank]).sort((a, b) => a - b);

    let consecutive = true;
    for (let i = 0; i < ranksValue.length - 1; i++) {
        if (ranksValue[i + 1] !== ranksValue[i] + 1) {
            consecutive = false;
            break;
        }
    }

     if (!consecutive && hand.length === 5) {
          const ranksAceLow = {
               '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
               'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 1
          };
          const ranksValueForAceLow = hand.map(card => ranksAceLow[card.rank]).sort((a, b) => a - b);
         consecutive = true;
         for (let i = 0; i < ranksValueForAceLow.length - 1; i++) {
              if (ranksValueForAceLow[i + 1] !== ranksValueForAceLow[i] + 1) {
                  consecutive = false;
                  break;
              }
          }
     }

    return consecutive;
}

function isFlush(hand) {
     if (hand.length < 5) return false;
     const firstSuit = hand[0].suit;
     return hand.every(card => card.suit === firstSuit);
}

function isFullHouse(hand) {
     if (hand.length !== 5) return false;
      const rankCounts = {};
       for (const card of hand) {
           rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
       }
       const counts = Object.values(rankCounts);
       return (counts.includes(3) && counts.includes(2));
}

function isFourOfAKind(hand) {
    if (hand.length < 4) return false;
    const rankCounts = {};
     for (const card of hand) {
         rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
     }
     return Object.values(rankCounts).some(count => count === 4);
}

function isStraightFlush(hand) {
     return isStraight(hand) && isFlush(hand);
}


document.addEventListener('DOMContentLoaded', () => {
  const startGameButton = document.getElementById('start-game-button');
  const gameContainer = document.getElementById('game-container');

  // 创建游戏标题元素并添加到 gameContainer
  const gameTitleDiv = document.createElement('div');
  gameTitleDiv.id = 'game-title';
  gameTitleDiv.innerHTML = '<h1>十三水游戏</h1>';
  gameContainer.appendChild(gameTitleDiv);


  // 创建玩家手牌区域的容器并添加到 gameContainer
  const playerAreas = {};
  playerAreas['top'] = createPlayerArea('player-top', '玩家 2');
  playerAreas['left'] = createPlayerArea('player-left', '玩家 3');
  playerAreas['right'] = createPlayerArea('player-right', '玩家 4');

  // 创建牌桌区域并添加到 gameContainer
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
   myOriginalHandArea.classList.add('player-area');
   myOriginalHandArea.innerHTML = '<h3>我的手牌</h3><div class="cards"></div>';
   gameContainer.appendChild(myOriginalHandArea);


   // 添加整理牌型的区域
   const arrangeArea = document.createElement('div');
   arrangeArea.id = 'arrange-area';
   arrangeArea.style.display = 'none'; // 默认隐藏
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
   gameContainer.appendChild(arrangeArea);

   const submitArrangeButton = document.getElementById('submit-arrange');


  if (startGameButton) {
      startGameButton.addEventListener('click', startGame);
  } else {
      console.error("Start game button not found!");
  }

  if (submitArrangeButton) {
      submitArrangeButton.addEventListener('click', submitArrangement);
  }


  // 实现拖放功能 (在 DOMContentLoaded 内部获取元素并绑定事件)
  const handSections = document.querySelectorAll('.hand-section .cards');
  handSections.forEach(section => {
      section.addEventListener('dragover', (event) => {
          event.preventDefault();
      });

      section.addEventListener('drop', (event) => {
          event.preventDefault();
          const cardData = JSON.parse(event.dataTransfer.getData('text/plain'));
          const droppedCard = { rank: cardData.rank, suit: cardData.suit };

          const sectionId = section.closest('.hand-section').id;
          if (sectionId === 'head-section' && arrangedMyHand.head.length < 3) {
              arrangedMyHand.head.push(droppedCard);
              addCardToSection(droppedCard, section);
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
          } // 确保这里的花括号是闭合的

      }); // 确保这里的花括号是闭合的
  }); // 确保这里的花括号是闭合的


   // 允许将牌拖回原始手牌区域 (在 DOMContentLoaded 内部获取元素并绑定事件)
    const myOriginalHandCardsContainer = document.getElementById('my-original-hand').querySelector('.cards');
    if (myOriginalHandCardsContainer) {
        myOriginalHandCardsContainer.addEventListener('dragover', (event) => {
             event.preventDefault();
        });

        myOriginalHandCardsContainer.addEventListener('drop', (event) => {
            event.preventDefault();
            const cardData = JSON.parse(event.dataTransfer.getData('text/plain'));
            const droppedCard = { rank: cardData.rank, suit: cardData.suit };
            const fromArrange = event.dataTransfer.getData('text/from-arrange') === 'true';

            if (fromArrange) {
                myHand.push(droppedCard);
                addCardToSection(droppedCard, myOriginalHandCardsContainer);
                removeCardFromArrangedHand(droppedCard);
            }
        });
    }


  // TODO: 添加更多客户端逻辑
}); // 确保这里的花括号是闭合的
