// 连接WebSocket服务器
const socket = io();

// DOM元素获取
const usernameInput = document.getElementById('username');
const connectButton = document.getElementById('connect-button');
const roomSelection = document.getElementById('room-selection');
const createRoomButton = document.getElementById('create-room-button');
const joinRoomButton = document.getElementById('join-room-button');
const roomListElement = document.getElementById('room-list');
const lobbyElement = document.getElementById('lobby');
const gameArea = document.getElementById('game-area');
const playerNameElement = document.getElementById('player-name');
const playerListElement = document.getElementById('player-list');
const cardsElement = document.getElementById('cards');
const playArea = document.getElementById('play-area');
const playButton = document.getElementById('play-button');
const passButton = document.getElementById('pass-button');
const readyButton = document.getElementById('ready-button');
const gameStatusElement = document.getElementById('game-status');
const playerAreas = {
    player1: document.getElementById('player-1-area'),
    player2: document.getElementById('player-2-area'),
    player3: document.getElementById('player-3-area'),
    player4: document.getElementById('player-4-area'),
};
const playerNames = {
    player1: document.getElementById('player-1-name'),
    player2: document.getElementById('player-2-name'),
    player3: document.getElementById('player-3-name'),
    player4: document.getElementById('player-4-name'),
};
const playerHands = {
    player1: document.getElementById('player-1-hand'),
    player2: document.getElementById('player-2-hand'),
    player3: document.getElementById('player-3-hand'),
    player4: document.getElementById('player-4-hand'),
};


let playerList = []; // 存储玩家列表
let myPlayerId = null; // 存储当前玩家的ID
let selectedCards = []; // 存储当前选中的牌

// 连接成功
socket.on('connect', () => {
    console.log('连接到服务器');
});

// 连接错误
socket.on('connect_error', (error) => {
    console.error('WebSocket连接错误:', error);
});

// 断开连接
socket.on('disconnect', (reason) => {
    console.log('从服务器断开连接:', reason);
});

// 更新房间列表
socket.on('room_list', (rooms) => {
    console.log('房间列表更新:', rooms);
    roomListElement.innerHTML = ''; // 清空现有列表
    if (rooms.length === 0) {
        roomListElement.innerHTML = '<li>没有可用的房间</li>';
    } else {
        rooms.forEach(room => {
            const li = document.createElement('li');
            li.textContent = \`房间ID: ${room.id} (玩家: ${room.players})\`;
            li.dataset.roomId = room.id; // 存储房间ID
            li.addEventListener('click', () => {
                // 选中房间后，将房间ID填入选择框
                document.getElementById('join-room-input').value = room.id;
            });
            roomListElement.appendChild(li);
        });
    }
});

// 加入房间成功
socket.on('joined_room', (data) => {
    console.log('成功加入房间:', data);
    myPlayerId = data.playerId; // 存储自己的玩家ID
    // 隐藏房间选择界面，显示游戏大厅界面
    roomSelection.style.display = 'none';
    lobbyElement.style.display = 'block';
    playerNameElement.textContent = \`你的名字: ${data.username}\`;
    playerList = data.players; // 更新玩家列表
    updatePlayerList(playerList); // 更新玩家列表显示
});

// 创建房间成功
socket.on('room_created', (data) => {
    console.log('成功创建房间:', data);
    myPlayerId = data.playerId; // 存储自己的玩家ID
    // 隐藏房间选择界面，显示游戏大厅界面
    roomSelection.style.display = 'none';
    lobbyElement.style.display = 'block';
    playerNameElement.textContent = \`你的名字: ${data.username}\`;
    playerList = data.players; // 更新玩家列表
    updatePlayerList(playerList); // 更新玩家列表显示
});


// 房间已满
socket.on('room_full', () => {
    alert('房间已满，请选择其他房间');
});

// 房间不存在
socket.on('room_not_found', () => {
    alert('房间不存在，请检查房间ID');
});

// 更新玩家列表
socket.on('player_list', (players) => {
    console.log('玩家列表更新:', players);
    playerList = players; // 更新玩家列表
    updatePlayerList(playerList); // 更新玩家列表显示
});

// 更新玩家准备状态
socket.on('player_ready_status', (data) => {
    console.log(\`玩家 ${data.playerId} 准备状态更新：${data.ready}\`);
    // 更新玩家列表中的准备状态
    const playerInfo = playerList.find(p => p.id === data.playerId);
    if (playerInfo) {
        playerInfo.ready = data.ready;
        updatePlayerList(playerList); // 更新玩家列表显示
    }
});

// 游戏开始
socket.on('game_start', (data) => {
    console.log('游戏开始:', data);
    // 隐藏大厅界面，显示游戏界面
    lobbyElement.style.display = 'none';
    gameArea.style.display = 'block';
    gameStatusElement.textContent = '游戏进行中...';
    displayCards(data.hand); // 显示玩家手牌
    updatePlayerAreas(data.players, myPlayerId); // 更新玩家区域显示
});

// 更新手牌
socket.on('update_hand', (hand) => {
    console.log('手牌更新:', hand);
    displayCards(hand); // 显示玩家手牌
});

// 更新牌桌上的牌
socket.on('update_play_area', (play) => {
    console.log('牌桌上的牌更新:', play);
    displayPlayArea(play); // 显示牌桌上的牌
});

// 提示轮到谁出牌
socket.on('your_turn', () => {
    console.log('轮到你出牌了');
    gameStatusElement.textContent = '轮到你出牌';
    playButton.disabled = false; // 启用出牌按钮
    passButton.disabled = false; // 启用过牌按钮
});

// 提示轮到其他玩家出牌
socket.on('player_turn', (playerName) => {
    console.log(\`轮到玩家 ${playerName} 出牌了\`);
    gameStatusElement.textContent = \`轮到 ${playerName} 出牌\`;
    playButton.disabled = true; // 禁用出牌按钮
    passButton.disabled = true; // 禁用过牌按钮
});

// 游戏结束
socket.on('game_over', (data) => {
    console.log('游戏结束:', data);
    gameStatusElement.textContent = \`游戏结束！胜利者是：${data.winner}\`;
    // 可以添加其他游戏结束后的处理，例如显示结算信息等
});

// 错误信息
socket.on('game_error', (message) => {
    console.error('游戏错误:', message);
    alert(\`游戏发生错误: ${message}\`);
});


// ---- 事件监听 ----

// 连接按钮点击事件
connectButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        socket.emit('set_username', username);
        // 连接成功后，隐藏用户名输入，显示房间选择
        document.getElementById('username-section').style.display = 'none';
        roomSelection.style.display = 'block';
    } else {
        alert('请输入用户名');
    }
});

// 创建房间按钮点击事件
createRoomButton.addEventListener('click', () => {
    socket.emit('create_room');
});

// 加入房间按钮点击事件
joinRoomButton.addEventListener('click', () => {
    const roomId = document.getElementById('join-room-input').value.trim();
    if (roomId) {
        socket.emit('join_room', roomId);
    } else {
        alert('请输入房间ID');
    }
});

// 准备按钮点击事件
readyButton.addEventListener('click', () => {
    socket.emit('player_ready');
});

// 出牌按钮点击事件
playButton.addEventListener('click', () => {
    if (selectedCards.length > 0) {
        socket.emit('play_cards', selectedCards);
        selectedCards = []; // 清空选中牌
    } else {
        alert('请选择要出的牌');
    }
});

// 过牌按钮点击事件
passButton.addEventListener('click', () => {
    socket.emit('pass_turn');
    selectedCards = []; // 清空选中牌
});

// 检查图片是否存在，如果不存在则显示文字
function checkImage(cardElement, card) {
    const img = new Image();
    img.onerror = function() {
        // 图片不存在，显示文字
        cardElement.style.backgroundImage = 'none';
        cardElement.classList.add('text-only'); // 添加 text-only 类
        cardElement.textContent = `${card.rank}${card.suit}`; // 显示牌的文字
    };
    img.src = `images/${card.rank}_of_${card.suit.toLowerCase()}.png`;



// ---- 辅助函数 ----

// 更新玩家列表显示
function updatePlayerList(players) {
    const listElement = document.getElementById('lobby-player-list');
    listElement.innerHTML = ''; // 清空现有列表
    players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = \`${player.username} (\${player.ready ? '已准备' : '未准备'})\`;
        if (player.id === myPlayerId) {
            li.style.fontWeight = 'bold'; // 标记自己
        }
        listElement.appendChild(li);
    });
}

// 显示玩家手牌
function displayCards(hand) {
    cardsElement.innerHTML = ''; // 清空现有手牌显示
    hand.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        cardElement.dataset.card = \`${card.rank}${card.suit}\`; // 存储牌的信息
        cardElement.style.backgroundImage = \`url('images/${card.rank}_of_${card.suit.toLowerCase()}.png')\`;
        cardElement.addEventListener('click', () => {
            // 选中/取消选中牌
            if (selectedCards.some(c => c.rank === card.rank && c.suit === card.suit)) {
                selectedCards = selectedCards.filter(c => !(c.rank === card.rank && c.suit === card.suit));
                cardElement.classList.remove('selected');
            } else {
                selectedCards.push(card);
                cardElement.classList.add('selected');
            }
            console.log('当前选中牌:', selectedCards);
        });

        checkImage(cardElement, card);

        cardsElement.appendChild(cardElement);
    });
}

// 显示牌桌上的牌
function displayPlayArea(play) {
    playArea.innerHTML = ''; // 清空现有牌桌显示
    if (play && play.length > 0) {
        play.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('card', 'played'); // 添加 played 类
            cardElement.style.backgroundImage = \`url('images/${card.rank}_of_${card.suit.toLowerCase()}.png')\`;

            checkImage(cardElement, card);

            playArea.appendChild(cardElement);
        });
    } else {
        playArea.textContent = '牌桌上没有牌';
    }
}

// 更新玩家区域显示
function updatePlayerAreas(players, myPlayerId) {
    // 根据玩家数量和自己的位置，确定其他玩家的位置
    const playerPositions = {};
    const myIndex = players.findIndex(p => p.id === myPlayerId);
    const numPlayers = players.length;

    if (numPlayers === 4) {
        playerPositions[players[myIndex].id] = 'player1'; // 自己是player1
        playerPositions[players[(myIndex + 1) % numPlayers].id] = 'player2';
        playerPositions[players[(myIndex + 2) % numPlayers].id] = 'player3';
        playerPositions[players[(myIndex + 3) % numPlayers].id] = 'player4';
    } else if (numPlayers === 3) {
        playerPositions[players[myIndex].id] = 'player1'; // 自己是player1
        playerPositions[players[(myIndex + 1) % numPlayers].id] = 'player2';
        playerPositions[players[(myIndex + 2) % numPlayers].id] = 'player3';
        // player4区域留空
    } else if (numPlayers === 2) {
        playerPositions[players[myIndex].id] = 'player1'; // 自己是player1
        playerPositions[players[(myIndex + 1) % numPlayers].id] = 'player2';
        // player3和player4区域留空
    }


    // 清空所有玩家区域显示
    Object.values(playerNames).forEach(el => el.textContent = '');
    Object.values(playerHands).forEach(el => el.innerHTML = '');
    Object.values(playerAreas).forEach(el => el.style.display = 'none'); // 先隐藏所有区域

    // 根据玩家位置显示玩家信息和手牌数量
    players.forEach(player => {
        const position = playerPositions[player.id];
        if (position) {
            playerAreas[position].style.display = 'block'; // 显示对应区域
            playerNames[position].textContent = player.username;
            if (player.id !== myPlayerId) {
                // 显示其他玩家手牌数量
                playerHands[position].textContent = \`手牌数: ${player.handSize}\`;
            } else {
                // 自己的手牌已经单独显示在下方了
                playerHands[position].textContent = '';
            }
        }
    });
}
