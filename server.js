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

// Big Two Game Logic
const players = {}; // Stores player information { socket.id: { id, hand, position } }
let deck = []; // Deck of cards
let currentPlayerId = null; // socket.id of the player whose turn it is
let currentPlay = []; // Cards currently on the table
let playerOrder = []; // Array of player socket.ids in turn order
const maxPlayers = 4; // Maximum number of players

// Card Ranks and Suits for sorting and comparison
const rankOrder = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
const suitOrder = ['C', 'D', 'H', 'S'];

// Initialize the deck
function initializeDeck() {
    const suits = ['C', 'D', 'H', 'S'];
    const ranks = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
    deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ rank, suit });
        }
    }
    // Shuffle the deck (Fisher-Yates Algorithm)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// Deal cards
function dealCards() {
    initializeDeck();
    const hands = Array.from({ length: maxPlayers }, () => []);
    for (let i = 0; i < deck.length; i++) {
        hands[i % maxPlayers].push(deck[i]);
    }
     // Sort each hand
     for (const hand of hands) {
         hand.sort((a, b) => {
              const rankA = rankOrder.indexOf(a.rank);
              const rankB = rankOrder.indexOf(b.rank);
              if (rankA !== rankB) {
                  return rankA - rankB;
              }
              return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
         });
     }
    return hands;
}

// Basic check for valid single card play (to be expanded for other hand types)
// Returns true if play is valid and stronger than lastPlay, otherwise false
function isValidAndStronger(play, lastPlay) {
    if (play.length === 0) return false; // Cannot play no cards

    // Basic single card comparison
    if (play.length === 1 && (lastPlay.length === 0 || lastPlay.length === 1)) {
         const rankA = rankOrder.indexOf(play[0].rank);
         const rankB = lastPlay.length === 1 ? rankOrder.indexOf(lastPlay[0].rank) : -1;

         if (rankA > rankB) return true;
         if (rankA < rankB) return false;
         // If ranks are equal, compare suits
         const suitA = suitOrder.indexOf(play[0].suit);
         const suitB = lastPlay.length === 1 ? suitOrder.indexOf(lastPlay[0].suit) : -1;
         return suitA > suitB;
    }

    // TODO: Add validation and comparison for other hand types (pairs, triples, straights, flushes, full houses, four of a kind, straight flushes)

    return false; // Default to invalid
}


io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Assign a position to the new player
   const availablePositions = ['bottom', 'left', 'top', 'right'].filter(pos => !Object.values(players).some(p => p.position === pos));
   if (availablePositions.length > 0 && Object.keys(players).length < maxPlayers) {
       players[socket.id] = {
         id: socket.id,
         hand: [],
         position: availablePositions[0],
       };
       socket.emit('seat_assigned', players[socket.id].position);
        // Notify all players about the updated player list
       io.emit('player_list_updated', Object.values(players).map(p => ({ id: p.id, position: p.position })));
       console.log(`Player ${socket.id} assigned position: ${players[socket.id].position}`);

   } else {
        socket.emit('error', 'Game is full or no positions available');
        socket.disconnect(true); // Disconnect the socket
        console.log(`Player ${socket.id} connection rejected: Game full`);
        return;
   }


  socket.on('start_game', () => {
      const playerIds = Object.keys(players);
       if (playerIds.length !== maxPlayers) {
            socket.emit('error', `Need ${maxPlayers} players to start the game`);
            return;
       }

       console.log('Starting game...');
      const hands = dealCards();
      let startPlayerId = null;

      // Assign dealt hands and find the player with 3 of hearts
      playerIds.forEach((id, index) => {
          players[id].hand = hands[index];
          if (players[id].hand.some(card => card.rank === '3' && card.suit === 'H')) {
              startPlayerId = id;
          }
          io.to(id).emit('your_hand', players[id].hand); // Send hand to the respective player
      });

       // Set the player order starting with the player with 3 of hearts
       playerOrder = playerIds;
       const startIndex = playerOrder.indexOf(startPlayerId);
       playerOrder = playerOrder.slice(startIndex).concat(playerOrder.slice(0, startIndex));

       currentPlayerId = playerOrder[0]; // Set the first player
       currentPlay = []; // Clear the table

       console.log(`Game started. Starting player: ${currentPlayerId}`);
       io.emit('game_started', {
           startPlayerId: currentPlayerId,
            players: Object.values(players).map(p => ({ id: p.id, position: p.position, handSize: p.hand.length })),
            playerOrder: playerOrder
       });
  });

   socket.on('play_cards', (cards) => {
        if (socket.id !== currentPlayerId) {
            socket.emit('error', 'It is not your turn');
            return;
        }

        // Check if the played cards are in the player's hand
        const validPlayInHand = cards.every(card =>
            players[socket.id].hand.some(hCard => hCard.rank === card.rank && hCard.suit === card.suit)
        );

        if (!validPlayInHand) {
            socket.emit('error', 'You do not have these cards');
            return;
        }

        // Check if the played cards are valid and stronger than the current play on the table
        if (!isValidAndStronger(cards, currentPlay)) {
             socket.emit('error', 'Invalid play or cards are not strong enough');
             return;
        }


        // Remove played cards from the player's hand
        for (const card of cards) {
            const index = players[socket.id].hand.findIndex(hCard => hCard.rank === card.rank && hCard.suit === card.suit);
            if (index !== -1) {
                players[socket.id].hand.splice(index, 1);
            }
        }

        currentPlay = cards; // Update the cards on the table

        console.log(`Player ${socket.id} played cards:`, cards);
        io.emit('cards_played', { playerId: socket.id, play: cards, handSize: players[socket.id].hand.length }); // Notify all players about the play

        // Check if the game is over (player ran out of cards)
        if (players[socket.id].hand.length === 0) {
             console.log(`Player ${socket.id} wins! Game over.`);
             io.emit('game_over', { winnerId: socket.id });
             resetGame(); // Reset the game after it ends
        } else {
            // Move to the next player's turn
            const currentIndex = playerOrder.indexOf(currentPlayerId);
            currentPlayerId = playerOrder[(currentIndex + 1) % playerOrder.length];
             console.log(`Next turn: ${currentPlayerId}`);
             io.emit('next_turn', { playerId: currentPlayerId });
        }

   });

    socket.on('pass_turn', () => {
        if (socket.id !== currentPlayerId) {
            socket.emit('error', 'It is not your turn');
            return;
        }

        // TODO: Implement pass logic, including clearing the table if all other players pass
        console.log(`Player ${socket.id} passed turn.`);
        io.emit('player_passed', { playerId: socket.id }); // Notify that the player passed

         // Move to the next player's turn
        const currentIndex = playerOrder.indexOf(currentPlayerId);
        currentPlayerId = playerOrder[(currentIndex + 1) % playerOrder.length];
         console.log(`Next turn: ${currentPlayerId}`);
         io.emit('next_turn', { playerId: currentPlayerId });
    });

    // Reset the game state
    function resetGame() {
        console.log('Resetting game...');
        currentPlayerId = null;
        currentPlay = [];
        playerOrder = [];
         for (const playerId in players) {
             if (players.hasOwnProperty(playerId)) {
                 players[playerId].hand = [];
             }
         }
        io.emit('game_reset'); // Notify clients about game reset
    }


  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
     const position = players[socket.id]?.position;
     delete players[socket.id];
     if (position) {
         io.emit('player_left', { id: socket.id, position: position }); // Notify players about the player leaving
     }
      // Update the player list for all clients
     io.emit('player_list_updated', Object.values(players).map(p => ({ id: p.id, position: p.position })));

      // If the disconnected player was the current player, move to the next turn
      if (socket.id === currentPlayerId) {
           const remainingPlayerIds = Object.keys(players);
           if (remainingPlayerIds.length > 0) {
                const currentIndex = playerOrder.indexOf(socket.id);
                // Find the next valid player in the order
                let nextIndex = (currentIndex + 1) % playerOrder.length;
                 // Keep checking until a valid player is found or all players are gone
                 let attempts = 0;
                 while (!players[playerOrder[nextIndex]] && attempts < playerOrder.length) {
                      nextIndex = (nextIndex + 1) % playerOrder.length;
                      attempts++;
                 }

                 if (players[playerOrder[nextIndex]]) {
                     currentPlayerId = playerOrder[nextIndex];
                     console.log(`Disconnected player was current. Next turn: ${currentPlayerId}`);
                     io.emit('next_turn', { playerId: currentPlayerId });
                 } else {
                     // All players have left, reset the game
                     console.log('All players left. Resetting game.');
                     resetGame();
                 }

           } else {
                // All players have left, reset the game
                console.log('All players left. Resetting game.');
                resetGame();
           }
      } else {
           // If the disconnected player was not the current player, just remove them from the order
            playerOrder = playerOrder.filter(id => id !== socket.id);
      }

  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
