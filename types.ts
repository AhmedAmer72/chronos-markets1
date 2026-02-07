
export interface Market {
    id: string;
    question: string;
    categories: string[];
    currentPrice: number;
    volume: number;
    liquidity: number;
    traders: number;
    ends: number; // timestamp
    oracleSource: string;
    resolutionDetails: string;
    priceHistory: { time: number; value: number }[];
    /** AMM pool values (token units) for client-side cost calculations */
    yesPool: number;
    noPool: number;
}

export enum OrderType {
    BUY = 'BUY',
    SELL = 'SELL',
}

export enum ShareType {
    YES = 'YES',
    NO = 'NO',
}

export interface Order {
    price: number;
    size: number;
    total: number;
}

export interface Trade {
    time: number;
    price: number;
    amount: number;
    type: OrderType;
}

export interface Position {
    marketId: string;
    marketQuestion: string;
    shares: number;
    shareType: ShareType;
    avgCost: number;
    currentValue: number;
    unrealizedPL: number;
}

export interface ResolvedMarket extends Position {
    outcome: ShareType;
    realizedPL: number;
}
