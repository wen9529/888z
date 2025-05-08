const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const { createCard, initializeDeck, shuffleDeck, dealCards, getCardValue, getPlayType, comparePlays, checkPlay } = require('./gameLogic.js');




const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});


// 房间管理
const rooms = {};

function createPlayer(id, username) {
    return {
        id,
        hand: [], // Initialize with an empty hand
        username,
        ready: false,
        playerState: 'waiting' // 'waiting', 'playing', 'passed', 'winner'
    };
}

// Function to create a room
function createRoom(roomId) {
    return {
        id: roomId,
        players: {}, // { playerId: player }
        maxPlayers: 4,
        deck: [],
        currentPlayerId: null,
        roundState: 'new_round',
        currentPlay: [],
        playerOrder: [],
        state: 'waiting', // 'waiting', 'ready_check', 'dealing', 'playing_round', 'round_ended', 'game_over'
        ready: false,
        readyPlayers: 0,
        lastPlay: null,
        lastPlayPlayerId: null,
        passedPlayers: 0,
    };
}

// Reset game state
function resetGame(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.currentPlayerId = null;
    room.currentPlay = [];
    room.playerOrder = [];
    room.state = 'waiting';
    room.readyPlayers = 0;
    room.lastPlay = null;
    room.lastPlayPlayerId = null;
    room.passedPlayers = 0;

    for (const playerId in room.players) {
        room.players[playerId].hand = [];
        room.players[playerId].ready = false;
    }
    io.to(roomId).emit('game_reset');
    io.to(roomId).emit('player_list_updated', Object.values(room.players).map(p => ({ id: p.id, position: p.position, ready: p.ready })));
}

// Initialize game
function initializeGame(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.deck = shuffleDeck(initializeDeck());

    const hands = dealCards(room.deck, Object.keys(room.players).length);
    Object.keys(room.players).forEach((playerId, index) => {
        room.players[playerId].hand = hands[index];
    });

    let startPlayerId = null;
    Object.keys(room.players).forEach(playerId => {
        if (room.players[playerId].hand.some(card => card.rank === '3' && card.suit === 'C')) {
            startPlayerId = playerId;
        }
    });

    room.currentPlayerId = startPlayerId;
    room.playerOrder = Object.keys(room.players);
    const startIndex = room.playerOrder.indexOf(startPlayerId);
    room.playerOrder = room.playerOrder.slice(startIndex).concat(room.playerOrder.slice(0, startIndex))

    room.state = 'started';

    Object.keys(room.players).forEach((playerId) => {
        io.to(playerId).emit('your_hand', room.players[playerId].hand);
    });
    
    room.lastPlay = null;

    room.state = 'playing_round';
    Object.keys(room.players).forEach((playerId) => {
        room.players[playerId].status = 'playing';
    });

    io.to(roomId).emit('game_started', {
        startPlayerId: room.currentPlayerId,
        players: Object.values(room.players).map(p => ({ id: p.id, username: p.username, handSize: p.hand.length }))
    });
}


io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
   

    let currentRoomId = null;

    socket.on('set_username', (username) => {
        
        socket.username = username; // Store the username in the socket object
    });


    socket.on('create_room', () => {
        const roomId = uuidv4();
        currentRoomId = roomId; // Assign the new roomId to currentRoomId
        rooms[roomId] = createRoom(roomId);
        rooms[roomId].players[socket.id] = createPlayer(socket.id, socket.username);
        socket.join(roomId);
        console.log(`User ${socket.id} created and joined room ${roomId}`);
        //Assign position to player
        const availablePositions = ['bottom', 'left', 'top', 'right'].filter(pos => !Object.values(rooms[roomId].players).some(p => p.position === pos));
        if (availablePositions.length > 0) {
            rooms[roomId].players[socket.id].position = availablePositions[0];
        }
        socket.emit('room_created', { roomId, playerId: socket.id });
        io.to(roomId).emit('player_list', Object.values(rooms[roomId].players).map(player => ({ id: player.id, username: player.username })));
    });

    socket.on('join_room', (roomId) => {
        currentRoomId = roomId; // Assign the provided roomId to currentRoomId

        if (!rooms[roomId]) {
            socket.emit('join_room_error', 'Room not found');
            return;
        }
        if (Object.keys(rooms[roomId].players).length >= rooms[roomId].maxPlayers) {
            socket.emit('join_room_error', 'Room is full');
            return;
        }

        rooms[roomId].players[socket.id] = createPlayer(socket.id, socket.username);
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
        //Assign position to player
        const availablePositions = ['bottom', 'left', 'top', 'right'].filter(pos => !Object.values(rooms[roomId].players).some(p => p.position === pos));
        if (availablePositions.length > 0) {
            rooms[roomId].players[socket.id].position = availablePositions[0];
        }
        io.to(roomId).emit('player_list', Object.values(rooms[roomId].players).map(player => ({ id: player.id, username: player.username })));


        socket.emit('joined_room', {
            roomId: roomId,
            playerId: socket.id,
            username: rooms[roomId].players[socket.id].username,
        });


        //const availablePositions = ['bottom', 'left', 'top', 'right'].filter(pos => !Object.values(rooms[roomId].players).some(p => p.position === pos));
        //if (availablePositions.length > 0) {
        //    rooms[roomId].players[socket.id].position = availablePositions[0];
        //}
        //io.to(roomId).emit('player_list', Object.values(rooms[roomId].players).map(player => ({ id: player.id, username: player.username })));
        //socket.emit('joined_room', { roomId, playerId: socket.id, username: rooms[roomId].players[socket.id].username });
    });

      socket.on('player_ready', () => {
        if (!currentRoomId || !rooms[currentRoomId]) {
            socket.emit('error', 'You are not in any room');
            return;
        }
        const room = rooms[currentRoomId];

        // Update player's ready status
        if (room.players[socket.id]) {
            room.players[socket.id].ready = true;
            room.readyPlayers++
        }
    
        // Broadcast the player's ready status to all clients in the room
        io.to(currentRoomId).emit('player_ready_status', { playerId: socket.id, ready: true });
    
        // Check if all players are ready and if so, initialize the game
        if (room.readyPlayers === Object.keys(room.players).length && room.state === 'waiting') {
             initializeGame(currentRoomId);
        }
    });

    socket.on('play_cards', (cards) => {
         if (!currentRoomId || !rooms[currentRoomId]) {
             socket.emit('error', 'You are not in any room');
             return;
         }
        const room = rooms[currentRoomId];

        // Check if the room is in a state where playing is allowed
        if (room.state !== 'started' && room.state !== 'playing_round') {
             socket.emit('game_error', 'Error: Game has not started or has already ended');
             return;
        }
         // Check if it's the player's turn
         if (socket.id !== room.currentPlayerId) {
             socket.emit('game_error', 'Error: It is not your turn');
             return;
         }


        if (!Array.isArray(cards) || cards.length === 0) {
            socket.emit('game_error', 'Please select cards to play');
            return;
        }

        const playerHandRanks = room.players[socket.id].hand.map(card => `${card.rank}${card.suit}`);
        const validPlayInHand = cards.every(card =>
            playerHandRanks.includes(`${card.rank}${card.suit}`)
        );

        if (!validPlayInHand) {
            socket.emit('game_error', 'You do not have these cards');
            return;
        }

        const playCheck = checkPlay(cards, room.currentPlay);
       
        if (!playCheck.valid) {
            socket.emit('error', 'Error: Invalid card combination');
            return;
        }

        if (room.currentPlay && room.currentPlay.length > 0 && !playCheck.stronger) {
            socket.emit('error', 'Error: Your play is not strong enough compared to the previous play');
            return;
         }

        
        
        for (const card of cards) {
            const index = room.players[socket.id].hand.findIndex(hCard => hCard.rank === card.rank && hCard.suit === card.suit);
            if (index !== -1) {
                room.players[socket.id].hand.splice(index, 1);
            }
        }
        
        room.currentPlay = cards;
        room.lastPlay = cards;
        room.lastPlayPlayerId = socket.id;
        room.passedPlayers = 0;
        
        io.to(currentRoomId).emit('cards_played', { playerId: socket.id, play: cards, handSize: room.players[socket.id].hand.length });
      
        if (room.players[socket.id].hand.length === 0) { //If have no hand is winner
            // The player has played all their cards, they are the winner
            const playerScores = {};
             for (const playerId in room.players) {
                   playerScores[playerId] = room.players[playerId].hand.length;
             }
                 io.to(currentRoomId).emit('game_over', {
                     winnerId: socket.id,
                    playerScores: playerScores, // Include player scores
                 });
            room.players[socket.id].state = 'winner';
            io.to(currentRoomId).emit('game_over', { winnerId: socket.id});
            console.log(`Room ${currentRoomId} Game over, winner is ${socket.id}`);
            room.state = 'game_over';       
         }else {
            const currentIndex = room.playerOrder.indexOf(room.currentPlayerId);
            room.currentPlayerId = room.playerOrder[(currentIndex + 1) % room.playerOrder.length];

            io.to(currentRoomId).emit('next_turn', { playerId: room.currentPlayerId });
        }
    });


        
    

    socket.on('request_reset', () => {
        if (!currentRoomId || !rooms[currentRoomId]) {
            socket.emit('error', 'You are not in any room'); return;
        }
        resetGame(currentRoomId);
    });

    socket.on('pass_turn', () => {
        const room = rooms[currentRoomId];

        if (socket.id !== room.currentPlayerId || room.state !== 'started') {
            socket.emit('error', socket.id !== room.currentPlayerId ? 'Error: It is not your turn' : 'Error: Game has not started');
            return;
        }

        if (!room.currentPlay || room.currentPlay.length === 0) {
            socket.emit('error', 'Error: You cannot pass on the first play of a round');
            return;
        }

        
        io.to(currentRoomId).emit('player_passed', { playerId: socket.id });

        room.passedPlayers++;

        room.players[socket.id].playerState = 'passed';

        const playersInRoomCount = Object.keys(room.players).length;
        if (room.passedPlayers === playersInRoomCount - 1) {
            console.log(`Room ${currentRoomId} round ended, clearing table`);
            room.currentPlay = [];
            room.lastPlay = null;
            room.lastPlayPlayerId = null;
            room.passedPlayers = 0;
             Object.values(room.players).forEach((p)=>{p.playerState = 'playing'})
             if (room.lastPlayPlayerId) {//下一轮从最后出牌的人开始
                room.currentPlayerId = room.lastPlayPlayerId
             const currentIndex = room.playerOrder.indexOf(room.currentPlayerId);
                room.currentPlayerId = room.playerOrder[(currentIndex + 1) % room.playerOrder.length];
            }

            io.to(currentRoomId).emit('round_ended');
            io.to(currentRoomId).emit('next_turn', { playerId: room.currentPlayerId });

        } else {
            const currentIndex = room.playerOrder.indexOf(room.currentPlayerId);
            room.currentPlayerId = room.playerOrder[(currentIndex + 1) % room.playerOrder.length];
            io.to(currentRoomId).emit('next_turn', { playerId: room.currentPlayerId });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        if (currentRoomId && rooms[currentRoomId]) {
              const room = rooms[currentRoomId];

            let position = room.players[socket.id]?.position;
            if (room.players[socket.id]?.ready) {
                room.readyPlayers--;
                 room.players[socket.id].ready = false;
                // Broadcast the player's ready status to all clients in the room
                  io.to(currentRoomId).emit('player_ready_status', { playerId: socket.id, ready: false });
               
            }

            room.playerOrder = room.playerOrder.filter(id => id !== socket.id);
            delete room.players[socket.id];

            if (position) {
                io.to(currentRoomId).emit('player_left', { id: socket.id, position: position });
            }

            io.to(currentRoomId).emit('player_list_updated', Object.values(room.players).map(p => ({ id: p.id, position: p.position, ready: p.ready })));

            if (room.currentPlayerId === socket.id && room.state === 'started') {
                const playerIdsInRoom = Object.keys(room.players);
                if (playerIdsInRoom.length > 0) {
                    const currentIndex = room.playerOrder.indexOf(room.currentPlayerId);
                    let nextIndex = (currentIndex + 1) % room.playerOrder.length;
                    while (!room.players[room.playerOrder[nextIndex]] && Object.keys(room.players).length > 0) {
                        nextIndex = (nextIndex + 1) % room.playerOrder.length;
                        if (nextIndex === currentIndex) break;
                    }
                    if (room.players[room.playerOrder[nextIndex]]) {
                        room.currentPlayerId = room.playerOrder[nextIndex];
                        io.to(currentRoomId).emit('next_turn', { playerId: room.currentPlayerId });
                    } else {
                        io.to(currentRoomId).emit('game_over', { winnerId: null, message: 'Insufficient players, game ended' });
                        resetGame(currentRoomId);
                    }
                } else {
                     io.to(currentRoomId).emit('game_over', { winnerId: null, message: 'Insufficient players, game ended' });
                     resetGame(currentRoomId);
                }
            }

             if (room.state === 'started' && Object.keys(room.players).length < 2) { // Assuming minimum 2 players to continue a game
                console.log(`Room ${currentRoomId} has insufficient players, game ended`);
                io.to(currentRoomId).emit('game_over', { winnerId: null, message: 'Insufficient players, game ended' });
                resetGame(currentRoomId);
            }


           if (Object.keys(room.players).length === 0) {
                delete rooms[currentRoomId];
                console.log(`Room ${currentRoomId} deleted`);
           }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
