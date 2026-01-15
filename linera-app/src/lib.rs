// Copyright (c) Chronos Markets
// ABI of the Chronos Markets Prediction Market Application

use async_graphql::{Request, Response};
use linera_sdk::linera_base_types::{Amount, AccountOwner, Timestamp, ContractAbi, ServiceAbi};
use serde::{Deserialize, Serialize};

pub struct MarketAbi;

impl ContractAbi for MarketAbi {
    type Operation = Operation;
    type Response = OperationResponse;
}

impl ServiceAbi for MarketAbi {
    type Query = Request;
    type QueryResponse = Response;
}

/// Order types for limit orders
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub enum OrderSide {
    Buy,
    Sell,
}

/// Order duration types
#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum OrderDuration {
    GoodTillCancelled,
    GoodTillTime(Timestamp),
    ImmediateOrCancel,
}

/// Agent trading strategies
#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum AgentStrategy {
    Momentum,
    MeanReversion,
    Arbitrage,
    MarketMaker,
    Sentiment,
    Custom(String),
}

/// Social feed item types
#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum FeedItemType {
    Trade,
    MarketCreated,
    Comment,
    Follow,
    Achievement,
}

/// Operations that can be performed on the market
#[derive(Debug, Deserialize, Serialize)]
pub enum Operation {
    // === Market Operations ===
    CreateMarket {
        question: String,
        categories: Vec<String>,
        end_time: Timestamp,
        initial_liquidity: Amount,
    },
    BuyShares {
        market_id: u64,
        is_yes: bool,
        shares: Amount,
        max_cost: Amount,
    },
    SellShares {
        market_id: u64,
        is_yes: bool,
        shares: Amount,
        min_proceeds: Amount,
    },
    ResolveMarket {
        market_id: u64,
        outcome: bool,
    },
    ClaimWinnings {
        market_id: u64,
    },
    
    // === Limit Order Operations ===
    PlaceLimitOrder {
        market_id: u64,
        is_yes: bool,
        side: OrderSide,
        price: Amount,  // Price per share (0-100 cents)
        amount: Amount,
        duration: OrderDuration,
    },
    CancelLimitOrder {
        order_id: u64,
    },
    
    // === Combo/Parlay Operations ===
    CreateCombo {
        name: String,
        legs: Vec<ComboLeg>,
        stake: Amount,
    },
    CancelCombo {
        combo_id: u64,
    },
    
    // === AI Agent Operations ===
    CreateAgent {
        name: String,
        strategy: AgentStrategy,
        config: String,  // JSON config
        initial_capital: Amount,
    },
    UpdateAgentConfig {
        agent_id: u64,
        config: String,
    },
    ToggleAgent {
        agent_id: u64,
        active: bool,
    },
    FollowAgent {
        agent_id: u64,
        allocation: Amount,
    },
    UnfollowAgent {
        agent_id: u64,
    },
    
    // === Social Operations ===
    PostComment {
        market_id: u64,
        content: String,
    },
    FollowUser {
        user: AccountOwner,
    },
    UnfollowUser {
        user: AccountOwner,
    },
    LikeFeedItem {
        item_id: u64,
    },
}

/// Combo leg definition
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ComboLeg {
    pub market_id: u64,
    pub prediction: bool,  // true = YES, false = NO
}

/// Response from operations
#[derive(Debug, Deserialize, Serialize)]
pub enum OperationResponse {
    // Market responses
    MarketCreated(u64),
    SharesPurchased { cost: Amount },
    SharesSold { proceeds: Amount },
    MarketResolved,
    WinningsClaimed(Amount),
    
    // Limit order responses
    LimitOrderPlaced(u64),
    LimitOrderCancelled,
    LimitOrderFilled { filled_amount: Amount, avg_price: Amount },
    
    // Combo responses
    ComboCreated(u64),
    ComboCancelled,
    ComboSettled { payout: Amount },
    
    // Agent responses
    AgentCreated(u64),
    AgentUpdated,
    AgentToggled,
    AgentFollowed,
    AgentUnfollowed,
    
    // Social responses
    CommentPosted(u64),
    UserFollowed,
    UserUnfollowed,
    ItemLiked,
}
