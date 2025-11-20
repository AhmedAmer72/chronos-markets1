// Copyright (c) Chronos Markets
// Prediction Market Contract

#![cfg_attr(target_arch = "wasm32", no_main)]

pub mod state;

use chronos_market::{MarketAbi, Operation, OperationResponse};
use linera_sdk::{
    linera_base_types::{Amount, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};

use self::state::MarketState;

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
        self.state.total_volume.set(Amount::ZERO);
    }

    async fn execute_operation(&mut self, operation: Self::Operation) -> Self::Response {
        let timestamp = self.runtime.system_time();
        let caller = self.runtime
            .authenticated_signer()
            .expect("Operation must be authenticated");

        match operation {
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
                    question,
                    categories,
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

                let k_value = u128::from(pool_in) * u128::from(pool_out);
                let new_pool_out = pool_out.saturating_sub(shares);
                assert!(new_pool_out > Amount::ZERO, "Not enough liquidity");

                let new_pool_in = Amount::from_attos(k_value / u128::from(new_pool_out));
                let cost = new_pool_in.saturating_sub(pool_in);

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
                self.state.markets.insert(&market_id, market).expect("Failed to update market");

                let total = *self.state.total_volume.get();
                self.state.total_volume.set(total.saturating_add(cost));

                let position_key = (caller, market_id);
                let mut position = self.state.positions.get(&position_key)
                    .await
                    .expect("Failed to get position")
                    .unwrap_or(state::Position {
                        market_id,
                        owner: caller,
                        yes_shares: Amount::ZERO,
                        no_shares: Amount::ZERO,
                        claimed: false,
                    });

                if is_yes {
                    position.yes_shares = position.yes_shares.saturating_add(shares);
                } else {
                    position.no_shares = position.no_shares.saturating_add(shares);
                }

                self.state.positions.insert(&position_key, position)
                    .expect("Failed to update position");

                OperationResponse::SharesPurchased { cost }
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
                let payout_value = u128::from(winning_shares) * u128::from(total_pool) / u128::from(total_winning_shares);
                let payout = Amount::from_attos(payout_value);

                position.claimed = true;
                self.state.positions.insert(&position_key, position)
                    .expect("Failed to update position");

                OperationResponse::WinningsClaimed(payout)
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
