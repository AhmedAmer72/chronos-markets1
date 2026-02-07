/*!
Chronos Markets Service v2.0 - GraphQL Interface

Following Linera-Mine pattern (NeoCrafts-cpu/Linera-Mine):
- Arc<MarketState> for lazy on-demand state queries
- QueryRoot with comprehensive query methods
- Health check endpoint (hello)
- Schema::build(QueryRoot, MutationRoot, EmptySubscription)
*/

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;
use async_graphql::{EmptySubscription, Object, Request, Response, Schema, SimpleObject};
use chronos_market::{
    MarketAbi, Operation, MarketState,
    Market, Position, LimitOrder, OrderStatus, Combo, ComboStatus,
    TradingAgent, FeedItem,
};
use linera_sdk::{
    linera_base_types::{AccountOwner, Amount, WithServiceAbi},
    views::View,
    graphql::GraphQLMutationRoot as _,
    Service, ServiceRuntime,
};

// ============ SERVICE (Linera-Mine pattern) ============

pub struct MarketService {
    state: Arc<MarketState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(MarketService);

impl WithServiceAbi for MarketService {
    type Abi = MarketAbi;
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
        let schema = Schema::build(
            QueryRoot {
                state: self.state.clone(),
            },
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

// ============ GRAPHQL OUTPUT TYPES ============
// Wrapper types to convert Amount/AccountOwner/Timestamp to strings
// (async_graphql doesn't support i128 natively)

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
        let yes_pool_val = u128::from(m.yes_pool) as f64;
        let no_pool_val = u128::from(m.no_pool) as f64;
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

// ============ QUERY ROOT (Linera-Mine pattern: lazy Arc<State> queries) ============

struct QueryRoot {
    state: Arc<MarketState>,
}

// Private helpers (not GraphQL resolvers)
impl QueryRoot {
    async fn collect_feed_items(&self, limit: usize) -> Vec<FeedItemInfo> {
        let next_id = *self.state.next_feed_id.get();
        let start = if next_id > 100 { next_id - 100 } else { 0 };
        let mut items = Vec::new();
        for id in start..next_id {
            if let Ok(Some(item)) = self.state.feed_items.get(&id).await {
                items.push(FeedItemInfo::from(item));
            }
        }
        items.reverse();
        items.into_iter().take(limit).collect()
    }
}

#[Object]
impl QueryRoot {
    /// Health check - service status
    async fn hello(&self) -> String {
        "Chronos Markets v2.0 - Decentralized Prediction Market on Linera".to_string()
    }

    // ==================== MARKET QUERIES ====================

    async fn total_volume(&self) -> String {
        format!("{}", *self.state.total_volume.get())
    }

    async fn market_count(&self) -> u64 {
        *self.state.next_market_id.get()
    }

    /// Get all markets
    async fn markets(&self) -> Vec<MarketInfo> {
        let mut markets = Vec::new();
        let next_id = *self.state.next_market_id.get();
        for id in 0..next_id.max(100) {
            if let Ok(Some(m)) = self.state.markets.get(&id).await {
                markets.push(MarketInfo::from(m));
            }
        }
        markets
    }

    /// Get a specific market by ID
    async fn market(&self, id: u64) -> Option<MarketInfo> {
        match self.state.markets.get(&id).await {
            Ok(Some(m)) => Some(MarketInfo::from(m)),
            _ => None,
        }
    }

    /// Get active (non-resolved) markets
    async fn active_markets(&self) -> Vec<MarketInfo> {
        let mut markets = Vec::new();
        let next_id = *self.state.next_market_id.get();
        for id in 0..next_id.max(100) {
            if let Ok(Some(m)) = self.state.markets.get(&id).await {
                if !m.resolved {
                    markets.push(MarketInfo::from(m));
                }
            }
        }
        markets
    }

    /// Get resolved markets
    async fn resolved_markets(&self) -> Vec<MarketInfo> {
        let mut markets = Vec::new();
        let next_id = *self.state.next_market_id.get();
        for id in 0..next_id.max(100) {
            if let Ok(Some(m)) = self.state.markets.get(&id).await {
                if m.resolved {
                    markets.push(MarketInfo::from(m));
                }
            }
        }
        markets
    }

    /// Get markets by category
    async fn markets_by_category(&self, category: String) -> Vec<MarketInfo> {
        let mut markets = Vec::new();
        let next_id = *self.state.next_market_id.get();
        for id in 0..next_id.max(100) {
            if let Ok(Some(m)) = self.state.markets.get(&id).await {
                if m.categories.contains(&category) {
                    markets.push(MarketInfo::from(m));
                }
            }
        }
        markets
    }

    // ==================== POSITION QUERIES ====================

    /// Get all positions for a wallet address
    async fn positions(&self, wallet: String) -> Vec<PositionInfo> {
        let mut positions = Vec::new();
        let mut keys = Vec::new();
        let _ = self.state.positions.for_each_index(|key| {
            keys.push(key.clone());
            Ok(())
        }).await;

        for key in keys {
            let owner_str = format!("{:?}", key.0);
            if owner_str.contains(&wallet) || wallet.contains(&owner_str) {
                if let Ok(Some(pos)) = self.state.positions.get(&key).await {
                    positions.push(PositionInfo::from(pos));
                }
            }
        }
        positions
    }

    /// Get position for a specific wallet and market
    async fn position(&self, wallet: String, market_id: u64) -> Option<PositionInfo> {
        let mut keys = Vec::new();
        let _ = self.state.positions.for_each_index(|key| {
            if key.1 == market_id {
                keys.push(key.clone());
            }
            Ok(())
        }).await;

        for key in keys {
            let owner_str = format!("{:?}", key.0);
            if owner_str.contains(&wallet) || wallet.contains(&owner_str) {
                if let Ok(Some(pos)) = self.state.positions.get(&key).await {
                    return Some(PositionInfo::from(pos));
                }
            }
        }
        None
    }

    // ==================== LIMIT ORDER QUERIES ====================

    /// Get all limit orders
    async fn limit_orders(&self) -> Vec<LimitOrderInfo> {
        let mut orders = Vec::new();
        let next_id = *self.state.next_order_id.get();
        for id in 0..next_id.max(100) {
            if let Ok(Some(order)) = self.state.limit_orders.get(&id).await {
                orders.push(LimitOrderInfo::from(order));
            }
        }
        orders
    }

    /// Get a specific limit order by ID
    async fn limit_order(&self, id: u64) -> Option<LimitOrderInfo> {
        match self.state.limit_orders.get(&id).await {
            Ok(Some(o)) => Some(LimitOrderInfo::from(o)),
            _ => None,
        }
    }

    /// Get orders for a specific market
    async fn orders_by_market(&self, market_id: u64) -> Vec<LimitOrderInfo> {
        let mut orders = Vec::new();
        let next_id = *self.state.next_order_id.get();
        for id in 0..next_id.max(100) {
            if let Ok(Some(order)) = self.state.limit_orders.get(&id).await {
                if order.market_id == market_id && order.status == OrderStatus::Open {
                    orders.push(LimitOrderInfo::from(order));
                }
            }
        }
        orders
    }

    /// Get all open orders
    async fn open_orders(&self) -> Vec<LimitOrderInfo> {
        let mut orders = Vec::new();
        let next_id = *self.state.next_order_id.get();
        for id in 0..next_id.max(100) {
            if let Ok(Some(order)) = self.state.limit_orders.get(&id).await {
                if order.status == OrderStatus::Open || order.status == OrderStatus::PartiallyFilled {
                    orders.push(LimitOrderInfo::from(order));
                }
            }
        }
        orders
    }

    // ==================== COMBO QUERIES ====================

    /// Get all combos
    async fn combos(&self) -> Vec<ComboInfo> {
        let mut combos = Vec::new();
        let next_id = *self.state.next_combo_id.get();
        for id in 0..next_id.max(100) {
            if let Ok(Some(combo)) = self.state.combos.get(&id).await {
                combos.push(ComboInfo::from(combo));
            }
        }
        combos
    }

    /// Get a specific combo by ID
    async fn combo(&self, id: u64) -> Option<ComboInfo> {
        match self.state.combos.get(&id).await {
            Ok(Some(c)) => Some(ComboInfo::from(c)),
            _ => None,
        }
    }

    /// Get active combos
    async fn active_combos(&self) -> Vec<ComboInfo> {
        let mut combos = Vec::new();
        let next_id = *self.state.next_combo_id.get();
        for id in 0..next_id.max(100) {
            if let Ok(Some(combo)) = self.state.combos.get(&id).await {
                if combo.status == ComboStatus::Active || combo.status == ComboStatus::PartiallyResolved {
                    combos.push(ComboInfo::from(combo));
                }
            }
        }
        combos
    }

    // ==================== AGENT QUERIES ====================

    /// Get all trading agents
    async fn agents(&self) -> Vec<AgentInfo> {
        let mut agents = Vec::new();
        let next_id = *self.state.next_agent_id.get();
        for id in 0..next_id.max(100) {
            if let Ok(Some(agent)) = self.state.agents.get(&id).await {
                agents.push(AgentInfo::from(agent));
            }
        }
        agents
    }

    /// Get a specific agent by ID
    async fn agent(&self, id: u64) -> Option<AgentInfo> {
        match self.state.agents.get(&id).await {
            Ok(Some(a)) => Some(AgentInfo::from(a)),
            _ => None,
        }
    }

    /// Get active agents
    async fn active_agents(&self) -> Vec<AgentInfo> {
        let mut agents = Vec::new();
        let next_id = *self.state.next_agent_id.get();
        for id in 0..next_id.max(100) {
            if let Ok(Some(agent)) = self.state.agents.get(&id).await {
                if agent.is_active {
                    agents.push(AgentInfo::from(agent));
                }
            }
        }
        agents
    }

    /// Get top agents by profit/loss
    async fn top_agents(&self, limit: Option<i32>) -> Vec<AgentInfo> {
        let limit = limit.unwrap_or(10) as usize;
        let mut agents = Vec::new();
        let next_id = *self.state.next_agent_id.get();
        for id in 0..next_id.max(100) {
            if let Ok(Some(agent)) = self.state.agents.get(&id).await {
                agents.push(AgentInfo::from(agent));
            }
        }
        agents.sort_by(|a, b| {
            let a_pnl: i128 = a.profit_loss.parse().unwrap_or(0);
            let b_pnl: i128 = b.profit_loss.parse().unwrap_or(0);
            b_pnl.cmp(&a_pnl)
        });
        agents.into_iter().take(limit).collect()
    }

    // ==================== SOCIAL FEED QUERIES ====================

    /// Get recent feed items
    async fn feed(&self, limit: Option<i32>) -> Vec<FeedItemInfo> {
        self.collect_feed_items(limit.unwrap_or(50) as usize).await
    }

    /// Alias for feed() - matches frontend socialFeed query
    async fn social_feed(&self, limit: Option<i32>) -> Vec<FeedItemInfo> {
        self.collect_feed_items(limit.unwrap_or(50) as usize).await
    }

    /// Get a specific feed item by ID
    async fn feed_item(&self, id: u64) -> Option<FeedItemInfo> {
        match self.state.feed_items.get(&id).await {
            Ok(Some(f)) => Some(FeedItemInfo::from(f)),
            _ => None,
        }
    }

    /// Get feed items for a specific market
    async fn feed_by_market(&self, market_id: u64) -> Vec<FeedItemInfo> {
        let mut items = Vec::new();
        let next_id = *self.state.next_feed_id.get();
        let start = if next_id > 100 { next_id - 100 } else { 0 };
        for id in start..next_id {
            if let Ok(Some(item)) = self.state.feed_items.get(&id).await {
                if item.market_id == Some(market_id) {
                    items.push(FeedItemInfo::from(item));
                }
            }
        }
        items.reverse();
        items
    }

    /// Get feed items by type
    async fn feed_by_type(&self, item_type: String) -> Vec<FeedItemInfo> {
        let mut items = Vec::new();
        let next_id = *self.state.next_feed_id.get();
        let start = if next_id > 100 { next_id - 100 } else { 0 };
        for id in start..next_id {
            if let Ok(Some(item)) = self.state.feed_items.get(&id).await {
                if format!("{:?}", item.item_type) == item_type {
                    items.push(FeedItemInfo::from(item));
                }
            }
        }
        items.reverse();
        items
    }
}
