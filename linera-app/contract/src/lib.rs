// Copyright (c) Chronos Markets
// Prediction Market Contract

#![cfg_attr(target_arch = "wasm32", no_main)]

pub mod state;

use chronos_market::{MarketAbi, Operation, OperationResponse, OrderSide, OrderDuration, FeedItemType};
use linera_sdk::{
    linera_base_types::{Amount, WithContractAbi, AccountOwner},
    views::{RootView, View},
    Contract, ContractRuntime,
};

use self::state::{MarketState, OrderStatus, ComboStatus, ComboLegState};

/// Safely compute (a * b) / c without u128 overflow.
///
/// Uses algebraic decomposition: a*b/c = (a/c)*b + (a%c)*b/c
/// This avoids the intermediate a*b product that can exceed u128::MAX
/// when both a and b are large Linera Amount values in attos (10^18 scale).
fn safe_mul_div(a: u128, b: u128, c: u128) -> u128 {
    assert!(c > 0, "Division by zero");

    // Fast path: if a * b fits in u128, do it directly
    if let Some(product) = a.checked_mul(b) {
        return product / c;
    }

    // Overflow path: decompose to avoid overflow
    // a * b / c = (a / c) * b + (a % c) * b / c
    let quotient = a / c;
    let remainder = a % c;

    // (a / c) * b — should fit since a/c is small for AMM values
    let term1 = quotient.checked_mul(b).expect("AMM result overflow");

    // (a % c) * b / c — remainder < c, so (a%c)*b/c < b
    let term2 = match remainder.checked_mul(b) {
        Some(rem_product) => rem_product / c,
        None => {
            // Even the remainder product overflows — use further decomposition
            // Split b: b = (b/c)*c + (b%c)
            // remainder * b / c = remainder * (b/c) + remainder * (b%c) / c
            let b_div_c = b / c;
            let b_mod_c = b % c;
            let sub1 = remainder.checked_mul(b_div_c).unwrap_or_else(|| {
                // Last resort: scale both down
                let scale = 1_000_000_000u128; // 10^9
                (remainder / scale) * (b_div_c / scale) * scale
            });
            let sub2 = match remainder.checked_mul(b_mod_c) {
                Some(p) => p / c,
                None => {
                    let scale = 1_000_000_000u128;
                    (remainder / scale) * (b_mod_c / scale) / (c / (scale * scale)).max(1)
                }
            };
            sub1 + sub2
        }
    };

    term1 + term2
}

linera_sdk::contract!(MarketContract);

pub struct MarketContract {
    state: MarketState,
    runtime: ContractRuntime<Self>,
}

impl WithContractAbi for MarketContract {
    type Abi = MarketAbi;
}

impl Contract for MarketContract {
    type Message = ();
    type InstantiationArgument = ();
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = MarketState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        MarketContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: ()) {
        self.runtime.application_parameters();
        self.state.next_market_id.set(0);
        self.state.next_order_id.set(0);
        self.state.next_combo_id.set(0);
        self.state.next_agent_id.set(0);
        self.state.next_feed_id.set(0);
        self.state.total_volume.set(Amount::ZERO);
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        let timestamp = self.runtime.system_time();
        let caller = self.runtime
            .authenticated_signer()
            .expect("Operation must be authenticated");

        match operation {
            // === MARKET OPERATIONS ===
            Operation::CreateMarket {
                question,
                categories,
                end_time,
                initial_liquidity,
            } => {
                let market_id = *self.state.next_market_id.get();
                self.state.next_market_id.set(market_id + 1);

                let half = Amount::from_attos(u128::from(initial_liquidity) / 2);

                let market = state::Market {
                    id: market_id,
                    creator: caller,
                    question: question.clone(),
                    categories: categories.clone(),
                    end_time,
                    created_at: timestamp,
                    yes_pool: half,
                    no_pool: half,
                    total_yes_shares: half,
                    total_no_shares: half,
                    resolved: false,
                    outcome: None,
                    volume: Amount::ZERO,
                };

                self.state.markets.insert(&market_id, market)
                    .expect("Failed to insert market");

                // Create feed item for market creation
                self.create_feed_item(caller, FeedItemType::MarketCreated, Some(market_id), question, timestamp).await;

                OperationResponse::MarketCreated(market_id)
            }

            Operation::BuyShares {
                market_id,
                is_yes,
                shares,
                max_cost,
            } => {
                let mut market = self.state.markets.get(&market_id)
                    .await
                    .expect("Failed to get market")
                    .expect("Market not found");

                assert!(!market.resolved, "Market is resolved");
                assert!(timestamp <= market.end_time, "Market has ended");

                let (pool_in, pool_out) = if is_yes {
                    (market.no_pool, market.yes_pool)
                } else {
                    (market.yes_pool, market.no_pool)
                };

                let pi = u128::from(pool_in);
                let po = u128::from(pool_out);
                let s = u128::from(shares);

                assert!(s < po, "Not enough liquidity");
                let denominator = po - s;

                // cost = pool_in * shares / (pool_out - shares)
                // Uses safe_mul_div to avoid u128 overflow
                let cost = Amount::from_attos(safe_mul_div(pi, s, denominator));

                assert!(cost <= max_cost, "Cost exceeds maximum");

                if is_yes {
                    market.no_pool = market.no_pool.saturating_add(cost);
                    market.yes_pool = market.yes_pool.saturating_sub(shares);
                    market.total_yes_shares = market.total_yes_shares.saturating_add(shares);
                } else {
                    market.yes_pool = market.yes_pool.saturating_add(cost);
                    market.no_pool = market.no_pool.saturating_sub(shares);
                    market.total_no_shares = market.total_no_shares.saturating_add(shares);
                }

                market.volume = market.volume.saturating_add(cost);
                self.state.markets.insert(&market_id, market.clone()).expect("Failed to update market");

                let total = *self.state.total_volume.get();
                self.state.total_volume.set(total.saturating_add(cost));

                self.update_position(caller, market_id, is_yes, shares, true).await;

                // Create feed item for trade
                let content = format!("Bought {} {} shares", shares, if is_yes { "YES" } else { "NO" });
                self.create_feed_item(caller, FeedItemType::Trade, Some(market_id), content, timestamp).await;

                OperationResponse::SharesPurchased { cost }
            }

            Operation::SellShares {
                market_id,
                is_yes,
                shares,
                min_proceeds,
            } => {
                let mut market = self.state.markets.get(&market_id)
                    .await
                    .expect("Failed to get market")
                    .expect("Market not found");

                assert!(!market.resolved, "Market is resolved");

                // Calculate proceeds using AMM
                let (pool_in, pool_out) = if is_yes {
                    (market.yes_pool, market.no_pool)
                } else {
                    (market.no_pool, market.yes_pool)
                };

                let po = u128::from(pool_out);
                let pi = u128::from(pool_in);
                let s = u128::from(shares);
                let new_pool_in = pi + s;

                // proceeds = pool_out * shares / (pool_in + shares)
                // Uses safe_mul_div to avoid u128 overflow
                let proceeds = Amount::from_attos(safe_mul_div(po, s, new_pool_in));

                assert!(proceeds >= min_proceeds, "Proceeds below minimum");

                if is_yes {
                    market.yes_pool = market.yes_pool.saturating_add(shares);
                    market.no_pool = market.no_pool.saturating_sub(proceeds);
                    market.total_yes_shares = market.total_yes_shares.saturating_sub(shares);
                } else {
                    market.no_pool = market.no_pool.saturating_add(shares);
                    market.yes_pool = market.yes_pool.saturating_sub(proceeds);
                    market.total_no_shares = market.total_no_shares.saturating_sub(shares);
                }

                market.volume = market.volume.saturating_add(proceeds);
                self.state.markets.insert(&market_id, market).expect("Failed to update market");

                self.update_position(caller, market_id, is_yes, shares, false).await;

                OperationResponse::SharesSold { proceeds }
            }

            Operation::ResolveMarket { market_id, outcome } => {
                let mut market = self.state.markets.get(&market_id)
                    .await
                    .expect("Failed to get market")
                    .expect("Market not found");

                assert!(!market.resolved, "Market already resolved");
                assert!(market.creator == caller, "Not authorized");

                market.resolved = true;
                market.outcome = Some(outcome);

                self.state.markets.insert(&market_id, market)
                    .expect("Failed to update market");

                // Update any combos that include this market
                self.update_combos_for_market(market_id, outcome).await;

                OperationResponse::MarketResolved
            }

            Operation::ClaimWinnings { market_id } => {
                let market = self.state.markets.get(&market_id)
                    .await
                    .expect("Failed to get market")
                    .expect("Market not found");

                assert!(market.resolved, "Market not resolved");

                let position_key = (caller, market_id);
                let mut position = self.state.positions.get(&position_key)
                    .await
                    .expect("Failed to get position")
                    .expect("No position found");

                assert!(!position.claimed, "Already claimed");

                let winning_shares = match market.outcome {
                    Some(true) => position.yes_shares,
                    Some(false) => position.no_shares,
                    None => panic!("Market outcome not set"),
                };

                assert!(winning_shares > Amount::ZERO, "No winning shares");

                let total_winning_shares = if market.outcome == Some(true) {
                    market.total_yes_shares
                } else {
                    market.total_no_shares
                };

                let total_pool = market.yes_pool.saturating_add(market.no_pool);
                let payout = Amount::from_attos(
                    safe_mul_div(u128::from(winning_shares), u128::from(total_pool), u128::from(total_winning_shares))
                );

                position.claimed = true;
                self.state.positions.insert(&position_key, position)
                    .expect("Failed to update position");

                OperationResponse::WinningsClaimed(payout)
            }

            // === LIMIT ORDER OPERATIONS ===
            Operation::PlaceLimitOrder {
                market_id,
                is_yes,
                side,
                price,
                amount,
                duration,
            } => {
                let market = self.state.markets.get(&market_id)
                    .await
                    .expect("Failed to get market")
                    .expect("Market not found");

                assert!(!market.resolved, "Market is resolved");

                let order_id = *self.state.next_order_id.get();
                self.state.next_order_id.set(order_id + 1);

                let order = state::LimitOrder {
                    id: order_id,
                    owner: caller,
                    market_id,
                    is_yes,
                    side,
                    price,
                    original_amount: amount,
                    filled_amount: Amount::ZERO,
                    duration,
                    created_at: timestamp,
                    status: OrderStatus::Open,
                };

                self.state.limit_orders.insert(&order_id, order)
                    .expect("Failed to insert order");

                OperationResponse::LimitOrderPlaced(order_id)
            }

            Operation::CancelLimitOrder { order_id } => {
                let mut order = self.state.limit_orders.get(&order_id)
                    .await
                    .expect("Failed to get order")
                    .expect("Order not found");

                assert!(order.owner == caller, "Not authorized");
                assert!(order.status == OrderStatus::Open || order.status == OrderStatus::PartiallyFilled, "Order not cancellable");

                order.status = OrderStatus::Cancelled;
                self.state.limit_orders.insert(&order_id, order)
                    .expect("Failed to update order");

                OperationResponse::LimitOrderCancelled
            }

            // === COMBO OPERATIONS ===
            Operation::CreateCombo { name, legs, stake } => {
                assert!(legs.len() >= 2, "Combo must have at least 2 legs");
                assert!(legs.len() <= 10, "Combo cannot have more than 10 legs");

                let combo_id = *self.state.next_combo_id.get();
                self.state.next_combo_id.set(combo_id + 1);

                let mut combo_legs = Vec::new();
                let mut combined_odds: u128 = 1_000_000_000_000_000_000; // 1e18 for precision

                for leg in legs {
                    let market = self.state.markets.get(&leg.market_id)
                        .await
                        .expect("Failed to get market")
                        .expect("Market not found");

                    assert!(!market.resolved, "Market already resolved");

                    // Calculate odds for this leg
                    let yes_pool: u128 = u128::from(market.yes_pool);
                    let no_pool: u128 = u128::from(market.no_pool);
                    let total = yes_pool + no_pool;
                    
                    let odds = if leg.prediction {
                        (no_pool * 1_000_000_000_000_000_000) / total
                    } else {
                        (yes_pool * 1_000_000_000_000_000_000) / total
                    };

                    combined_odds = (combined_odds * 1_000_000_000_000_000_000) / odds;

                    combo_legs.push(ComboLegState {
                        market_id: leg.market_id,
                        prediction: leg.prediction,
                        odds: Amount::from_attos(odds),
                        resolved: false,
                        won: None,
                    });
                }

                let potential_payout = Amount::from_attos(
                    (u128::from(stake) * combined_odds) / 1_000_000_000_000_000_000
                );

                let combo = state::Combo {
                    id: combo_id,
                    owner: caller,
                    name,
                    legs: combo_legs,
                    stake,
                    potential_payout,
                    created_at: timestamp,
                    status: ComboStatus::Active,
                };

                self.state.combos.insert(&combo_id, combo)
                    .expect("Failed to insert combo");

                OperationResponse::ComboCreated(combo_id)
            }

            Operation::CancelCombo { combo_id } => {
                let mut combo = self.state.combos.get(&combo_id)
                    .await
                    .expect("Failed to get combo")
                    .expect("Combo not found");

                assert!(combo.owner == caller, "Not authorized");
                assert!(combo.status == ComboStatus::Active, "Combo not active");

                // Check no legs are resolved yet
                assert!(combo.legs.iter().all(|l| !l.resolved), "Cannot cancel - some markets resolved");

                combo.status = ComboStatus::Cancelled;
                self.state.combos.insert(&combo_id, combo)
                    .expect("Failed to update combo");

                OperationResponse::ComboCancelled
            }

            // === AGENT OPERATIONS ===
            Operation::CreateAgent {
                name,
                strategy,
                config,
                initial_capital,
            } => {
                let agent_id = *self.state.next_agent_id.get();
                self.state.next_agent_id.set(agent_id + 1);

                let agent = state::TradingAgent {
                    id: agent_id,
                    owner: caller,
                    name,
                    strategy,
                    config,
                    capital: initial_capital,
                    total_volume: Amount::ZERO,
                    profit_loss: 0,
                    win_rate: 0,
                    total_trades: 0,
                    winning_trades: 0,
                    followers_count: 0,
                    is_active: true,
                    created_at: timestamp,
                };

                self.state.agents.insert(&agent_id, agent)
                    .expect("Failed to insert agent");

                OperationResponse::AgentCreated(agent_id)
            }

            Operation::UpdateAgentConfig { agent_id, config } => {
                let mut agent = self.state.agents.get(&agent_id)
                    .await
                    .expect("Failed to get agent")
                    .expect("Agent not found");

                assert!(agent.owner == caller, "Not authorized");

                agent.config = config;
                self.state.agents.insert(&agent_id, agent)
                    .expect("Failed to update agent");

                OperationResponse::AgentUpdated
            }

            Operation::ToggleAgent { agent_id, active } => {
                let mut agent = self.state.agents.get(&agent_id)
                    .await
                    .expect("Failed to get agent")
                    .expect("Agent not found");

                assert!(agent.owner == caller, "Not authorized");

                agent.is_active = active;
                self.state.agents.insert(&agent_id, agent)
                    .expect("Failed to update agent");

                OperationResponse::AgentToggled
            }

            Operation::FollowAgent { agent_id, allocation } => {
                let mut agent = self.state.agents.get(&agent_id)
                    .await
                    .expect("Failed to get agent")
                    .expect("Agent not found");

                let follower = state::AgentFollower {
                    agent_id,
                    follower: caller,
                    allocation,
                    copy_trades: true,
                    started_at: timestamp,
                    total_copied_pnl: 0,
                };

                let key = (agent_id, caller);
                self.state.agent_followers.insert(&key, follower)
                    .expect("Failed to insert follower");

                agent.followers_count += 1;
                self.state.agents.insert(&agent_id, agent)
                    .expect("Failed to update agent");

                OperationResponse::AgentFollowed
            }

            Operation::UnfollowAgent { agent_id } => {
                let mut agent = self.state.agents.get(&agent_id)
                    .await
                    .expect("Failed to get agent")
                    .expect("Agent not found");

                let key = (agent_id, caller);
                self.state.agent_followers.remove(&key)
                    .expect("Failed to remove follower");

                agent.followers_count = agent.followers_count.saturating_sub(1);
                self.state.agents.insert(&agent_id, agent)
                    .expect("Failed to update agent");

                OperationResponse::AgentUnfollowed
            }

            // === SOCIAL OPERATIONS ===
            Operation::PostComment { market_id, content } => {
                let feed_id = self.create_feed_item(caller, FeedItemType::Comment, Some(market_id), content, timestamp).await;
                OperationResponse::CommentPosted(feed_id)
            }

            Operation::FollowUser { user } => {
                let mut following = self.state.user_following.get(&caller)
                    .await
                    .expect("Failed to get following")
                    .unwrap_or_default();

                if !following.contains(&user) {
                    following.push(user);
                    self.state.user_following.insert(&caller, following)
                        .expect("Failed to update following");

                    let mut followers = self.state.user_followers.get(&user)
                        .await
                        .expect("Failed to get followers")
                        .unwrap_or_default();
                    followers.push(caller);
                    self.state.user_followers.insert(&user, followers)
                        .expect("Failed to update followers");
                }

                OperationResponse::UserFollowed
            }

            Operation::UnfollowUser { user } => {
                let mut following = self.state.user_following.get(&caller)
                    .await
                    .expect("Failed to get following")
                    .unwrap_or_default();

                following.retain(|u| u != &user);
                self.state.user_following.insert(&caller, following)
                    .expect("Failed to update following");

                let mut followers = self.state.user_followers.get(&user)
                    .await
                    .expect("Failed to get followers")
                    .unwrap_or_default();
                followers.retain(|u| u != &caller);
                self.state.user_followers.insert(&user, followers)
                    .expect("Failed to update followers");

                OperationResponse::UserUnfollowed
            }

            Operation::LikeFeedItem { item_id } => {
                let mut item = self.state.feed_items.get(&item_id)
                    .await
                    .expect("Failed to get item")
                    .expect("Item not found");

                let mut likes = self.state.item_likes.get(&item_id)
                    .await
                    .expect("Failed to get likes")
                    .unwrap_or_default();

                if !likes.contains(&caller) {
                    likes.push(caller);
                    item.likes_count += 1;
                    
                    self.state.item_likes.insert(&item_id, likes)
                        .expect("Failed to update likes");
                    self.state.feed_items.insert(&item_id, item)
                        .expect("Failed to update item");
                }

                OperationResponse::ItemLiked
            }
        }
    }

    async fn execute_message(&mut self, _message: ()) {
        panic!("Messages not supported");
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl MarketContract {
    async fn update_position(&mut self, owner: AccountOwner, market_id: u64, is_yes: bool, shares: Amount, is_buy: bool) {
        let position_key = (owner, market_id);
        let mut position = self.state.positions.get(&position_key)
            .await
            .expect("Failed to get position")
            .unwrap_or(state::Position {
                market_id,
                owner,
                yes_shares: Amount::ZERO,
                no_shares: Amount::ZERO,
                claimed: false,
            });

        if is_buy {
            if is_yes {
                position.yes_shares = position.yes_shares.saturating_add(shares);
            } else {
                position.no_shares = position.no_shares.saturating_add(shares);
            }
        } else {
            if is_yes {
                position.yes_shares = position.yes_shares.saturating_sub(shares);
            } else {
                position.no_shares = position.no_shares.saturating_sub(shares);
            }
        }

        self.state.positions.insert(&position_key, position)
            .expect("Failed to update position");
    }

    async fn create_feed_item(
        &mut self,
        author: AccountOwner,
        item_type: FeedItemType,
        market_id: Option<u64>,
        content: String,
        timestamp: linera_sdk::linera_base_types::Timestamp,
    ) -> u64 {
        let feed_id = *self.state.next_feed_id.get();
        self.state.next_feed_id.set(feed_id + 1);

        let item = state::FeedItem {
            id: feed_id,
            author,
            item_type,
            market_id,
            content,
            data: "{}".to_string(),
            likes_count: 0,
            comments_count: 0,
            created_at: timestamp,
        };

        self.state.feed_items.insert(&feed_id, item)
            .expect("Failed to insert feed item");

        feed_id
    }

    async fn update_combos_for_market(&mut self, market_id: u64, outcome: bool) {
        let next_combo_id = *self.state.next_combo_id.get();
        
        for combo_id in 0..next_combo_id {
            if let Ok(Some(mut combo)) = self.state.combos.get(&combo_id).await {
                if combo.status != ComboStatus::Active && combo.status != ComboStatus::PartiallyResolved {
                    continue;
                }

                let mut updated = false;
                let mut all_resolved = true;
                let mut any_lost = false;

                for leg in combo.legs.iter_mut() {
                    if leg.market_id == market_id && !leg.resolved {
                        leg.resolved = true;
                        leg.won = Some(leg.prediction == outcome);
                        updated = true;
                    }

                    if !leg.resolved {
                        all_resolved = false;
                    } else if leg.won == Some(false) {
                        any_lost = true;
                    }
                }

                if updated {
                    if any_lost {
                        combo.status = ComboStatus::Lost;
                    } else if all_resolved {
                        combo.status = ComboStatus::Won;
                    } else {
                        combo.status = ComboStatus::PartiallyResolved;
                    }

                    self.state.combos.insert(&combo_id, combo)
                        .expect("Failed to update combo");
                }
            }
        }
    }
}
