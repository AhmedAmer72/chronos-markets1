// Copyright (c) Chronos Markets
// Prediction Market Contract — v2.0 with proper error handling (no panics)

#![cfg_attr(target_arch = "wasm32", no_main)]

pub mod state;

use chronos_market::{MarketAbi, Operation, FeedItemType};
use linera_sdk::{
    linera_base_types::{Amount, WithContractAbi, AccountOwner},
    views::{RootView, View},
    Contract, ContractRuntime,
};

use self::state::{MarketState, OrderStatus, ComboStatus, ComboLegState};

/// Safely compute (a * b) / c without u128 overflow.
fn safe_mul_div(a: u128, b: u128, c: u128) -> Result<u128, String> {
    if c == 0 {
        return Err("Division by zero in AMM calculation".to_string());
    }

    // Fast path: if a * b fits in u128, do it directly
    if let Some(product) = a.checked_mul(b) {
        return Ok(product / c);
    }

    // Overflow path: decompose to avoid overflow
    let quotient = a / c;
    let remainder = a % c;

    let term1 = quotient.checked_mul(b)
        .ok_or_else(|| format!("AMM overflow: quotient={} * b={}", quotient, b))?;

    let term2 = match remainder.checked_mul(b) {
        Some(rem_product) => rem_product / c,
        None => {
            let b_div_c = b / c;
            let b_mod_c = b % c;
            let sub1 = remainder.checked_mul(b_div_c).unwrap_or_else(|| {
                let scale = 1_000_000_000u128;
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

    Ok(term1 + term2)
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

    /// Execute an operation. Returns a String response.
    /// On success: a descriptive result string.
    /// On error: a string starting with "ERROR:" describing the failure.
    /// This function NEVER panics — all errors are caught and returned as strings.
    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        match self.execute_operation_inner(operation).await {
            Ok(response) => response,
            Err(e) => format!("ERROR: {}", e),
        }
    }

    async fn execute_message(&mut self, _message: ()) {
        // Messages not supported
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl MarketContract {
    /// Inner implementation that uses Result for clean error propagation.
    async fn execute_operation_inner(&mut self, operation: Operation) -> Result<String, String> {
        let timestamp = self.runtime.system_time();
        let caller = self.runtime
            .authenticated_signer()
            .ok_or_else(|| "Operation must be authenticated — no signer found".to_string())?;

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

                let liq_attos = u128::from(initial_liquidity);
                if liq_attos == 0 {
                    return Err("Initial liquidity must be greater than zero".to_string());
                }
                let half = Amount::from_attos(liq_attos / 2);

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
                    .map_err(|e| format!("Failed to insert market: {}", e))?;

                self.create_feed_item(caller, FeedItemType::MarketCreated, Some(market_id), question, timestamp).await?;

                Ok(format!("MarketCreated:{}", market_id))
            }

            Operation::BuyShares {
                market_id,
                is_yes,
                shares,
                max_cost,
            } => {
                let mut market = self.state.markets.get(&market_id)
                    .await
                    .map_err(|e| format!("Failed to read market {}: {}", market_id, e))?
                    .ok_or_else(|| format!("Market {} not found", market_id))?;

                if market.resolved {
                    return Err(format!("Market {} is already resolved", market_id));
                }
                if timestamp > market.end_time {
                    return Err(format!(
                        "Market {} has ended (now={}, end={})",
                        market_id, timestamp.micros(), market.end_time.micros()
                    ));
                }

                let (pool_in, pool_out) = if is_yes {
                    (market.no_pool, market.yes_pool)
                } else {
                    (market.yes_pool, market.no_pool)
                };

                let pi = u128::from(pool_in);
                let po = u128::from(pool_out);
                let s = u128::from(shares);

                if s == 0 {
                    return Err("Shares amount must be greater than zero".to_string());
                }
                if s >= po {
                    return Err(format!(
                        "Not enough liquidity: requested {} shares but pool only has {} (pool_in={}, pool_out={})",
                        shares, pool_out, pool_in, pool_out
                    ));
                }

                let denominator = po - s;

                // cost = pool_in * shares / (pool_out - shares)
                let cost_attos = safe_mul_div(pi, s, denominator)?;
                let cost = Amount::from_attos(cost_attos);

                if cost > max_cost {
                    return Err(format!(
                        "Cost {} exceeds max_cost {} (pool_in={}, pool_out={}, shares={})",
                        cost, max_cost, pool_in, pool_out, shares
                    ));
                }

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
                self.state.markets.insert(&market_id, market.clone())
                    .map_err(|e| format!("Failed to update market: {}", e))?;

                let total = *self.state.total_volume.get();
                self.state.total_volume.set(total.saturating_add(cost));

                self.update_position(caller, market_id, is_yes, shares, true).await?;

                let content = format!("Bought {} {} shares", shares, if is_yes { "YES" } else { "NO" });
                self.create_feed_item(caller, FeedItemType::Trade, Some(market_id), content, timestamp).await?;

                Ok(format!("SharesPurchased:{}", cost))
            }

            Operation::SellShares {
                market_id,
                is_yes,
                shares,
                min_proceeds,
            } => {
                let mut market = self.state.markets.get(&market_id)
                    .await
                    .map_err(|e| format!("Failed to read market {}: {}", market_id, e))?
                    .ok_or_else(|| format!("Market {} not found", market_id))?;

                if market.resolved {
                    return Err(format!("Market {} is already resolved", market_id));
                }

                let (pool_in, pool_out) = if is_yes {
                    (market.yes_pool, market.no_pool)
                } else {
                    (market.no_pool, market.yes_pool)
                };

                let po = u128::from(pool_out);
                let pi = u128::from(pool_in);
                let s = u128::from(shares);

                if s == 0 {
                    return Err("Shares amount must be greater than zero".to_string());
                }

                let new_pool_in = pi + s;
                let proceeds_attos = safe_mul_div(po, s, new_pool_in)?;
                let proceeds = Amount::from_attos(proceeds_attos);

                if proceeds < min_proceeds {
                    return Err(format!(
                        "Proceeds {} below minimum {} (pool_in={}, pool_out={}, shares={})",
                        proceeds, min_proceeds, pool_in, pool_out, shares
                    ));
                }

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
                self.state.markets.insert(&market_id, market)
                    .map_err(|e| format!("Failed to update market: {}", e))?;

                self.update_position(caller, market_id, is_yes, shares, false).await?;

                Ok(format!("SharesSold:{}", proceeds))
            }

            Operation::ResolveMarket { market_id, outcome } => {
                let mut market = self.state.markets.get(&market_id)
                    .await
                    .map_err(|e| format!("Failed to read market {}: {}", market_id, e))?
                    .ok_or_else(|| format!("Market {} not found", market_id))?;

                if market.resolved {
                    return Err(format!("Market {} is already resolved", market_id));
                }
                if market.creator != caller {
                    return Err("Not authorized: only the creator can resolve this market".to_string());
                }

                market.resolved = true;
                market.outcome = Some(outcome);

                self.state.markets.insert(&market_id, market)
                    .map_err(|e| format!("Failed to update market: {}", e))?;

                self.update_combos_for_market(market_id, outcome).await?;

                Ok("MarketResolved".to_string())
            }

            Operation::ClaimWinnings { market_id } => {
                let market = self.state.markets.get(&market_id)
                    .await
                    .map_err(|e| format!("Failed to read market {}: {}", market_id, e))?
                    .ok_or_else(|| format!("Market {} not found", market_id))?;

                if !market.resolved {
                    return Err(format!("Market {} is not yet resolved", market_id));
                }

                let position_key = (caller, market_id);
                let mut position = self.state.positions.get(&position_key)
                    .await
                    .map_err(|e| format!("Failed to get position: {}", e))?
                    .ok_or_else(|| "No position found for this market".to_string())?;

                if position.claimed {
                    return Err("Winnings already claimed".to_string());
                }

                let winning_shares = match market.outcome {
                    Some(true) => position.yes_shares,
                    Some(false) => position.no_shares,
                    None => return Err("Market outcome not set".to_string()),
                };

                if winning_shares == Amount::ZERO {
                    return Err("No winning shares".to_string());
                }

                let total_winning_shares = if market.outcome == Some(true) {
                    market.total_yes_shares
                } else {
                    market.total_no_shares
                };

                let total_pool = market.yes_pool.saturating_add(market.no_pool);
                let payout = Amount::from_attos(
                    safe_mul_div(u128::from(winning_shares), u128::from(total_pool), u128::from(total_winning_shares))?
                );

                position.claimed = true;
                self.state.positions.insert(&position_key, position)
                    .map_err(|e| format!("Failed to update position: {}", e))?;

                Ok(format!("WinningsClaimed:{}", payout))
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
                    .map_err(|e| format!("Failed to read market: {}", e))?
                    .ok_or_else(|| format!("Market {} not found", market_id))?;

                if market.resolved {
                    return Err(format!("Market {} is already resolved", market_id));
                }

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
                    .map_err(|e| format!("Failed to insert order: {}", e))?;

                Ok(format!("LimitOrderPlaced:{}", order_id))
            }

            Operation::CancelLimitOrder { order_id } => {
                let mut order = self.state.limit_orders.get(&order_id)
                    .await
                    .map_err(|e| format!("Failed to read order: {}", e))?
                    .ok_or_else(|| format!("Order {} not found", order_id))?;

                if order.owner != caller {
                    return Err("Not authorized: not the order owner".to_string());
                }
                if order.status != OrderStatus::Open && order.status != OrderStatus::PartiallyFilled {
                    return Err(format!("Order {} is not cancellable (status: {:?})", order_id, order.status));
                }

                order.status = OrderStatus::Cancelled;
                self.state.limit_orders.insert(&order_id, order)
                    .map_err(|e| format!("Failed to update order: {}", e))?;

                Ok("LimitOrderCancelled".to_string())
            }

            // === COMBO OPERATIONS ===
            Operation::CreateCombo { name, legs, stake } => {
                if legs.len() < 2 {
                    return Err("Combo must have at least 2 legs".to_string());
                }
                if legs.len() > 10 {
                    return Err("Combo cannot have more than 10 legs".to_string());
                }

                let combo_id = *self.state.next_combo_id.get();
                self.state.next_combo_id.set(combo_id + 1);

                let mut combo_legs = Vec::new();
                let mut combined_odds: u128 = 1_000_000_000_000_000_000;

                for leg in legs {
                    let market = self.state.markets.get(&leg.market_id)
                        .await
                        .map_err(|e| format!("Failed to read market {}: {}", leg.market_id, e))?
                        .ok_or_else(|| format!("Market {} not found", leg.market_id))?;

                    if market.resolved {
                        return Err(format!("Market {} in combo is already resolved", leg.market_id));
                    }

                    let yes_pool: u128 = u128::from(market.yes_pool);
                    let no_pool: u128 = u128::from(market.no_pool);
                    let total = yes_pool + no_pool;

                    if total == 0 {
                        return Err(format!("Market {} has zero liquidity", leg.market_id));
                    }

                    let odds = if leg.prediction {
                        (no_pool * 1_000_000_000_000_000_000) / total
                    } else {
                        (yes_pool * 1_000_000_000_000_000_000) / total
                    };

                    if odds > 0 {
                        combined_odds = (combined_odds * 1_000_000_000_000_000_000) / odds;
                    }

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
                    .map_err(|e| format!("Failed to insert combo: {}", e))?;

                Ok(format!("ComboCreated:{}", combo_id))
            }

            Operation::CancelCombo { combo_id } => {
                let mut combo = self.state.combos.get(&combo_id)
                    .await
                    .map_err(|e| format!("Failed to read combo: {}", e))?
                    .ok_or_else(|| format!("Combo {} not found", combo_id))?;

                if combo.owner != caller {
                    return Err("Not authorized: not the combo owner".to_string());
                }
                if combo.status != ComboStatus::Active {
                    return Err(format!("Combo {} is not active (status: {:?})", combo_id, combo.status));
                }
                if !combo.legs.iter().all(|l| !l.resolved) {
                    return Err("Cannot cancel combo — some markets are already resolved".to_string());
                }

                combo.status = ComboStatus::Cancelled;
                self.state.combos.insert(&combo_id, combo)
                    .map_err(|e| format!("Failed to update combo: {}", e))?;

                Ok("ComboCancelled".to_string())
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
                    .map_err(|e| format!("Failed to insert agent: {}", e))?;

                Ok(format!("AgentCreated:{}", agent_id))
            }

            Operation::UpdateAgentConfig { agent_id, config } => {
                let mut agent = self.state.agents.get(&agent_id)
                    .await
                    .map_err(|e| format!("Failed to read agent: {}", e))?
                    .ok_or_else(|| format!("Agent {} not found", agent_id))?;

                if agent.owner != caller {
                    return Err("Not authorized: not the agent owner".to_string());
                }

                agent.config = config;
                self.state.agents.insert(&agent_id, agent)
                    .map_err(|e| format!("Failed to update agent: {}", e))?;

                Ok("AgentUpdated".to_string())
            }

            Operation::ToggleAgent { agent_id, active } => {
                let mut agent = self.state.agents.get(&agent_id)
                    .await
                    .map_err(|e| format!("Failed to read agent: {}", e))?
                    .ok_or_else(|| format!("Agent {} not found", agent_id))?;

                if agent.owner != caller {
                    return Err("Not authorized: not the agent owner".to_string());
                }

                agent.is_active = active;
                self.state.agents.insert(&agent_id, agent)
                    .map_err(|e| format!("Failed to update agent: {}", e))?;

                Ok("AgentToggled".to_string())
            }

            Operation::FollowAgent { agent_id, allocation } => {
                let mut agent = self.state.agents.get(&agent_id)
                    .await
                    .map_err(|e| format!("Failed to read agent: {}", e))?
                    .ok_or_else(|| format!("Agent {} not found", agent_id))?;

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
                    .map_err(|e| format!("Failed to insert follower: {}", e))?;

                agent.followers_count += 1;
                self.state.agents.insert(&agent_id, agent)
                    .map_err(|e| format!("Failed to update agent: {}", e))?;

                Ok("AgentFollowed".to_string())
            }

            Operation::UnfollowAgent { agent_id } => {
                let mut agent = self.state.agents.get(&agent_id)
                    .await
                    .map_err(|e| format!("Failed to read agent: {}", e))?
                    .ok_or_else(|| format!("Agent {} not found", agent_id))?;

                let key = (agent_id, caller);
                self.state.agent_followers.remove(&key)
                    .map_err(|e| format!("Failed to remove follower: {}", e))?;

                agent.followers_count = agent.followers_count.saturating_sub(1);
                self.state.agents.insert(&agent_id, agent)
                    .map_err(|e| format!("Failed to update agent: {}", e))?;

                Ok("AgentUnfollowed".to_string())
            }

            // === SOCIAL OPERATIONS ===
            Operation::PostComment { market_id, content } => {
                let feed_id = self.create_feed_item(caller, FeedItemType::Comment, Some(market_id), content, timestamp).await?;
                Ok(format!("CommentPosted:{}", feed_id))
            }

            Operation::FollowUser { user } => {
                let mut following = self.state.user_following.get(&caller)
                    .await
                    .map_err(|e| format!("Failed to get following: {}", e))?
                    .unwrap_or_default();

                if !following.contains(&user) {
                    following.push(user);
                    self.state.user_following.insert(&caller, following)
                        .map_err(|e| format!("Failed to update following: {}", e))?;

                    let mut followers = self.state.user_followers.get(&user)
                        .await
                        .map_err(|e| format!("Failed to get followers: {}", e))?
                        .unwrap_or_default();
                    followers.push(caller);
                    self.state.user_followers.insert(&user, followers)
                        .map_err(|e| format!("Failed to update followers: {}", e))?;
                }

                Ok("UserFollowed".to_string())
            }

            Operation::UnfollowUser { user } => {
                let mut following = self.state.user_following.get(&caller)
                    .await
                    .map_err(|e| format!("Failed to get following: {}", e))?
                    .unwrap_or_default();

                following.retain(|u| u != &user);
                self.state.user_following.insert(&caller, following)
                    .map_err(|e| format!("Failed to update following: {}", e))?;

                let mut followers = self.state.user_followers.get(&user)
                    .await
                    .map_err(|e| format!("Failed to get followers: {}", e))?
                    .unwrap_or_default();
                followers.retain(|u| u != &caller);
                self.state.user_followers.insert(&user, followers)
                    .map_err(|e| format!("Failed to update followers: {}", e))?;

                Ok("UserUnfollowed".to_string())
            }

            Operation::LikeFeedItem { item_id } => {
                let mut item = self.state.feed_items.get(&item_id)
                    .await
                    .map_err(|e| format!("Failed to get feed item: {}", e))?
                    .ok_or_else(|| format!("Feed item {} not found", item_id))?;

                let mut likes = self.state.item_likes.get(&item_id)
                    .await
                    .map_err(|e| format!("Failed to get likes: {}", e))?
                    .unwrap_or_default();

                if !likes.contains(&caller) {
                    likes.push(caller);
                    item.likes_count += 1;

                    self.state.item_likes.insert(&item_id, likes)
                        .map_err(|e| format!("Failed to update likes: {}", e))?;
                    self.state.feed_items.insert(&item_id, item)
                        .map_err(|e| format!("Failed to update item: {}", e))?;
                }

                Ok("ItemLiked".to_string())
            }
        }
    }

    async fn update_position(
        &mut self,
        owner: AccountOwner,
        market_id: u64,
        is_yes: bool,
        shares: Amount,
        is_buy: bool,
    ) -> Result<(), String> {
        let position_key = (owner, market_id);
        let mut position = self.state.positions.get(&position_key)
            .await
            .map_err(|e| format!("Failed to get position: {}", e))?
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
            .map_err(|e| format!("Failed to update position: {}", e))?;

        Ok(())
    }

    async fn create_feed_item(
        &mut self,
        author: AccountOwner,
        item_type: FeedItemType,
        market_id: Option<u64>,
        content: String,
        timestamp: linera_sdk::linera_base_types::Timestamp,
    ) -> Result<u64, String> {
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
            .map_err(|e| format!("Failed to insert feed item: {}", e))?;

        Ok(feed_id)
    }

    async fn update_combos_for_market(&mut self, market_id: u64, outcome: bool) -> Result<(), String> {
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
                        .map_err(|e| format!("Failed to update combo: {}", e))?;
                }
            }
        }

        Ok(())
    }
}
