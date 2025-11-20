// Copyright (c) Chronos Markets
// State management for Chronos Markets Prediction Market

use linera_sdk::{
    linera_base_types::{Amount, Owner, Timestamp},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};
use serde::{Deserialize, Serialize};

/// The application state
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct MarketState {
    /// All markets stored by ID
    pub markets: MapView<u64, Market>,
    /// User positions
    pub positions: MapView<(Owner, u64), Position>,
    /// Next market ID
    pub next_market_id: RegisterView<u64>,
    /// Total volume
    pub total_volume: RegisterView<Amount>,
}

/// A prediction market
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Market {
    pub id: u64,
    pub creator: Owner,
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

/// User position in a market
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Position {
    pub market_id: u64,
    pub owner: Owner,
    pub yes_shares: Amount,
    pub no_shares: Amount,
    pub claimed: bool,
}

/// Trade details
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Trade {
    pub market_id: u64,
    pub trader: Owner,
    pub is_yes: bool,
    pub shares: Amount,
    pub cost: Amount,
    pub timestamp: Timestamp,
}
