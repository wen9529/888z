// 游戏逻辑

// 定义牌的花色和点数
const suits = {
  'C': 'clubs',
  'D': 'diamonds',
  'H': 'hearts',
  'S': 'spades'
}; // 梅花, 方块, 红桃, 黑桃

const ranks = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  'T': '10', // T 代表 10
  'J': 'jack',
  'Q': 'queen',
  'K': 'king',
  'A': 'ace'
}; // 点数

// 生成一副完整的牌
function createDeck() {
  const deck = [];
  for (const suitAbbr in suits) {
    for (const rankAbbr in ranks) {
      deck.push({ rank: rankAbbr, suit: suitAbbr }); // 例如：{ rank: '2', suit: 'C' }
    }
  }
  return deck;
}

// 将牌信息转换为文件名
function getCardFilename(card) {
  if (card.rank === 'T') {
    return `10_of_${suits[card.suit]}.png`;
  } else {
    return `${ranks[card.rank]}_of_${suits[card.suit]}.png`;
  }
}

// 洗牌 (Fisher-Yates 洗牌算法)
function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]; // 交换元素
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

// TODO: 实现更复杂的牌型判断逻辑
function checkCardType(hand) {
  // 这是一个占位符，您需要根据十三水规则实现牌型判断
  // 返回一个表示牌型和大小的信息
  return "未知牌型";
}

// TODO: 实现比牌逻辑
function compareHands(hand1, hand2) {
  // 这是一个占位符，您需要根据十三水规则实现比牌
  return 0; // 0表示平局，正数表示hand1赢，负数表示hand2赢
}

// 导出游戏逻辑函数
module.exports = {
  createDeck,
  shuffleDeck,
  dealCards,
  checkCardType,
  compareHands,
  getCardFilename // 导出获取文件名的函数
};
