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

    const typeOrder = ['single', 'pair', 'triple', 'straight', 'flush', 'fullhouse', 'bomb', 'straightflush'];

    const rank1 = play1[play1.length - 1].rank;
    const rank2 = play2[play2.length - 1].rank;

    const suit1 = play1[play1.length - 1].suit;
    const suit2 = play2[play2.length - 1].suit;

    const rankCompare = rankOrder.indexOf(rank1) - rankOrder.indexOf(rank2);
    const suitCompare = suitOrder.indexOf(suit1) - suitOrder.indexOf(suit2);

    if (type1 == 'flush' && type2 == 'flush') {
        if (rankCompare == 0) return suitCompare > 0;
        return rankCompare > 0
    }
    if (type1 == 'fullhouse' && type2 == 'fullhouse') {
        return rankCompare > 0
    }

    if (type1 === 'bomb' && type2 !== 'bomb') return true;
    if (type1 !== 'bomb' && type2 === 'bomb') return false;
    if (type1 === 'straightflush' && type2 !== 'straightflush') return true;
    if (type1 !== 'straightflush' && type2 === 'straightflush') return false;

    if (type1 === type2) {
        if (type1 === 'single' || type1 === 'pair' || type1 === 'triple' || type1 === 'bomb') {
            return getCardValue(play1[play1.length - 1]) > getCardValue(play2[play2.length - 1]);
        } else if (type1 === 'straight' || type1 == 'straightflush') {
            return getCardValue(play1[play1.length - 1]) > getCardValue(play2[play2.length - 1]);
        }
        // TODO: Add other hand type comparisons
    }
    return false;

    if (type1 === type2) {
        if (type1 === 'single' || type1 === 'pair' || type1 === 'triple' || type1 === 'bomb') {
            return getCardValue(play1[play1.length - 1]) > getCardValue(play2[play2.length - 1]);
        } else if (type1 === 'straight' || type1 == 'straightflush') {
            return getCardValue(play1[play1.length - 1]) > getCardValue(play2[play2.length - 1]);
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


module.exports = {
    createCard,
    initializeDeck,
    shuffleDeck,
    dealCards,
    getCardValue,
    getPlayType,
    comparePlays,
    checkPlay,
    SUITS,
    RANKS,
    rankOrder,
    suitOrder
};