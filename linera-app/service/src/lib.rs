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
        let schema = Schema::build(
            QueryRoot { total_volume },
            MutationRoot,
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

struct QueryRoot {
    total_volume: Amount,
}

#[Object]
impl QueryRoot {
    async fn total_volume(&self) -> String {
        format!("{}", self.total_volume)
    }
}

struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn placeholder(&self) -> bool {
        true
    }
}
