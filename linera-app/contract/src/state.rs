use linera_sdk::{
    linera_base_types::{AccountOwner, Amount, Timestamp},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};
use serde::{Deserialize, Serialize};
use chronos_market::{AgentStrategy, OrderSide, OrderDuration, FeedItemType};

#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct MarketState {
    // Core market state
    pub markets: MapView<u64, Market>,
    pub positions: MapView<(AccountOwner, u64), Position>,
    pub next_market_id: RegisterView<u64>,
    pub total_volume: RegisterView<Amount>,
    
    // Limit orders
    pub limit_orders: MapView<u64, LimitOrder>,
    pub next_order_id: RegisterView<u64>,
    pub order_book: MapView<(u64, bool), Vec<u64>>,  // (market_id, is_yes) -> order_ids
    
    // Combos/Parlays
    pub combos: MapView<u64, Combo>,
    pub next_combo_id: RegisterView<u64>,
    pub user_combos: MapView<AccountOwner, Vec<u64>>,
    
    // AI Agents
    pub agents: MapView<u64, TradingAgent>,
    pub next_agent_id: RegisterView<u64>,
    pub agent_followers: MapView<(u64, AccountOwner), AgentFollower>,
    
    // Social
    pub feed_items: MapView<u64, FeedItem>,
    pub next_feed_id: RegisterView<u64>,
    pub user_followers: MapView<AccountOwner, Vec<AccountOwner>>,
    pub user_following: MapView<AccountOwner, Vec<AccountOwner>>,
    pub item_likes: MapView<u64, Vec<AccountOwner>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Market {
    pub id: u64,
    pub creator: AccountOwner,
    pub question: String,
    pub categories: Vec<String>,
    pub end_time: Timestamp,
    pub created_at: Timestamp,
    pub yes_pool: Amount,
    pub no_pool: Amount,
    pub total_yes_shares: Amount,
    pub total_no_shares: Amount,
    pub resolved: bool,
    pub outcome: Option<bool>,
    pub volume: Amount,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub market_id: u64,
    pub owner: AccountOwner,
    pub yes_shares: Amount,
    pub no_shares: Amount,
    pub claimed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimitOrder {
    pub id: u64,
    pub owner: AccountOwner,
    pub market_id: u64,
    pub is_yes: bool,
    pub side: OrderSide,
    pub price: Amount,
    pub original_amount: Amount,
    pub filled_amount: Amount,
    pub duration: OrderDuration,
    pub created_at: Timestamp,
    pub status: OrderStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum OrderStatus {
    Open,
    PartiallyFilled,
    Filled,
    Cancelled,
    Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Combo {
    pub id: u64,
    pub owner: AccountOwner,
    pub name: String,
    pub legs: Vec<ComboLegState>,
    pub stake: Amount,
    pub potential_payout: Amount,
    pub created_at: Timestamp,
    pub status: ComboStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComboLegState {
    pub market_id: u64,
    pub prediction: bool,
    pub odds: Amount,  // Odds at time of creation (scaled by 1e18)
    pub resolved: bool,
    pub won: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ComboStatus {
    Active,
    Won,
    Lost,
    PartiallyResolved,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradingAgent {
    pub id: u64,
    pub owner: AccountOwner,
    pub name: String,
    pub strategy: AgentStrategy,
    pub config: String,
    pub capital: Amount,
    pub total_volume: Amount,
    pub profit_loss: i128,  // Can be negative
    pub win_rate: u32,      // Scaled by 100 (e.g., 6850 = 68.50%)
    pub total_trades: u64,
    pub winning_trades: u64,
    pub followers_count: u64,
    pub is_active: bool,
    pub created_at: Timestamp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentFollower {
    pub agent_id: u64,
    pub follower: AccountOwner,
    pub allocation: Amount,
    pub copy_trades: bool,
    pub started_at: Timestamp,
    pub total_copied_pnl: i128,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedItem {
    pub id: u64,
    pub author: AccountOwner,
    pub item_type: FeedItemType,
    pub market_id: Option<u64>,
    pub content: String,
    pub data: String,  // JSON metadata
    pub likes_count: u64,
    pub comments_count: u64,
    pub created_at: Timestamp,
}
