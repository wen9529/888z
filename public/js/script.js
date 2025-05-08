// 连接WebSocket服务器
const socket = io();

document.addEventListener('DOMContentLoaded', () => {

// DOM元素引用
const usernameInput = document.getElementById('username');


const usernameSection = document.getElementById('username-section');
const roomSelection = document.getElementById('room-selection');
const lobbyElement = document.getElementById('lobby');
const joinRoomButton = document.getElementById('join-room-button');
const createRoomButton = document.getElementById('create-room-button');
// const readyButton = document.getElementById('ready-button'); // Removed ready button
const readyButton = document.getElementById('ready-button'); 
const gameArea = document.getElementById('game-container');
const playerNameElement = document.getElementById('current-room-display');
const playerListElement = document.getElementById('player-list'); // player-list
const cardsElement = document.querySelector('#player-bottom .cards'); // Updated to match index.html structure
const cardTable = document.getElementById('card-table');
const playButton = document.getElementById('play-cards-button');
const passButton = document.getElementById('pass-turn-button');
const gameStatusElement = document.getElementById('turn-indicator'); // Changed to match index.html
const errorMessageElement = document.getElementById('error-message');
const currentPlayArea = document.querySelector('#current-play .cards');

const currentTurnElement = document.getElementById('current-turn');
const currentPlayInfoElement = document.getElementById('current-play-info');
const remainingCardsElement = document.getElementById('remaining-cards');
const gameOverResultElement = document.getElementById('game-over-result');









const playerAreas = {
    player1: document.getElementById('player-bottom'), // Changed to match ID in index.html
    player2: document.getElementById('player-left'), // Changed to match ID in index.html
    player3: document.getElementById('player-top'),   // Changed to match ID in index.html
    player4: document.getElementById('player-right'), // Changed to match ID in index.html
};
const playerNames = {
    player1: document.querySelector('#player-bottom h3'),
    player2: document.querySelector('#player-left h3'),
    player3: document.querySelector('#player-top h3'),
    player4: document.querySelector('#player-right h3'),
};
const playerHandSizes = {
    player1: document.querySelector('#player-bottom .hand-size'),
    player2: document.querySelector('#player-left .hand-size'),
    player3: document.querySelector('#player-top .hand-size'),
    player4: document.querySelector('#player-right .hand-size')
const playerHands = {
    player1: document.querySelector('#player-bottom .cards'),
    player2: document.querySelector('#player-left .cards'),
    player3: document.querySelector('#player-top .cards'),
    player4: document.querySelector('#player-right .cards'),
};


let playerList = []; // 存储玩家列表
let myPlayerId = null; // 存储当前玩家的ID
let selectedCards = []; // 存储当前选中的牌
let currentRoomId = null; // 存储当前房间ID

//设置用户名和显示房间选择界面

if(joinRoomButton){
    joinRoomButton.addEventListener('click', () => {
        const roomIdInput = document.getElementById('join-room-input');
        const roomId = roomIdInput ? roomIdInput.value.trim() : '';
        const username = usernameInput.value.trim();
        if (username) {
            socket.emit('set_username', username);
            // 设置用户名后，隐藏用户名输入界面，显示房间选择界面
            if (roomId) {
                socket.emit('join_room', roomId);
            } else {
                alert('请输入房间ID');
            }
        } else {
            alert('请输入用户名');
        }
    });
    createRoomButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (username) {
             socket.emit('create_room');
        } else {
            alert('请输入用户名');
        }
    });
}





// 连接成功
socket.on('connect', () => {
    console.log('连接到服务器');
});

// 连接错误
socket.on('connect_error', (error) => {
    console.error('WebSocket连接错误:', error);
    displayError(`WebSocket连接错误: ${error.message}`); // 在UI上显示连接错误
});

// 断开连接
socket.on('disconnect', (reason) => {
    console.log('从服务器断开连接:', reason);
    displayError(`从服务器断开连接: ${reason}`); // 在UI上显示断开连接信息
    // 根据断开连接的原因，可以进行重连尝试或其他处理
});

// 接收到玩家列表更新 (现在主要用于大厅和游戏开始后的玩家信息)
socket.on('player_list', (players) => {
    console.log('玩家列表更新:', players);
    playerList = players; // 更新玩家列表
    updatePlayerList(playerList); // 更新玩家列表显示
});

// 创建房间成功
socket.on('room_created', (data) => {
    console.log('创建房间成功:', data);
    myPlayerId = data.playerId;
    currentRoomId = data.roomId;

    roomSelection.style.display = 'none';
    lobbyElement.style.display = 'block';
    playerNameElement.textContent = data.roomId;
});

// 加入房间失败
socket.on('join_room_error', (data) => {
    console.log('加入房间失败:', data);

    if (data.message) {
        displayError(data.message); // Display the error message
    } else {
        displayError("加入房间失败"); // Default error message if no specific message is provided
    }

// 加入房间成功
socket.on('joined_room', (data) => {
    console.log('成功加入房间:', data);
    myPlayerId = data.playerId; // 存储自己的玩家ID
    currentRoomId = data.roomId;

    if (usernameSection) {
        usernameSection.style.display = 'none'; // 隐藏用户名选择界面
    }
    roomSelection.style.display = 'none'; // Hide room selection
    lobbyElement.style.display = 'block'; // 显示大厅界面
    playerNameElement.textContent = data.roomId; // 在大厅显示房间号
    // updatePlayerList(data.players); // 在大厅显示玩家列表 (optional based on UI)
});

// 游戏开始
socket.on('game_started', (data) => {
    console.log('游戏开始:', data);
    lobbyElement.style.display = 'none'; // 隐藏大厅界面
    gameArea.style.display = 'grid'; // 显示游戏界面 (使用grid布局)
    // Hand is received in 'your_hand' event
    updatePlayerAreas(data.players, myPlayerId); // 更新玩家区域显示
    document.getElementById('game-status-message').textContent = '游戏开始！';
    // if (readyButton) readyButton.style.display = 'none'; // 隐藏准备按钮 if it exists //remove ready button
    gameStatusElement.style.display = 'block'; // 显示回合指示器
});

// 更新手牌
socket.on('your_hand', (hand) => {
    console.log('手牌更新:', hand);
    displayCards(hand); // 显示玩家手牌
});

// 更新牌桌上的牌
socket.on('cards_played', (data) => {
    console.log('牌桌上的牌更新:', data.play);
     displayPlayArea(data.play);
    // Update hand size for the player who played
    const playedPlayer = playerList.find(p => p.id === data.playerId);
    if (playedPlayer) {
        playedPlayer.handSize = data.handSize;
        updatePlayerAreas(playerList, myPlayerId); // Update player areas to show new hand size
    }
});

// Update to indicate whose turn it is
socket.on('next_turn', (data) => {
    console.log('轮到玩家', data.playerId, '出牌');
    const playerInfo = playerList.find(p => p.id === data.playerId);
    let playerName = '未知玩家';
    if (playerInfo) {
        playerName = playerInfo.username;
    }
    // 更新当前回合玩家显示
    if(currentTurnElement){
        currentTurnElement.textContent = `当前回合：${playerName}`;
    }
    
    
    if (data.playerId === myPlayerId) {
        // Update turn indicator for yourself
        gameStatusElement.textContent = 'Your turn to play';
        playButton.disabled = false; // 启用出牌按钮
        passButton.disabled = false; // 启用过牌按钮
    } else {
        const playerInfo = playerList.find(p => p.id === data.playerId);
        playButton.disabled = true; // 禁用出牌按钮
        passButton.disabled = true; // 禁用过牌按钮
    }

});

// 游戏结束




socket.on('game_over', (data) => {
    gameOverResultElement.style.display = 'block';
    gameOverResultElement.innerHTML = ''; // 清空之前的内容
    console.log('游戏结束:', data);
    if (data.winnerId) {
        const winner = playerList.find(p => p.id === data.winnerId);
        const winnerName = winner ? winner.username : '未知玩家';
        const winnerElement = document.createElement('p');
        winnerElement.textContent = `游戏结束！胜利者是：${winnerName}`;
        gameOverResultElement.appendChild(winnerElement);
        gameStatusElement.textContent = `游戏结束`;
    } else if (data.message) {
        const messageElement = document.createElement('p');
        messageElement.textContent = `游戏结束：${data.message}`;
        gameOverResultElement.appendChild(messageElement);
        gameStatusElement.textContent = `游戏结束`;
    } else {
         document.getElementById('game-status-message').textContent = `游戏结束`;
           gameStatusElement.textContent = `游戏结束`;
    }
    if (data.playerScores) {
        let scoreString = '游戏得分：';
        for (const playerId in data.playerScores) {
            scoreString += ` 玩家${playerId}剩余手牌数:${data.playerScores[playerId]}`;
            const scoreElement = document.createElement('p');
            const player = playerList.find(p => p.id === playerId) || {username: "未知玩家"};
            scoreElement.textContent = `玩家 ${player.username} 剩余手牌数：${data.playerScores[playerId]}`;
            gameOverResultElement.appendChild(scoreElement);
            
        }
    }
    // 游戏结束后可以显示重置游戏的按钮或者返回大厅
});

// 错误信息
socket.on('game_error', (message) => {
    console.error('游戏错误:', message);
    displayError(message); // 在UI上显示错误信息
});

// 通用错误处理
socket.on('error', (message) => {
    console.error('服务器错误:', message);
    displayError(`服务器错误: ${message}`);
});

// 玩家准备状态更新
socket.on('player_ready_status', (data) => {
    console.log(`玩家 ${data.playerId} 准备状态更新：${data.ready}`);
    // 更新玩家列表中的准备状态 (如果在大厅显示玩家列表的话)
    const playerInfo = playerList.find(p => p.id === data.playerId);
    if (playerInfo) {
        playerInfo.ready = data.ready;
        // updatePlayerList(playerList); // Update player list display in lobby
    }
});

// 玩家离开房间
socket.on('player_left', (data) => {
    console.log(`玩家 ${data.id} 离开了房间`);
    // Remove player from player list
    playerList = playerList.filter(p => p.id !== data.id);
    // Update player areas to reflect the departure
    updatePlayerAreas(playerList, myPlayerId);
    // Optionally update lobby player list if visible
    // updatePlayerList(playerList);
});

// 游戏重置
socket.on('game_reset', () => {
    console.log('游戏已重置');
    // Hide game area, show lobby/room selection
    gameArea.style.display = 'none';
    lobbyElement.style.display = 'block';
    currentPlayArea.innerHTML = ''; // Clear the table
    gameStatusElement.textContent = ''; // Clear status text
    document.getElementById('game-status-message').textContent = '游戏已重置，等待开始！';
    if (readyButton) readyButton.style.display = 'block'; // Show ready button if it exists
    selectedCards = []; // Clear selected cards
    // Player list will be updated by player_list event
});

// 一轮结束（清空桌面牌）
socket.on('round_ended', () => {
        document.getElementById('game-status-message').textContent = '一轮结束，清空桌面';
    console.log('一轮结束，清空桌面');
    displayPlayArea([]); // Clear the displayed play area
});

// 玩家过牌
socket.on('player_passed', (data) => {
    document.getElementById('game-status-message').textContent = `玩家 ${data.playerId} 过牌`;
    console.log(`玩家 ${data.playerId} 过牌`);
    // Optional: Display a message or indicator that the player passed
});


// 显示错误信息到页面
function displayError(message) {
    errorMessageElement.textContent = message;
    errorMessageElement.style.display = 'block';
    // 错误信息显示一段时间后自动隐藏
    setTimeout(() => {
        errorMessageElement.style.display = 'none';
    }, 5000); // 5秒后隐藏
}


// 更新玩家列表显示 (在大厅或游戏界面中使用，取决于UI设计)
function updatePlayerList(players) {
  // Find the lobby-player-list element
  const listElement = document.getElementById('lobby-player-list');
  if (listElement) {
    listElement.innerHTML = ''; // Clear existing list
    players.forEach(player => {
      // Create list item and set its content
      const li = document.createElement('li');
      li.textContent = `${player.username} ${player.ready ? '(已准备)' : ''}`;
      if (player.id === myPlayerId) {
        li.style.fontWeight = 'bold'; // Mark self
      }
            const li = document.createElement('li');
            li.textContent = `${player.username} ${player.ready ? '(已准备)' : ''}`;
            if (player.id === myPlayerId) {
                li.style.fontWeight = 'bold'; // Mark self
            }
            listElement.appendChild(li);
        });
    }
}

// 检查图片是否存在，如果不存在则显示文字
function checkImage(cardElement, card) {
    const img = new Image();
    img.onerror = function() {
        // 图片不存在，显示文字
        cardElement.style.backgroundImage = 'none';
        cardElement.classList.add('text-only');
        cardElement.textContent = `${card.rank}${card.suit}`;
    };
    img.onload = function() {
        // Image exists, set background image
        cardElement.style.backgroundImage = `url('images/${card.rank}_of_${card.suit}.png')`;
    };
    // Trigger image loading
    img.src = `images/${card.rank}_of_${card.suit}.png`;
}

// 显示玩家手牌
function displayCards(hand) {
    // Sort hand by rank (3 to 2), then by suit (Clubs, Diamonds, Hearts, Spades)
    const rankOrder = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
    const suitOrder = ['C', 'D', 'H', 'S'];
    
    hand.sort((a, b) => {
        const rankA = rankOrder.indexOf(a.rank);
        const rankB = rankOrder.indexOf(b.rank);
        if (rankA !== rankB) {
            return rankA - rankB;
        }
        const suitA = suitOrder.indexOf(a.suit);
        const suitB = suitOrder.indexOf(b.suit);
        return suitA - suitB;
    });





     cardsElement.innerHTML = '';
    hand.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        cardElement.dataset.card = `${card.rank}${card.suit}`; // 存储牌的信息
        cardElement.classList.add('flip-card-animation');

        // Use checkImage to handle potential missing images
        checkImage(cardElement, card);

        cardElement.addEventListener('click', () => {
            const cardInfo = { rank: card.rank, suit: card.suit };
            if (cardElement.classList.contains('selected')) {
                cardElement.classList.remove('selected');
                selectedCards = selectedCards.filter(c => !(c.rank === cardInfo.rank && c.suit === cardInfo.suit));
            } else {
                cardElement.classList.add('selected');
                selectedCards.push(cardInfo);
            }
            console.log('当前选中牌:', selectedCards);
        });
        cardsElement.appendChild(cardElement);
    });
}

// 显示牌桌上的牌
function displayPlayArea(play) {
    currentPlayArea.innerHTML = '';
    if (play && play.length > 0) {
        play.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('card', 'played'); // Add played class

            cardElement.classList.add('flip-card-animation');
            // Use checkImage to handle potential missing images
            checkImage(cardElement, card);

            currentPlayArea.appendChild(cardElement);
        });
    } else {
        currentPlayArea.textContent = '牌桌上没有牌';
    }
}

// 更新玩家区域显示
function updatePlayerAreas(players, myPlayerId) {
    // Define potential positions based on the number of players
     const positions = ['player1', 'player2', 'player3', 'player4'];
     const numPlayers = players.length;
     const myIndex = players.findIndex(p => p.id === myPlayerId);

     // Clear previous player info and hide areas
     positions.forEach(pos => {
         if (playerNames[pos]) playerNames[pos].textContent = '';
         if (playerHands[pos]) playerHands[pos].innerHTML = '';
         if (playerAreas[pos]) playerAreas[pos].style.display = 'none';
     });

    if (myIndex === -1) {
        console.error("Current player not found in player list");
    }

    // Map player IDs to display positions based on current player's position
    const playerDisplayMapping = {};
    for (let i = 0; i < numPlayers; i++) {
        const playerIndex = (myIndex + i) % numPlayers;
        playerDisplayMapping[players[playerIndex].id] = positions[i];
    }

    // Display players based on the mapping
    players.forEach(player => {
        const displayPosition = playerDisplayMapping[player.id];
        if (displayPosition && playerAreas[displayPosition]) {
            playerAreas[displayPosition].style.display = 'block'; // Show the area
            if (playerNames[displayPosition]) {
                 playerNames[displayPosition].textContent = player.username;
            }
            if (player.id !== myPlayerId && playerHands[displayPosition]) {
                 if (playerHandSizes[displayPosition]) {
                    playerHandSizes[displayPosition].textContent = `手牌数：${player.handSize}`;
               }
            } else if (playerHands[displayPosition]&& playerHandSizes[displayPosition]) {
                 // Clear hand size for the current player
                 playerHandSizes[displayPosition].textContent = '';
            }
        }
    });
}



// 准备按钮点击事件
if (readyButton) { // Check if button exists
    readyButton.addEventListener('click', () => {
     //   socket.emit('player_ready');
    });
}//remove ready button


 // 出牌按钮点击事件
playButton.addEventListener('click', () => {
    if (selectedCards.length > 0) {
        socket.emit('play_cards', selectedCards);
        selectedCards = []; // 清空选中牌
        // Deselect cards visually (optional but good UX)
        document.querySelectorAll('.card.selected').forEach(cardEl => { cardEl.classList.remove('selected') });
    } else {
        alert('请选择要出的牌');
    };
});

passButton.addEventListener('click', () => {
    socket.emit('pass_turn');
    selectedCards = []; // 清空选中牌
     // Deselect cards visually (optional but good UX)
     document.querySelectorAll('.card.selected').forEach(cardEl => {
        cardEl.classList.remove('selected');
    });
});

// 客户端错误处理 (可选)
window.onerror = (message, source, lineno, colno, error) => {
    console.error('客户端JS错误:', message, source, lineno, colno, error);
    displayError(`客户端错误: ${message}`);
};
});

