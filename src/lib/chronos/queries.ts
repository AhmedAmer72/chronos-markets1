/**
 * Chronos Markets GraphQL Queries and Mutations
 * 
 * All GraphQL operations for the Chronos prediction market contract.
 * These match the schema defined in the Rust service.
 */

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all markets
 */
export const GET_MARKETS = `
  query GetMarkets {
    markets {
      id
      creator
      question
      categories
      endTime
      createdAt
      yesPool
      noPool
      totalYesShares
      totalNoShares
      resolved
      outcome
      volume
      yesPrice
      noPrice
    }
  }
`;

/**
 * Get a market by ID
 */
export const GET_MARKET = `
  query GetMarket($id: Int!) {
    market(id: $id) {
      id
      creator
      question
      categories
      endTime
      createdAt
      yesPool
      noPool
      totalYesShares
      totalNoShares
      resolved
      outcome
      volume
      yesPrice
      noPrice
    }
  }
`;

/**
 * Get active (non-resolved) markets
 */
export const GET_ACTIVE_MARKETS = `
  query GetActiveMarkets {
    activeMarkets {
      id
      creator
      question
      categories
      endTime
      createdAt
      yesPool
      noPool
      resolved
      volume
      yesPrice
      noPrice
    }
  }
`;

/**
 * Get positions for a wallet
 */
export const GET_POSITIONS = `
  query GetPositions($wallet: String!) {
    positions(wallet: $wallet) {
      marketId
      owner
      yesShares
      noShares
      claimed
    }
  }
`;

/**
 * Get total volume
 */
export const GET_TOTAL_VOLUME = `
  query GetTotalVolume {
    totalVolume
  }
`;

/**
 * Get market count
 */
export const GET_MARKET_COUNT = `
  query GetMarketCount {
    marketCount
  }
`;

/**
 * Get leaderboard (top traders)
 */
export const GET_LEADERBOARD = `
  query GetLeaderboard($limit: Int) {
    leaderboard(limit: $limit) {
      wallet
      totalVolume
      profitLoss
      winRate
      tradesCount
    }
  }
`;

/**
 * Get trade history for a market
 */
export const GET_TRADE_HISTORY = `
  query GetTradeHistory($marketId: Int!, $limit: Int) {
    tradeHistory(marketId: $marketId, limit: $limit) {
      id
      marketId
      trader
      isYes
      shares
      cost
      timestamp
    }
  }
`;

/**
 * Get user stats
 */
export const GET_USER_STATS = `
  query GetUserStats($wallet: String!) {
    userStats(wallet: $wallet) {
      totalVolume
      profitLoss
      winRate
      tradesCount
      marketsCreated
    }
  }
`;

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new market
 * Note: endTime is Linera Timestamp (microseconds since epoch)
 * initialLiquidity is Amount (attos)
 */
export const CREATE_MARKET = `
  mutation CreateMarket(
    $question: String!,
    $categories: [String!]!,
    $endTime: Timestamp!,
    $initialLiquidity: String!
  ) {
    createMarket(
      question: $question,
      categories: $categories,
      endTime: $endTime,
      initialLiquidity: $initialLiquidity
    )
  }
`;

/**
 * Buy shares in a market
 */
export const BUY_SHARES = `
  mutation BuyShares(
    $marketId: Int!,
    $isYes: Boolean!,
    $shares: String!,
    $maxCost: String!
  ) {
    buyShares(
      marketId: $marketId,
      isYes: $isYes,
      shares: $shares,
      maxCost: $maxCost
    )
  }
`;

/**
 * Sell shares in a market
 */
export const SELL_SHARES = `
  mutation SellShares(
    $marketId: Int!,
    $isYes: Boolean!,
    $shares: String!,
    $minReturn: String!
  ) {
    sellShares(
      marketId: $marketId,
      isYes: $isYes,
      shares: $shares,
      minReturn: $minReturn
    )
  }
`;

/**
 * Place a limit order
 */
export const PLACE_LIMIT_ORDER = `
  mutation PlaceLimitOrder(
    $marketId: Int!,
    $isYes: Boolean!,
    $isBuy: Boolean!,
    $shares: String!,
    $priceLimit: String!,
    $expiresAt: Int
  ) {
    placeLimitOrder(
      marketId: $marketId,
      isYes: $isYes,
      isBuy: $isBuy,
      shares: $shares,
      priceLimit: $priceLimit,
      expiresAt: $expiresAt
    )
  }
`;

/**
 * Cancel a limit order
 */
export const CANCEL_LIMIT_ORDER = `
  mutation CancelLimitOrder($orderId: Int!) {
    cancelLimitOrder(orderId: $orderId)
  }
`;

/**
 * Resolve a market (creator only)
 */
export const RESOLVE_MARKET = `
  mutation ResolveMarket($marketId: Int!, $outcome: Boolean!) {
    resolveMarket(marketId: $marketId, outcome: $outcome)
  }
`;

/**
 * Claim winnings from a resolved market
 */
export const CLAIM_WINNINGS = `
  mutation ClaimWinnings($marketId: Int!) {
    claimWinnings(marketId: $marketId)
  }
`;

/**
 * Add liquidity to a market
 */
export const ADD_LIQUIDITY = `
  mutation AddLiquidity($marketId: Int!, $amount: String!) {
    addLiquidity(marketId: $marketId, amount: $amount)
  }
`;

/**
 * Remove liquidity from a market
 */
export const REMOVE_LIQUIDITY = `
  mutation RemoveLiquidity($marketId: Int!, $shares: String!) {
    removeLiquidity(marketId: $marketId, shares: $shares)
  }
`;

// =============================================================================
// COMBO/PARLAY QUERIES & MUTATIONS
// =============================================================================

/**
 * Get available combos
 */
export const GET_COMBOS = `
  query GetCombos {
    combos {
      id
      markets
      multiplier
      minBet
      maxBet
    }
  }
`;

/**
 * Place a combo bet
 */
export const PLACE_COMBO_BET = `
  mutation PlaceComboBet(
    $marketIds: [Int!]!,
    $outcomes: [Boolean!]!,
    $amount: String!
  ) {
    placeComboBet(
      marketIds: $marketIds,
      outcomes: $outcomes,
      amount: $amount
    )
  }
`;

// =============================================================================
// AGENT/BOT QUERIES & MUTATIONS
// =============================================================================

/**
 * Get trading agents
 */
export const GET_AGENTS = `
  query GetAgents {
    agents {
      id
      name
      strategy
      creator
      totalVolume
      profitLoss
      followers
    }
  }
`;

/**
 * Follow a trading agent
 */
export const FOLLOW_AGENT = `
  mutation FollowAgent($agentId: Int!, $amount: String!) {
    followAgent(agentId: $agentId, amount: $amount)
  }
`;

/**
 * Create a trading agent
 */
export const CREATE_AGENT = `
  mutation CreateAgent(
    $name: String!,
    $strategy: String!,
    $config: String!
  ) {
    createAgent(name: $name, strategy: $strategy, config: $config)
  }
`;

// =============================================================================
// SOCIAL FEED QUERIES
// =============================================================================

/**
 * Get social feed (recent trades, comments)
 */
export const GET_SOCIAL_FEED = `
  query GetSocialFeed($limit: Int) {
    socialFeed(limit: $limit) {
      id
      type
      wallet
      marketId
      content
      timestamp
    }
  }
`;

/**
 * Post a comment on a market
 */
export const POST_COMMENT = `
  mutation PostComment($marketId: Int!, $content: String!) {
    postComment(marketId: $marketId, content: $content)
  }
`;
