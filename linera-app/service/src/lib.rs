// Copyright (c) Chronos Markets
// Prediction Market Service (GraphQL API)

#![cfg_attr(target_arch = "wasm32", no_main)]

use std::sync::Arc;
use async_graphql::{EmptySubscription, Object, Request, Response, Schema, SimpleObject};
use linera_sdk::{
    linera_base_types::{AccountOwner, Amount, Timestamp, WithServiceAbi},
    views::{linera_views, MapView, RegisterView, RootView, View, ViewStorageContext},
    graphql::GraphQLMutationRoot as _,
    Service, ServiceRuntime,
};
use serde::{Deserialize, Serialize};
use chronos_market::{AgentStrategy, OrderSide, OrderDuration, FeedItemType, Operation};

linera_sdk::service!(MarketService);

// ============ STATE STRUCTURES ============

#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct MarketState {
    pub markets: MapView<u64, Market>,
    pub positions: MapView<(AccountOwner, u64), Position>,
    pub next_market_id: RegisterView<u64>,
    pub total_volume: RegisterView<Amount>,
    pub limit_orders: MapView<u64, LimitOrder>,
    pub next_order_id: RegisterView<u64>,
    pub combos: MapView<u64, Combo>,
    pub next_combo_id: RegisterView<u64>,
    pub agents: MapView<u64, TradingAgent>,
    pub next_agent_id: RegisterView<u64>,
    pub agent_followers: MapView<(u64, AccountOwner), AgentFollower>,
    pub feed_items: MapView<u64, FeedItem>,
    pub next_feed_id: RegisterView<u64>,
    pub user_followers: MapView<AccountOwner, Vec<AccountOwner>>,
    pub user_following: MapView<AccountOwner, Vec<AccountOwner>>,
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
    pub legs: Vec<ComboLeg>,
    pub stake: Amount,
    pub potential_payout: Amount,
    pub created_at: Timestamp,
    pub status: ComboStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComboLeg {
    pub market_id: u64,
    pub prediction: bool,
    pub odds: Amount,
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
    pub profit_loss: i128,
    pub win_rate: u32,
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
    pub data: String,
    pub likes_count: u64,
    pub comments_count: u64,
    pub created_at: Timestamp,
}

// ============ GRAPHQL TYPES ============

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
            end_time: format!("{}", m.end_time.micros()),
            created_at: format!("{}", m.created_at.micros()),
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

#[derive(SimpleObject)]
struct LimitOrderInfo {
    id: u64,
    owner: String,
    market_id: u64,
    is_yes: bool,
    side: String,
    price: String,
    original_amount: String,
    filled_amount: String,
    status: String,
    created_at: String,
}

impl From<LimitOrder> for LimitOrderInfo {
    fn from(o: LimitOrder) -> Self {
        LimitOrderInfo {
            id: o.id,
            owner: format!("{:?}", o.owner),
            market_id: o.market_id,
            is_yes: o.is_yes,
            side: format!("{:?}", o.side),
            price: format!("{}", o.price),
            original_amount: format!("{}", o.original_amount),
            filled_amount: format!("{}", o.filled_amount),
            status: format!("{:?}", o.status),
            created_at: format!("{}", o.created_at.micros()),
        }
    }
}

#[derive(SimpleObject)]
struct ComboInfo {
    id: u64,
    owner: String,
    name: String,
    legs: Vec<ComboLegInfo>,
    stake: String,
    potential_payout: String,
    status: String,
    created_at: String,
}

#[derive(SimpleObject)]
struct ComboLegInfo {
    market_id: u64,
    prediction: bool,
    odds: String,
    resolved: bool,
    won: Option<bool>,
}

impl From<Combo> for ComboInfo {
    fn from(c: Combo) -> Self {
        ComboInfo {
            id: c.id,
            owner: format!("{:?}", c.owner),
            name: c.name,
            legs: c.legs.into_iter().map(|l| ComboLegInfo {
                market_id: l.market_id,
                prediction: l.prediction,
                odds: format!("{}", l.odds),
                resolved: l.resolved,
                won: l.won,
            }).collect(),
            stake: format!("{}", c.stake),
            potential_payout: format!("{}", c.potential_payout),
            status: format!("{:?}", c.status),
            created_at: format!("{}", c.created_at.micros()),
        }
    }
}

#[derive(SimpleObject)]
struct AgentInfo {
    id: u64,
    owner: String,
    name: String,
    strategy: String,
    config: String,
    capital: String,
    total_volume: String,
    profit_loss: String,
    win_rate: f64,
    total_trades: u64,
    winning_trades: u64,
    followers_count: u64,
    is_active: bool,
    created_at: String,
}

impl From<TradingAgent> for AgentInfo {
    fn from(a: TradingAgent) -> Self {
        AgentInfo {
            id: a.id,
            owner: format!("{:?}", a.owner),
            name: a.name,
            strategy: format!("{:?}", a.strategy),
            config: a.config,
            capital: format!("{}", a.capital),
            total_volume: format!("{}", a.total_volume),
            profit_loss: a.profit_loss.to_string(),
            win_rate: a.win_rate as f64 / 100.0,
            total_trades: a.total_trades,
            winning_trades: a.winning_trades,
            followers_count: a.followers_count,
            is_active: a.is_active,
            created_at: format!("{}", a.created_at.micros()),
        }
    }
}

#[derive(SimpleObject)]
struct FeedItemInfo {
    id: u64,
    author: String,
    item_type: String,
    market_id: Option<u64>,
    content: String,
    data: String,
    likes_count: u64,
    comments_count: u64,
    created_at: String,
}

impl From<FeedItem> for FeedItemInfo {
    fn from(f: FeedItem) -> Self {
        FeedItemInfo {
            id: f.id,
            author: format!("{:?}", f.author),
            item_type: format!("{:?}", f.item_type),
            market_id: f.market_id,
            content: f.content,
            data: f.data,
            likes_count: f.likes_count,
            comments_count: f.comments_count,
            created_at: format!("{}", f.created_at.micros()),
        }
    }
}

// ============ SERVICE ============

pub struct MarketService {
    state: Arc<MarketState>,
    runtime: Arc<ServiceRuntime<Self>>,
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
        MarketService { 
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let total_volume = *self.state.total_volume.get();
        let next_market_id = *self.state.next_market_id.get();
        let next_order_id = *self.state.next_order_id.get();
        let next_combo_id = *self.state.next_combo_id.get();
        let next_agent_id = *self.state.next_agent_id.get();
        let next_feed_id = *self.state.next_feed_id.get();
        
        // Collect all markets
        let mut markets = Vec::new();
        for id in 0..next_market_id {
            if let Ok(Some(market)) = self.state.markets.get(&id).await {
                markets.push(MarketInfo::from(market));
            }
        }

        // Collect all limit orders
        let mut orders = Vec::new();
        for id in 0..next_order_id {
            if let Ok(Some(order)) = self.state.limit_orders.get(&id).await {
                orders.push(LimitOrderInfo::from(order));
            }
        }

        // Collect all combos
        let mut combos = Vec::new();
        for id in 0..next_combo_id {
            if let Ok(Some(combo)) = self.state.combos.get(&id).await {
                combos.push(ComboInfo::from(combo));
            }
        }

        // Collect all agents
        let mut agents = Vec::new();
        for id in 0..next_agent_id {
            if let Ok(Some(agent)) = self.state.agents.get(&id).await {
                agents.push(AgentInfo::from(agent));
            }
        }

        // Collect recent feed items (last 100)
        let mut feed_items = Vec::new();
        let start = if next_feed_id > 100 { next_feed_id - 100 } else { 0 };
        for id in start..next_feed_id {
            if let Ok(Some(item)) = self.state.feed_items.get(&id).await {
                feed_items.push(FeedItemInfo::from(item));
            }
        }
        feed_items.reverse(); // Most recent first
        
        let schema = Schema::build(
            QueryRoot { 
                total_volume,
                market_count: next_market_id,
                markets,
                orders,
                combos,
                agents,
                feed_items,
            },
            Operation::mutation_root(self.runtime.clone()),
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
    orders: Vec<LimitOrderInfo>,
    combos: Vec<ComboInfo>,
    agents: Vec<AgentInfo>,
    feed_items: Vec<FeedItemInfo>,
}

#[Object]
impl QueryRoot {
    // === Market Queries ===
    
    async fn total_volume(&self) -> String {
        format!("{}", self.total_volume)
    }
    
    async fn market_count(&self) -> u64 {
        self.market_count
    }
    
    async fn markets(&self) -> &Vec<MarketInfo> {
        &self.markets
    }
    
    async fn market(&self, id: u64) -> Option<&MarketInfo> {
        self.markets.iter().find(|m| m.id == id)
    }
    
    async fn active_markets(&self) -> Vec<&MarketInfo> {
        self.markets.iter().filter(|m| !m.resolved).collect()
    }
    
    async fn resolved_markets(&self) -> Vec<&MarketInfo> {
        self.markets.iter().filter(|m| m.resolved).collect()
    }

    async fn markets_by_category(&self, category: String) -> Vec<&MarketInfo> {
        self.markets.iter().filter(|m| m.categories.contains(&category)).collect()
    }

    // === Limit Order Queries ===
    
    async fn limit_orders(&self) -> &Vec<LimitOrderInfo> {
        &self.orders
    }

    async fn limit_order(&self, id: u64) -> Option<&LimitOrderInfo> {
        self.orders.iter().find(|o| o.id == id)
    }

    async fn orders_by_market(&self, market_id: u64) -> Vec<&LimitOrderInfo> {
        self.orders.iter().filter(|o| o.market_id == market_id && o.status == "Open").collect()
    }

    async fn open_orders(&self) -> Vec<&LimitOrderInfo> {
        self.orders.iter().filter(|o| o.status == "Open" || o.status == "PartiallyFilled").collect()
    }

    // === Combo Queries ===
    
    async fn combos(&self) -> &Vec<ComboInfo> {
        &self.combos
    }

    async fn combo(&self, id: u64) -> Option<&ComboInfo> {
        self.combos.iter().find(|c| c.id == id)
    }

    async fn active_combos(&self) -> Vec<&ComboInfo> {
        self.combos.iter().filter(|c| c.status == "Active" || c.status == "PartiallyResolved").collect()
    }

    // === Agent Queries ===
    
    async fn agents(&self) -> &Vec<AgentInfo> {
        &self.agents
    }

    async fn agent(&self, id: u64) -> Option<&AgentInfo> {
        self.agents.iter().find(|a| a.id == id)
    }

    async fn active_agents(&self) -> Vec<&AgentInfo> {
        self.agents.iter().filter(|a| a.is_active).collect()
    }

    async fn top_agents(&self, limit: Option<i32>) -> Vec<&AgentInfo> {
        let limit = limit.unwrap_or(10) as usize;
        let mut sorted: Vec<_> = self.agents.iter().collect();
        sorted.sort_by(|a, b| {
            let a_pnl: i128 = a.profit_loss.parse().unwrap_or(0);
            let b_pnl: i128 = b.profit_loss.parse().unwrap_or(0);
            b_pnl.cmp(&a_pnl)
        });
        sorted.into_iter().take(limit).collect()
    }

    // === Social Feed Queries ===
    
    async fn feed(&self, limit: Option<i32>) -> Vec<&FeedItemInfo> {
        let limit = limit.unwrap_or(50) as usize;
        self.feed_items.iter().take(limit).collect()
    }

    async fn feed_item(&self, id: u64) -> Option<&FeedItemInfo> {
        self.feed_items.iter().find(|f| f.id == id)
    }

    async fn feed_by_market(&self, market_id: u64) -> Vec<&FeedItemInfo> {
        self.feed_items.iter().filter(|f| f.market_id == Some(market_id)).collect()
    }

    async fn feed_by_type(&self, item_type: String) -> Vec<&FeedItemInfo> {
        self.feed_items.iter().filter(|f| f.item_type == item_type).collect()
    }
}
