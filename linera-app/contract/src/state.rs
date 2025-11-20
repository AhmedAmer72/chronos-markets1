use linera_sdk::{
    linera_base_types::{AccountOwner, Amount, Timestamp},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};
use serde::{Deserialize, Serialize};

#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct MarketState {
    pub markets: MapView<u64, Market>,
    pub positions: MapView<(AccountOwner, u64), Position>,
    pub next_market_id: RegisterView<u64>,
    pub total_volume: RegisterView<Amount>,
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
