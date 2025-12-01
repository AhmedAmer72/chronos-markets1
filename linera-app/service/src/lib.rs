// Copyright (c) Chronos Markets
// Prediction Market Service (GraphQL API)

#![cfg_attr(target_arch = "wasm32", no_main)]

use async_graphql::{EmptySubscription, Object, Request, Response, Schema, SimpleObject};
use linera_sdk::{
    linera_base_types::{AccountOwner, Amount, Timestamp, WithServiceAbi},
    views::{linera_views, MapView, RegisterView, RootView, View, ViewStorageContext},
    Service, ServiceRuntime,
};
use serde::{Deserialize, Serialize};

linera_sdk::service!(MarketService);

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

/// GraphQL representation of a market
#[derive(SimpleObject)]
struct MarketInfo {
    id: u64,
    creator: String,
    question: String,
    categories: Vec<String>,
    end_time: String,
    created_at: String,
    yes_pool: String,
    no_pool: String,
    total_yes_shares: String,
    total_no_shares: String,
    resolved: bool,
    outcome: Option<bool>,
    volume: String,
    yes_price: f64,
    no_price: f64,
}

impl From<Market> for MarketInfo {
    fn from(m: Market) -> Self {
        let yes_pool_val: f64 = u128::from(m.yes_pool) as f64;
        let no_pool_val: f64 = u128::from(m.no_pool) as f64;
        let total = yes_pool_val + no_pool_val;
        
        let yes_price = if total > 0.0 { no_pool_val / total } else { 0.5 };
        let no_price = if total > 0.0 { yes_pool_val / total } else { 0.5 };
        
        MarketInfo {
            id: m.id,
            creator: format!("{:?}", m.creator),
            question: m.question,
            categories: m.categories,
            end_time: format!("{}", u64::from(m.end_time)),
            created_at: format!("{}", u64::from(m.created_at)),
            yes_pool: format!("{}", m.yes_pool),
            no_pool: format!("{}", m.no_pool),
            total_yes_shares: format!("{}", m.total_yes_shares),
            total_no_shares: format!("{}", m.total_no_shares),
            resolved: m.resolved,
            outcome: m.outcome,
            volume: format!("{}", m.volume),
            yes_price,
            no_price,
        }
    }
}

/// GraphQL representation of a position
#[derive(SimpleObject)]
struct PositionInfo {
    market_id: u64,
    owner: String,
    yes_shares: String,
    no_shares: String,
    claimed: bool,
}

impl From<Position> for PositionInfo {
    fn from(p: Position) -> Self {
        PositionInfo {
            market_id: p.market_id,
            owner: format!("{:?}", p.owner),
            yes_shares: format!("{}", p.yes_shares),
            no_shares: format!("{}", p.no_shares),
            claimed: p.claimed,
        }
    }
}

pub struct MarketService {
    state: MarketState,
}

impl WithServiceAbi for MarketService {
    type Abi = chronos_market::MarketAbi;
}

impl Service for MarketService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = MarketState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        MarketService { state }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let total_volume = *self.state.total_volume.get();
        let next_id = *self.state.next_market_id.get();
        
        // Collect all markets
        let mut markets = Vec::new();
        for id in 0..next_id {
            if let Ok(Some(market)) = self.state.markets.get(&id).await {
                markets.push(MarketInfo::from(market));
            }
        }
        
        let schema = Schema::build(
            QueryRoot { 
                total_volume,
                market_count: next_id,
                markets,
            },
            MutationRoot,
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

struct QueryRoot {
    total_volume: Amount,
    market_count: u64,
    markets: Vec<MarketInfo>,
}

#[Object]
impl QueryRoot {
    /// Get the total trading volume across all markets
    async fn total_volume(&self) -> String {
        format!("{}", self.total_volume)
    }
    
    /// Get the total number of markets created
    async fn market_count(&self) -> u64 {
        self.market_count
    }
    
    /// Get all markets
    async fn markets(&self) -> &Vec<MarketInfo> {
        &self.markets
    }
    
    /// Get a specific market by ID
    async fn market(&self, id: u64) -> Option<&MarketInfo> {
        self.markets.iter().find(|m| m.id == id)
    }
    
    /// Get active (non-resolved) markets
    async fn active_markets(&self) -> Vec<&MarketInfo> {
        self.markets.iter().filter(|m| !m.resolved).collect()
    }
    
    /// Get resolved markets
    async fn resolved_markets(&self) -> Vec<&MarketInfo> {
        self.markets.iter().filter(|m| m.resolved).collect()
    }
}

struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Placeholder - actual mutations are handled via Linera operations
    async fn placeholder(&self) -> bool {
        true
    }
}
