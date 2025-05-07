// 连接WebSocket服务器
const socket = io();

// DOM元素引用
const usernameInput = document.getElementById('username');
const connectButton = document.getElementById('connect-button');
const usernameSection = document.getElementById('username-section');
const roomSelection = document.getElementById('room-selection');
const lobbyElement = document.getElementById('lobby');
const joinRoomButton = document.getElementById('join-room-button');
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

// 加入房间成功
socket.on('joined_room', (data) => {
    console.log('成功加入房间:', data);
    myPlayerId = data.playerId; // 存储自己的玩家ID
    currentRoomId = data.roomId;

    usernameSection.style.display = 'none'; // 隐藏用户名选择界面
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
    if (readyButton) readyButton.style.display = 'none'; // 隐藏准备按钮 if it exists
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

// 提示轮到谁出牌
socket.on('next_turn', (data) => {
    console.log('轮到玩家', data.playerId, '出牌');
    if (data.playerId === myPlayerId) {
        gameStatusElement.textContent = '轮到你出牌';
        playButton.disabled = false; // 启用出牌按钮
        passButton.disabled = false; // 启用过牌按钮
    } else {
        const playerInfo = playerList.find(p => p.id === data.playerId);
        let playerName = '未知玩家';
        if (playerInfo) {
            playerName = playerInfo.username; // 获取玩家的用户名
        }
        gameStatusElement.textContent = `轮到 ${playerName} 出牌`;
        playButton.disabled = true; // 禁用出牌按钮
        passButton.disabled = true; // 禁用过牌按钮
    }
});

// 游戏结束
socket.on('game_over', (data) => {
    console.log('游戏结束:', data);
    if (data.winnerId) {
        const winner = playerList.find(p => p.id === data.winnerId);
        const winnerName = winner ? winner.username : '未知玩家';
        gameStatusElement.textContent = `游戏结束！胜利者是：${winnerName}`;
    } else if (data.message) {
        gameStatusElement.textContent = `游戏结束：${data.message}`;
    } else {
        gameStatusElement.textContent = '游戏结束！';
    }
    // 可以添加其他游戏结束后的处理，例如显示结算信息等
    // 游戏结束后可以显示重置游戏的按钮或者返回大厅
});

// 错误信息
socket.on('game_error', (message) => {
    console.error('游戏错误:', message);
    displayError(`游戏发生错误: ${message}`); // 在UI上显示错误信息
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
    if (readyButton) readyButton.style.display = 'block'; // Show ready button if it exists
    selectedCards = []; // Clear selected cards
    // Player list will be updated by player_list event
});

// 一轮结束（清空桌面牌）
socket.on('round_ended', () => {
    console.log('一轮结束，清空桌面');
    displayPlayArea([]); // Clear the displayed play area
});

// 玩家过牌
socket.on('player_passed', (data) => {
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
    // This function's implementation depends on where and how you want to display the player list.
    // If you have a dedicated area for it, update its content here.
    console.log("Updating player list display (implementation needed)");
    // Example for a list in the lobby:
    const listElement = document.getElementById('lobby-player-list');
    if (listElement) {
         listElement.innerHTML = '';
         players.forEach(player => {
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
        cardElement.style.backgroundImage = `url('images/${card.rank}_of_${card.suit.toLowerCase()}.png')`;
    };
    // Trigger image loading
    img.src = `images/${card.rank}_of_${card.suit.toLowerCase()}.png`;
}

// 显示玩家手牌
function displayCards(hand) {
     cardsElement.innerHTML = '';
    hand.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        cardElement.dataset.card = `${card.rank}${card.suit}`; // 存储牌的信息

        // Use checkImage to handle potential missing images
        checkImage(cardElement, card);

        cardElement.addEventListener('click', () => {
            // Toggle card selection
            const isSelected = selectedCards.some(c => c.rank === card.rank && c.suit === card.suit);
            if (isSelected) {
                selectedCards = selectedCards.filter(c => !(c.rank === card.rank && c.suit === card.suit));
                cardElement.classList.remove('selected');
            } else {
                selectedCards.push(card);
                cardElement.classList.add('selected');
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
               // Display hand size for other players
            } else if (playerHands[displayPosition]) {
                 // Clear hand size for the current player
                 playerHands[displayPosition].textContent = '';
            }
        }
    });
}


// 连接按钮点击事件 (现在改为设置用户名并显示房间选择界面)
connectButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        socket.emit('set_username', username);
        // 设置用户名后，隐藏用户名输入界面，显示房间选择界面
        usernameSection.style.display = 'none';
        roomSelection.style.display = 'block';
    } else {
        alert('请输入用户名');
    }
}


// 加入房间按钮点击事件
if (joinRoomButton) { // Check if button exists
    joinRoomButton.addEventListener('click', () => {
        const roomIdInput = document.getElementById('join-room-input');
        const roomId = roomIdInput ? roomIdInput.value.trim() : '';
        if (roomId) {
            socket.emit('join_room', roomId);
        } else {
            alert('请输入房间ID');
        }
    });
}

// 准备按钮点击事件
if (readyButton) { // Check if button exists
    readyButton.addEventListener('click', () => {
        socket.emit('player_ready');
    });
}


// 出牌按钮点击事件
playButton.addEventListener('click', () => {
    if (selectedCards.length > 0) {
        socket.emit('play_cards', selectedCards);
        selectedCards = []; // 清空选中牌
        // Deselect cards visually (optional but good UX)
        document.querySelectorAll('.card.selected').forEach(cardEl => {
            cardEl.classList.remove('selected')});
    } else {
        alert('请选择要出的牌');
    }
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