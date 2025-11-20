// Copyright (c) Chronos Markets
// ABI of the Chronos Markets Prediction Market Application

use async_graphql::{Request, Response};
use linera_sdk::linera_base_types::{Amount, AccountOwner, Timestamp, ContractAbi, ServiceAbi};
use serde::{Deserialize, Serialize};

pub struct MarketAbi;

impl ContractAbi for MarketAbi {
    type Operation = Operation;
    type Response = OperationResponse;
}

impl ServiceAbi for MarketAbi {
    type Query = Request;
    type QueryResponse = Response;
}

/// Operations that can be performed on the market
#[derive(Debug, Deserialize, Serialize)]
pub enum Operation {
    CreateMarket {
        question: String,
        categories: Vec<String>,
        end_time: Timestamp,
        initial_liquidity: Amount,
    },
    BuyShares {
        market_id: u64,
        is_yes: bool,
        shares: Amount,
        max_cost: Amount,
    },
    ResolveMarket {
        market_id: u64,
        outcome: bool,
    },
    ClaimWinnings {
        market_id: u64,
    },
}

/// Response from operations
#[derive(Debug, Deserialize, Serialize)]
pub enum OperationResponse {
    MarketCreated(u64),
    SharesPurchased { cost: Amount },
    MarketResolved,
    WinningsClaimed(Amount),
}
