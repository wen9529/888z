// 连接WebSocket服务器
const socket = io();

// DOM元素获取
const usernameInput = document.getElementById('username');
const connectButton = document.getElementById('connect-button');
const gameArea = document.getElementById('game-area');

// 连接成功
socket.on('connect', () => {
    console.log('连接到服务器');
});

// 连接错误
socket.on('connect_error', (error) => {
    console.error('WebSocket连接错误:', error);
});

// 断开连接
// 更新玩家列表
socket.on('player_list', (players) => {
const usernameInput = document.getElementById('username');
const connectButton = document.getElementById('connect-button');
const gameArea = document.getElementById('game-area');
const playerNameElement = document.getElementById('player-name');
const playerListElement = document.getElementById('player-list');
const cardsElement = document.getElementById('cards');
const playArea = document.getElementById('play-area');
const playButton = document.getElementById('play-button');
const passButton = document.getElementById('pass-button');
const gameStatusElement = document.getElementById('game-status');
const errorMessageElement = document.getElementById('error-message'); // 获取错误信息显示区域
const usernameSection = document.getElementById('username-section');
const gameSection = document.getElementById('game-section'); // 新增游戏界面容器

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
 displayError(`WebSocket连接错误: ${error.message}`); // 在UI上显示连接错误
});

// 断开连接
socket.on('disconnect', (reason) => {
 console.log('从服务器断开连接:', reason);
 displayError(`从服务器断开连接: ${reason}`); // 在UI上显示断开连接信息
 // 根据断开连接的原因，可以进行重连尝试或其他处理
});

// 加入房间成功 (现在是自动加入固定房间1)
socket.on('joined_room', (data) => {
 console.log('成功加入房间:', data);
 myPlayerId = data.playerId; // 存储自己的玩家ID
 playerNameElement.textContent = `你的名字: ${data.username}`; // 显示玩家名字
 // 不需要隐藏房间选择或显示大厅，直接等待游戏开始
});

// 游戏开始
socket.on('game_started', (data) => {
 console.log('游戏开始:', data);
 // 隐藏用户名输入和房间选择界面，显示游戏界面
 usernameSection.style.display = 'none';
 gameSection.style.display = 'block'; // 显示游戏界面
 gameStatusElement.textContent = '游戏进行中...';
 displayCards(data.hand); // 显示玩家手牌
 updatePlayerAreas(data.players, myPlayerId); // 更新玩家区域显示
});

// 更新手牌
socket.on('your_hand', (hand) => {
 console.log('手牌更新:', hand);
 displayCards(hand); // 显示玩家手牌
});

// 更新牌桌上的牌
socket.on('update_play_area', (play) => {\n    console.log('牌桌上的牌更新:', play);\n    displayPlayArea(play); // 显示牌桌上的牌\n});\n\n// 提示轮到谁出牌\nsocket.on('next_turn', (data) => {\n    console.log('轮到玩家', data.playerId, '出牌');\n    if (data.playerId === myPlayerId) {\n        gameStatusElement.textContent = '轮到你出牌';\n        playButton.disabled = false; // 启用出牌按钮\n        passButton.disabled = false; // 启用过牌按钮\n    } else {\n        const playerInfo = playerList.find(p => p.id === data.playerId);\n        if (playerInfo) {\n            const playerName = playerInfo.username; // 获取玩家的用户名\n            gameStatusElement.textContent = \`轮到 ${playerName} 出牌\`;\n        }\n        playButton.disabled = true; // 禁用出牌按钮\n        passButton.disabled = true; // 禁用过牌按钮\n    }\n});\n\n// 游戏结束\nsocket.on('game_over', (data) => {\n    console.log('游戏结束:', data);\n    gameStatusElement.textContent = \`游戏结束！胜利者是：${data.winnerId}\`;\n    // 可以添加其他游戏结束后的处理，例如显示结算信息等\n    // 游戏结束后可以显示重置游戏的按钮或者返回大厅\n});\n\n// 错误信息\nsocket.on('game_error', (message) => {\n    console.error('游戏错误:', message);\n    displayError(`游戏发生错误: ${message}`); // 在UI上显示错误信息\n});\n\n// 通用错误处理\nsocket.on('error', (message) => {\n    console.error('服务器错误:', message);\n    displayError(`服务器错误: ${message}`);\n});\n\n// 显示错误信息到页面\nfunction displayError(message) {\n    errorMessageElement.textContent = message;\n    errorMessageElement.style.display = 'block';\n    // 错误信息显示一段时间后自动隐藏\n    setTimeout(() => {\n        errorMessageElement.style.display = 'none';\n    }, 5000); // 5秒后隐藏\n}\n\n// 更新玩家列表显示 (在大厅中使用)\nfunction updatePlayerList(players) {\n    // 在简化模式下，可能不再需要大厅中的玩家列表，但保留此函数以便将来扩展\n    const listElement = document.getElementById('lobby-player-list'); // 假设大厅玩家列表元素仍然存在\n    if (listElement) {\n        listElement.innerHTML = ''; // 清空现有列表\n        players.forEach(player => {\n            const li = document.createElement('li');\n            li.textContent = \`\${player.username} (\${player.ready ? '已准备' : '未准备'})\`; // 在简化模式下ready状态可能不相关\n            if (player.id === myPlayerId) {\n                li.style.fontWeight = 'bold'; // 标记自己\n            }\n            listElement.appendChild(li);\n        });\n    }\n}\n\n// 连接按钮点击事件 (现在改为设置用户名并自动加入房间1)\nconnectButton.addEventListener('click', () => {\n    const username = usernameInput.value.trim();\n    if (username) {\n        socket.emit('set_username', username);\n        // 设置用户名后，自动加入固定房间 '1'\n        socket.emit('join_room', '1');\n        // 连接成功并加入房间后，隐藏用户名输入界面，显示游戏界面\n        usernameSection.style.display = 'none';\n        gameSection.style.display = 'block'; // 显示游戏界面\n    } else {\n        alert('请输入用户名');\n    }\n});\n\n// 出牌按钮点击事件\nplayButton.addEventListener('click', () => {\n    if (selectedCards.length > 0) {\n        socket.emit('play_cards', selectedCards);\n        selectedCards = []; // 清空选中牌\n    } else {\n        alert('请选择要出的牌');\n    }\n});\n\n// 过牌按钮点击事件\npassButton.addEventListener('click', () => {\n    socket.emit('pass_turn');\n    selectedCards = []; // 清空选中牌\n});\n\n// 检查图片是否存在，如果不存在则显示文字\nfunction checkImage(cardElement, card) {\n    const img = new Image();\n    img.onerror = function() {\n        // 图片不存在，显示文字\n        cardElement.style.backgroundImage = 'none';\n        cardElement.classList.add('text-only'); // 添加 text-only 类\n        cardElement.textContent = \`\${card.rank}\${card.suit}\`; // 显示牌的文字\n    };\n    img.src = \`images/\${card.rank}_of_\${card.suit.toLowerCase()}.png\`;\n}\n\n// 显示玩家手牌\nfunction displayCards(hand) {\n    cardsElement.innerHTML = ''; // 清空现有手牌显示\n    hand.forEach(card => {\n        const cardElement = document.createElement('div');\n        cardElement.classList.add('card');\n        cardElement.dataset.card = \`\${card.rank}\${card.suit}\`; // 存储牌的信息\n        cardElement.style.backgroundImage = \`url('images/\${card.rank}_of_\${card.suit.toLowerCase()}.png')\`;\n        cardElement.addEventListener('click', () => {\n            // 选中/取消选中牌\n            if (selectedCards.some(c => c.rank === card.rank && c.suit === card.suit)) {\n                selectedCards = selectedCards.filter(c => !(c.rank === card.rank && c.suit === card.suit));\n                cardElement.classList.remove('selected');\n            } else {\n                selectedCards.push(card);\n                cardElement.classList.add('selected');\n            }\n            console.log('当前选中牌:', selectedCards);\n        });\n        checkImage(cardElement, card);\n        cardsElement.appendChild(cardElement);\n    });\n}\n\n// 显示牌桌上的牌\nfunction displayPlayArea(play) {\n    playArea.innerHTML = ''; // 清空现有牌桌显示\n    if (play && play.length > 0) {\n        play.forEach(card => {\n            const cardElement = document.createElement('div');\n            cardElement.classList.add('card', 'played'); // 添加 played 类\n            cardElement.style.backgroundImage = \`url('images/\${card.rank}_of_\${card.suit.toLowerCase()}.png')\`;\n            checkImage(cardElement, card);\n            playArea.appendChild(cardElement);\n        });\n    } else {\n        playArea.textContent = '牌桌上没有牌';\n    }\n}\n\n// 更新玩家区域显示 (在游戏界面中使用)\nfunction updatePlayerAreas(players, myPlayerId) {\n    // 根据玩家数量和自己的位置，确定其他玩家的位置\n    const playerPositions = {};\n    const myIndex = players.findIndex(p => p.id === myPlayerId);\n    const numPlayers = players.length;\n\n    if (numPlayers === 4) {\n        playerPositions[players[myIndex].id] = 'player1'; // 自己是player1 (底部)\n        playerPositions[players[(myIndex + 1) % numPlayers].id] = 'player2'; // 左边\n        playerPositions[players[(myIndex + 2) % numPlayers].id] = 'player3'; // 顶部\n        playerPositions[players[(myIndex + 3) % numPlayers].id] = 'player4'; // 右边\n    } else if (numPlayers === 3) {\n        playerPositions[players[myIndex].id] = 'player1'; // 自己是player1\n        playerPositions[players[(myIndex + 1) % numPlayers].id] = 'player2'; // 左边\n        playerPositions[players[(myIndex + 2) % numPlayers].id] = 'player3'; // 顶部\n        // player4区域留空\n    } else if (numPlayers === 2) {\n        playerPositions[players[myIndex].id] = 'player1'; // 自己是player1\n        playerPositions[players[(myIndex + 1) % numPlayers].id] = 'player2'; // 左边\n        // player3和player4区域留空\n    }\n\n\n    // 清空所有玩家区域显示\n    Object.values(playerNames).forEach(el => el.textContent = '');\n    Object.values(playerHands).forEach(el => el.innerHTML = '');\n    Object.values(playerAreas).forEach(el => el.style.display = 'none'); // 先隐藏所有区域\n\n    // 根据玩家位置显示玩家信息和手牌数量\n    players.forEach(player => {\n        const position = playerPositions[player.id];\n        if (position) {\n            playerAreas[position].style.display = 'block'; // 显示对应区域\n            playerNames[position].textContent = player.username;\n            if (player.id !== myPlayerId) {\n                // 显示其他玩家手牌数量\n                playerHands[position].textContent = `手牌数: ${player.handSize}`; // 这里的handSize应该从服务器端获取\n            } else {\n                // 自己的手牌已经单独显示在下方了\n                playerHands[position].textContent = '';\n            }\n        }\n    });\n}\n\n// TODO: 可能需要根据实际游戏逻辑调整updatePlayerList和updatePlayerAreas函数的使用\n\n// 客户端错误处理 (可选)\nwindow.onerror = (message, source, lineno, colno, error) => {\n    console.error('客户端JS错误:', message, source, lineno, colno, error);\n    displayError(`客户端错误: ${message}`);\n};\n\n","status":"succeeded"}}
const socket = io();

// DOM元素获取
const usernameInput = document.getElementById('username');
const connectButton = document.getElementById('connect-button');
const usernameSection = document.getElementById('username-section');
const gameSection = document.getElementById('game-section'); // 新增游戏界面容器
const playerNameElement = document.getElementById('player-name');
const cardsElement = document.getElementById('cards');
const playArea = document.getElementById('play-area');
const playButton = document.getElementById('play-button');
const passButton = document.getElementById('pass-button');
const gameStatusElement = document.getElementById('game-status');
const errorMessageElement = document.getElementById('error-message'); // 获取错误信息显示区域

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


let playerList = []; // 存储玩家列表 (现在主要用于游戏中的玩家信息)
let myPlayerId = null; // 存储当前玩家的ID
let selectedCards = []; // 存储当前选中的牌

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

// 接收到玩家列表更新 (主要在游戏开始后接收，包含手牌数量等)
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
socket.on('game_started', (data) => {
    console.log('游戏开始:', data);
    // 隐藏大厅界面，显示游戏界面
    lobbyElement.style.display = 'none';
    gameArea.style.display = 'block';
    gameStatusElement.textContent = '游戏进行中...';
    displayCards(data.hand); // 显示玩家手牌
    updatePlayerAreas(data.players, myPlayerId); // 更新玩家区域显示
});

// 更新手牌（更名为 your_hand 以与服务器端一致）
socket.on('your_hand', (hand) => {
    console.log('手牌更新:', hand);
    displayCards(hand); // 显示玩家手牌
});

// 更新手牌
// 更新牌桌上的牌
socket.on('update_play_area', (play) => {
    console.log('牌桌上的牌更新:', play);
    displayPlayArea(play); // 显示牌桌上的牌
});
// 更新牌桌上的牌
socket.on('update_play_area', (play) => {
    console.log('牌桌上的牌更新:', play);
    displayPlayArea(play); // 显示牌桌上的牌
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
        if (playerInfo) {
            const playerName = playerInfo.username; // 获取玩家的用户名
            gameStatusElement.textContent = \`轮到 ${playerName} 出牌\`;
        }
        playButton.disabled = true; // 禁用出牌按钮
        passButton.disabled = true; // 禁用过牌按钮
    }
});

// 游戏结束
socket.on('game_over', (data) => {
    console.log('游戏结束:', data);
    gameStatusElement.textContent = \`游戏结束！胜利者是：${data.winnerId}\`;
    // 可以添加其他游戏结束后的处理，例如显示结算信息等
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

console.log("joinRoomButton",joinRoomButton)
// 加入房间按钮点击事件
joinRoomButton.addEventListener('click', () => {
    const roomId = document.getElementById('join-room-input').value.trim();
    if (roomId) {
        socket.emit('join_room', roomId);
    } else {
        alert('请输入房间ID');
        console.log("joinRoomButton clicked")
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

}
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
