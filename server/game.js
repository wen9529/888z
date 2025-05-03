// 游戏逻辑

// 定义牌的花色和点数
const suits = {
  'C': 'clubs',
  'D': 'diamonds',
  'H': 'hearts',
  'S': 'spades'
};

const ranks = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14 // A 在这里按最大处理，顺子中的 A-2-3-4-5 需要特殊处理
};

// 生成一副完整的牌
function createDeck() {
  const deck = [];
  for (const suitAbbr in suits) {
    for (const rankAbbr in ranks) {
      deck.push({ rank: rankAbbr, suit: suitAbbr });
    }
  }
  return deck;
}

// 将牌信息转换为文件名
function getCardFilename(card) {
  const rankName = Object.keys(ranks).find(key => ranks[key] === card.rank);
  const suitName = suits[card.suit];
   if (card.rank === 10) { // 特殊处理 T (10)
       return `10_of_${suitName}.png`;
   } else {
       return `${Object.keys(ranks).find(key => ranks[key] === card.rank).toLowerCase()}_of_${suitName}.png`;
   }
}


// 洗牌 (Fisher-Yates 洗牌算法)
function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// 发牌给指定数量的玩家
function dealCards(deck, numPlayers) {
  if (deck.length < numPlayers * 13) {
    throw new Error("牌不够发！");
  }

  const hands = Array.from({ length: numPlayers }, () => []);
  let cardIndex = 0;
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < numPlayers; j++) {
      hands[j].push(deck[cardIndex++]);
    }
  }
  return hands;
}

// 将牌按点数排序
function sortCardsByRank(cards) {
    return cards.sort((a, b) => ranks[a.rank] - ranks[b.rank]);
}

// 将牌按花色排序
function sortCardsBySuit(cards) {
    return cards.sort((a, b) => {
        const suitOrder = ['C', 'D', 'H', 'S'];
        return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    });
}


// TODO: 实现更复杂的牌型判断逻辑 (返回牌型类型和大小)
// 简化示例：只判断散牌、对子、三条、顺子、同花
function getHandType(hand) {
    const sortedHand = sortCardsByRank([...hand]); // 复制一份进行排序

    // 统计点数频率
    const rankCounts = {};
    for (const card of sortedHand) {
        rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    }

    const uniqueRanks = Object.keys(rankCounts).length;
    const maxCount = Math.max(...Object.values(rankCounts));

    // 统计花色频率
    const suitCounts = {};
    for (const card of sortedHand) {
        suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    }
    const uniqueSuits = Object.keys(suitCounts).length;


    // 判断同花
    const isFlush = uniqueSuits === 1 && hand.length >= 5; // 同花至少5张牌

    // 判断顺子
    let isStraight = false;
    if (uniqueRanks === hand.length && hand.length >= 5) { // 顺子点数不重复且至少5张牌
        let straightStartRank = ranks[sortedHand[0].rank];
        let consecutive = true;
        for (let i = 1; i < sortedHand.length; i++) {
            if (ranks[sortedHand[i].rank] !== straightStartRank + i) {
                consecutive = false;
                break;
            }
        }
        if (consecutive) {
            isStraight = true;
        } else {
             // 处理 A-2-3-4-5 的顺子
             if (hand.length === 5 &&
                 sortedHand[0].rank === '2' && sortedHand[1].rank === '3' && sortedHand[2].rank === '4' && sortedHand[3].rank === '5' && sortedHand[4].rank === 'A') {
                 isStraight = true;
             }
        }
    }


    // 判断牌型 (从大到小判断)
    if (isStraight && isFlush) return { type: '同花顺', size: ranks[sortedHand[hand.length - 1].rank] }; // 同花顺
    if (maxCount === 4) {
        const fourOfAKindRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 4);
        return { type: '四条', size: ranks[fourOfAKindRank] }; // 四条
    }
    if (maxCount === 3 && uniqueRanks === 2) {
         const threeOfAKindRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 3);
         const pairRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 2);
         return { type: '葫芦', size: ranks[threeOfAKindRank], subSize: ranks[pairRank] }; // 葫芦
    }
    if (isFlush) return { type: '同花', size: ranks[sortedHand[hand.length - 1].rank] }; // 同花
    if (isStraight) return { type: '顺子', size: ranks[sortedHand[hand.length - 1].rank] }; // 顺子
    if (maxCount === 3) {
        const threeOfAKindRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 3);
        return { type: '三条', size: ranks[threeOfAKindRank] }; // 三条
    }
    if (maxCount === 2 && uniqueRanks === 3) {
        const pairs = Object.keys(rankCounts).filter(rank => rankCounts[rank] === 2).map(rank => ranks[rank]).sort((a, b) => b - a);
         return { type: '两对', size: pairs[0], subSize: pairs[1] }; // 两对
    }
     if (maxCount === 2 && uniqueRanks === hand.length - 1) {
        const pairRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 2);
        return { type: '对子', size: ranks[pairRank] }; // 对子
    }
     return { type: '散牌', size: ranks[sortedHand[hand.length - 1].rank] }; // 散牌 (用最大牌点数表示大小)
}

// TODO: 实现更复杂的比牌逻辑 (比较两个牌型的大小)
// 返回正数表示 hand1 赢，负数表示 hand2 赢，0 表示平局
function compareHandTypes(hand1Type, hand2Type) {
    const typeOrder = ['同花顺', '四条', '葫芦', '同花', '顺子', '三条', '两对', '对子', '散牌'];
    const type1Index = typeOrder.indexOf(hand1Type.type);
    const type2Index = typeOrder.indexOf(hand2Type.type);

    if (type1Index < type2Index) return 1; // hand1 牌型更大
    if (type1Index > type2Index) return -1; // hand2 牌型更大

    // 牌型相同，比较大小
    if (hand1Type.size > hand2Type.size) return 1;
    if (hand1Type.size < hand2Type.size) return -1;

    // 主大小相同，比较次大小 (用于葫芦、两对)
    if (hand1Type.subSize && hand2Type.subSize) {
        if (hand1Type.subSize > hand2Type.subSize) return 1;
        if (hand1Type.subSize < hand2Type.subSize) return -1;
    }


    // TODO: 对于散牌、对子、两对，需要比较踢脚牌
    // 这是一个简化的版本，实际游戏中需要比较剩余牌的大小

    return 0; // 平局
}


// 比牌并计算得分
function compareAndScore(playerHands) {
    const scores = Array(playerHands.length).fill(0);
    const numPlayers = playerHands.length;

    // 比较每一道
    for (let i = 0; i < 3; i++) { // 0:头道, 1:中道, 2:尾道
        for (let p1 = 0; p1 < numPlayers; p1++) {
            for (let p2 = p1 + 1; p2 < numPlayers; p2++) {
                const hand1Part = (i === 0) ? playerHands[p1].head : (i === 1) ? playerHands[p1].middle : playerHands[p1].tail;
                const hand2Part = (i === 0) ? playerHands[p2].head : (i === 1) ? playerHands[p2].middle : playerHands[p2].tail;

                const hand1Type = getHandType(hand1Part);
                const hand2Type = getHandType(hand2Part);

                const result = compareHandTypes(hand1Type, hand2Type);

                if (result > 0) { // p1 赢 p2
                    scores[p1]++;
                    scores[p2]--;
                } else if (result < 0) { // p2 赢 p1
                    scores[p2]++;
                    scores[p1]--;
                }
                // 平局不加减分
            }
        }
    }

    // TODO: 添加特殊牌型和全垒打的加分逻辑

    return scores;
}


// 导出游戏逻辑函数
module.exports = {
  createDeck,
  shuffleDeck,
  dealCards,
  getCardFilename, // 导出获取文件名的函数
  sortCardsByRank, // 导出排序函数，前端可能用到
  sortCardsBySuit,
  getHandType, // 导出牌型判断函数
  compareHandTypes, // 导出比牌函数
  compareAndScore // 导出比牌并计分函数
};
