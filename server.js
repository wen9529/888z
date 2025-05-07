const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Constants for card suits and ranks
const SUITS = ['C', 'D', 'H', 'S']; // Clubs, Diamonds, Hearts, Spades
const RANKS = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];

// Function to create a card object
function createCard(rank, suit) {
    return { rank, suit };
}

// Function to initialize a deck of cards
function initializeDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push(createCard(rank, suit));
        }
    }
    return deck;
}

// Function to shuffle the deck using Fisher-Yates algorithm
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// Function to deal cards to players
function dealCards(deck, numPlayers = 4) {
    const hands = [];
    for (let i = 0; i < numPlayers; i++) {
        hands[i] = [];
    }
    for (let i = 0; i < deck.length; i++) {
        hands[i % numPlayers].push(deck[i]);
    }
    return hands;
}

// 房间管理
const rooms = {};

// Function to create a player object
function createPlayer(id, username) {
    return {
        id,
        hand: [], // Initialize with an empty hand
        username,
    };
}

// Function to create a room
function createRoom(roomId) {
    return {
        id: roomId,
        players: {}, // { playerId: player }
        deck: [],
        currentPlayerId: null,
        currentPlay: [],
        playerOrder: [],
        state: 'waiting', // 'waiting', 'started', 'ended'
        ready: false,
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
    room.playerOrder = room.playerOrder.slice(startIndex).concat(room.playerOrder.slice(0, startIndex));

    room.state = 'started';

    Object.keys(room.players).forEach((playerId) => {
        io.to(playerId).emit('your_hand', room.players[playerId].hand);
    });

    io.to(roomId).emit('game_started', {
        startPlayerId: room.currentPlayerId,
        players: Object.values(room.players).map(p => ({ id: p.id, username: p.username, handSize: p.hand.length }))
    });
}


io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    const rankOrder = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
    const suitOrder = ['C', 'D', 'H', 'S'];

    function getCardValue(card) {
        return rankOrder.indexOf(card.rank) * 4 + suitOrder.indexOf(card.suit);
    }

    function getPlayType(play) {
        const len = play.length;
        if (len === 0) return { type: 'none', valid: false };

        //Count ranks
        const rankCounts = {};
        play.forEach(card => {
            rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        });
        //Count suit
        const suitCounts = {};
        play.forEach(card => {
           suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
       });

        const uniqueSuits = Object.keys(suitCounts);
        const numUniqueSuits = uniqueSuits.length;


        const uniqueRanks = Object.keys(rankCounts);
        const numUniqueRanks = uniqueRanks.length;

        play.sort((a, b) => getCardValue(a) - getCardValue(b));

        if (len === 1) {
            return { type: 'single', valid: true };
        }

        if (len === 2 && numUniqueRanks === 1) {
            return { type: 'pair', valid: true };
        }

        if (len === 3 && numUniqueRanks === 1) {
            return { type: 'triple', valid: true };
        }

        if (len === 4 && numUniqueRanks === 1) {
            return { type: 'bomb', valid: true };
        }

        //Full House
        if (len === 5 && numUniqueRanks === 2 && (Object.values(rankCounts).includes(3) && Object.values(rankCounts).includes(2))) {
            return { type: 'fullhouse', valid: true };
        }
        //Flush
        if (len >= 5 && numUniqueSuits === 1) {
            return { type: 'flush', valid: true };
        }




        if (len >= 5 && numUniqueRanks === len) {
            let isStraight = true;
            for (let i = 0; i < len - 1; i++) {
                const currentRankIndex = rankOrder.indexOf(play[i].rank);
                const nextRankIndex = rankOrder.indexOf(play[i + 1].rank);
                if (nextRankIndex !== currentRankIndex + 1) {
                    isStraight = false;
                    break;
                }
            }
            if (isStraight) return { type: 'straight', valid: true };
        }        
        if (len >= 5 && numUniqueRanks === len && numUniqueSuits === 1) {
            return { type: 'straightflush', valid: true };
       }

        // TODO: Add other hand types (full house, flush, straight flush, etc.)

        return { type: 'unknown', valid: false };
    }

    function comparePlays(play1, play2) {
        const type1 = getPlayType(play1).type;
        const type2 = getPlayType(play2).type;

        //console.log("comparePlays:", type1, type2)

        const typeOrder = ['single', 'pair', 'triple', 'straight', 'flush', 'fullhouse','bomb','straightflush'];

        const rank1 = play1[play1.length - 1].rank;
        const rank2 = play2[play2.length - 1].rank;

        const suit1 = play1[play1.length - 1].suit;
        const suit2 = play2[play2.length - 1].suit;

        const rankCompare = rankOrder.indexOf(rank1) - rankOrder.indexOf(rank2);
        const suitCompare = suitOrder.indexOf(suit1) - suitOrder.indexOf(suit2);

        if(type1 == 'flush' && type2 == 'flush'){
            if(rankCompare == 0) return suitCompare > 0;
            return rankCompare > 0
        }
        if(type1 == 'fullhouse' && type2 == 'fullhouse'){
            return rankCompare > 0
        }
        
        if (type1 === 'bomb' && type2 !== 'bomb') return true;
        if (type1 !== 'bomb' && type2 === 'bomb') return false;        
        if (type1 === 'straightflush' && type2 !== 'straightflush') return true;
        if (type1 !== 'straightflush' && type2 === 'straightflush') return false;

        if (type1 === type2) {           
            }
            // TODO: Add other hand type comparisons
        }

        return false;
    }


    function checkPlay(play, lastPlay) {
        const currentPlayTypeInfo = getPlayType(play);

        if (!currentPlayTypeInfo.valid) {
            return { valid: false, stronger: false, type: 'unknown' };
        }

        if (!lastPlay || lastPlay.length === 0) {
            return { valid: true, stronger: true, type: currentPlayTypeInfo.type };
        }

        const lastPlayTypeInfo = getPlayType(lastPlay);

        if (currentPlayTypeInfo.type === 'bomb') {
            if (lastPlayTypeInfo.type !== 'bomb') {
                return { valid: true, stronger: true, type: 'bomb' };
            } else {
                return { valid: true, stronger: comparePlays(play, lastPlay), type: 'bomb' };
            }
        }

        if (lastPlayTypeInfo.type === 'bomb') {
            return { valid: false, stronger: false, type: currentPlayTypeInfo.type };
        }

        if (currentPlayTypeInfo.type === lastPlayTypeInfo.type) {
             if (currentPlayTypeInfo.type !== 'bomb' && currentPlayTypeInfo.type !== 'straight' && play.length !== lastPlay.length) {
                  return { valid: false, stronger: false, type: currentPlayTypeInfo.type };
             }
            return { valid: true, stronger: comparePlays(play, lastPlay), type: currentPlayTypeInfo.type };
        }

        return { valid: false, stronger: false, type: currentPlayTypeInfo.type };
    }


    const fixedRoomId = '1';
    let currentRoomId = fixedRoomId;

    if (!rooms[fixedRoomId]) {
        rooms[fixedRoomId] = createRoom(fixedRoomId);
    }

    socket.join(fixedRoomId);
    console.log(`User ${socket.id} joined room ${fixedRoomId}`);

    const room = rooms[fixedRoomId];
    const playerIdsInRoom = Object.keys(room.players);

    if (playerIdsInRoom.length >= 4) {
        socket.emit('error', 'Room is full');
        return;
    }

    room.players[socket.id] = {
        id: socket.id,
        hand: [],
        position: null,
        username: `玩家${Object.keys(room.players).length + 1}`,
    };

    const availablePositions = ['bottom', 'left', 'top', 'right'].filter(pos => !Object.values(room.players).some(p => p.position === pos));
    if (availablePositions.length > 0) {
        room.players[socket.id].position = availablePositions[0];
    }

    io.to(fixedRoomId).emit('player_list', Object.values(room.players).map(player => ({ id: player.id, username: player.username })));

    socket.emit('joined_room', { roomId: fixedRoomId, playerId: socket.id, username: room.players[socket.id].username });

    if (Object.keys(room.players).length === 4 && !room.ready) {
        room.ready = true;
        initializeGame(fixedRoomId);
    }

    socket.on('play_cards', (cards) => {
        if (!currentRoomId || !rooms[currentRoomId]) {
            socket.emit('error', 'You are not in any room');
            return;
        }
        const room = rooms[currentRoomId];

        if (socket.id !== room.currentPlayerId || room.state !== 'started') {
            socket.emit('error', 'It is not your turn or the game has not started');
            return;
        }

        if (!Array.isArray(cards) || cards.length === 0) {
            socket.emit('error', 'Please select cards to play');
            return;
        }

        const playerHandRanks = room.players[socket.id].hand.map(card => `${card.rank}${card.suit}`);
        const validPlayInHand = cards.every(card =>
            playerHandRanks.includes(`${card.rank}${card.suit}`)
        );

        if (!validPlayInHand) {
            socket.emit('error', 'You do not have these cards');
            return;
        }

        const playCheck = checkPlay(cards, room.currentPlay);

        if (!playCheck.valid) {
            socket.emit('error', 'Invalid play');
            return;
        }

        if (room.currentPlay && room.currentPlay.length > 0 && !playCheck.stronger) {
            socket.emit('error', 'Your play is not strong enough');
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

        if (room.players[socket.id].hand.length === 0) {
            io.to(currentRoomId).emit('game_over', { winnerId: socket.id });
            room.state = 'game_over';
            // TODO: Scoring logic
        } else {
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
            socket.emit('error', 'It is not your turn or the game has not started');
            return;
        }

        if (!room.currentPlay || room.currentPlay.length === 0) {
            socket.emit('error', 'You are the first to play, you cannot pass');
            return;
        }

        io.to(currentRoomId).emit('player_passed', { playerId: socket.id });

        room.passedPlayers++;

        const playersInRoomCount = Object.keys(room.players).length;
        if (room.passedPlayers === playersInRoomCount - 1) {
            console.log(`Room ${currentRoomId} round ended, clearing table`);
            room.currentPlay = [];
            room.lastPlay = null;
            room.lastPlayPlayerId = null;
            room.passedPlayers = 0;

            if (room.lastPlayPlayerId) {
                room.currentPlayerId = room.lastPlayPlayerId;
                console.log(`Room ${currentRoomId} new round starts with last player ${room.currentPlayerId}`);
            } else {
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