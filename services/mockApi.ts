
import { Market, Order, Trade, Position, ResolvedMarket, ShareType, OrderType } from '../types';

const generatePriceHistory = (startPrice: number, days: number) => {
    const history = [];
    let price = startPrice;
    const now = Date.now();
    for (let i = days * 24; i > 0; i--) {
        price += (Math.random() - 0.5) * 0.02;
        price = Math.max(0.01, Math.min(0.99, price));
        history.push({ time: now - i * 60 * 60 * 1000, value: parseFloat(price.toFixed(2)) });
    }
    return history;
};

const mockMarkets: Market[] = [
    {
        id: '1',
        question: 'Will an Ethereum spot ETF be approved by July 26, 2024?',
        categories: ['Crypto', 'Finance'],
        currentPrice: 0.62,
        volume: 1250345,
        liquidity: 850234,
        traders: 2345,
        ends: Date.now() + 10 * 24 * 60 * 60 * 1000,
        oracleSource: 'Chainlink',
        resolutionDetails: 'The resolution will be based on the official announcement from the U.S. Securities and Exchange Commission (SEC). Approval is defined as the SEC issuing an order granting accelerated approval.',
        priceHistory: generatePriceHistory(0.55, 7),
    },
    {
        id: '2',
        question: 'Will the next Fed rate decision be a hike?',
        categories: ['Politics', 'Finance'],
        currentPrice: 0.21,
        volume: 890123,
        liquidity: 650000,
        traders: 1890,
        ends: Date.now() + 30 * 24 * 60 * 60 * 1000,
        oracleSource: 'UMA',
        resolutionDetails: 'Resolution will be based on the Federal Open Market Committee (FOMC) statement following their next scheduled meeting. A "hike" is any increase to the target range for the federal funds rate.',
        priceHistory: generatePriceHistory(0.25, 7),
    },
    {
        id: '3',
        question: 'Will self-driving cars be commercially available in 5 major US cities by 2026?',
        categories: ['Science & Tech'],
        currentPrice: 0.45,
        volume: 540321,
        liquidity: 320123,
        traders: 987,
        ends: Date.now() + 15 * 24 * 60 * 60 * 1000,
        oracleSource: 'Project-Specific Oracle',
        resolutionDetails: 'Commercially available is defined as a service where any member of the public can hail a fully autonomous ride without a safety driver. The 5 cities must be within the top 20 most populous US cities.',
        priceHistory: generatePriceHistory(0.40, 7),
    },
    {
        id: '4',
        question: 'Will Taylor Swift announce a new album before the end of 2024?',
        categories: ['Culture'],
        currentPrice: 0.78,
        volume: 2345678,
        liquidity: 1500000,
        traders: 5678,
        ends: Date.now() + 50 * 24 * 60 * 60 * 1000,
        oracleSource: 'Official Artist Announcements',
        resolutionDetails: 'Resolution is based on an official announcement from Taylor Swift or her official representatives on social media or through a press release.',
        priceHistory: generatePriceHistory(0.70, 7),
    },
    {
        id: '5',
        question: 'Will Bitcoin reach $100,000 by end of 2024?',
        categories: ['Crypto'],
        currentPrice: 0.34,
        volume: 3456789,
        liquidity: 2100000,
        traders: 8901,
        ends: Date.now() + 60 * 24 * 60 * 60 * 1000,
        oracleSource: 'CoinGecko',
        resolutionDetails: 'Resolution based on Bitcoin price reaching $100,000 USD on CoinGecko.',
        priceHistory: generatePriceHistory(0.30, 7),
    },
    {
        id: '6',
        question: 'Will Trump win the 2024 US Presidential Election?',
        categories: ['Politics'],
        currentPrice: 0.52,
        volume: 5678901,
        liquidity: 3200000,
        traders: 12345,
        ends: Date.now() + 120 * 24 * 60 * 60 * 1000,
        oracleSource: 'Associated Press',
        resolutionDetails: 'Resolution based on Associated Press election call.',
        priceHistory: generatePriceHistory(0.48, 7),
    },
    {
        id: '7',
        question: 'Will the Lakers make the NBA playoffs this season?',
        categories: ['Sports'],
        currentPrice: 0.67,
        volume: 987654,
        liquidity: 567890,
        traders: 3456,
        ends: Date.now() + 90 * 24 * 60 * 60 * 1000,
        oracleSource: 'NBA Official',
        resolutionDetails: 'Resolution based on official NBA playoff standings.',
        priceHistory: generatePriceHistory(0.65, 7),
    },
    {
        id: '8',
        question: 'Will OpenAI release GPT-5 in 2024?',
        categories: ['Science & Tech'],
        currentPrice: 0.29,
        volume: 1234567,
        liquidity: 890123,
        traders: 4567,
        ends: Date.now() + 45 * 24 * 60 * 60 * 1000,
        oracleSource: 'OpenAI Official',
        resolutionDetails: 'Resolution based on official OpenAI announcement.',
        priceHistory: generatePriceHistory(0.35, 7),
    },
    {
        id: '9',
        question: 'Will Netflix stock hit $500 this year?',
        categories: ['Finance'],
        currentPrice: 0.41,
        volume: 765432,
        liquidity: 456789,
        traders: 2345,
        ends: Date.now() + 75 * 24 * 60 * 60 * 1000,
        oracleSource: 'Yahoo Finance',
        resolutionDetails: 'Resolution based on Netflix closing price on Yahoo Finance.',
        priceHistory: generatePriceHistory(0.38, 7),
    },
    {
        id: '10',
        question: 'Will Elon Musk step down as CEO of Tesla in 2024?',
        categories: ['Culture', 'Finance'],
        currentPrice: 0.18,
        volume: 2109876,
        liquidity: 1345678,
        traders: 6789,
        ends: Date.now() + 100 * 24 * 60 * 60 * 1000,
        oracleSource: 'SEC Filings',
        resolutionDetails: 'Resolution based on official SEC filings or Tesla press releases.',
        priceHistory: generatePriceHistory(0.22, 7),
    },
];

export const getMarkets = async (): Promise<Market[]> => {
    return new Promise(resolve => setTimeout(() => resolve(mockMarkets), 500));
};

export const getMarketById = async (id: string): Promise<Market | undefined> => {
    return new Promise(resolve => setTimeout(() => resolve(mockMarkets.find(m => m.id === id)), 300));
};

export const getOrderBook = async (): Promise<{ bids: Order[]; asks: Order[] }> => {
    const generateOrders = (count: number, startPrice: number, step: number) => {
        const orders: Order[] = [];
        let price = startPrice;
        for (let i = 0; i < count; i++) {
            const size = Math.floor(Math.random() * 500) + 50;
            price += (Math.random() * step * (Math.random() > 0.5 ? 1 : -1));
            price = Math.max(0.01, Math.min(0.99, price));
            orders.push({ price: parseFloat(price.toFixed(2)), size, total: parseFloat((price * size).toFixed(2)) });
        }
        return orders;
    };
    const bids = generateOrders(20, 0.61, 0.01).sort((a, b) => b.price - a.price);
    const asks = generateOrders(20, 0.62, 0.01).sort((a, b) => a.price - b.price);
    return new Promise(resolve => setTimeout(() => resolve({ bids, asks }), 100));
};


export const getTradeHistory = async (): Promise<Trade[]> => {
    const trades: Trade[] = [];
    const now = Date.now();
    for (let i = 0; i < 50; i++) {
        trades.push({
            time: now - i * (Math.random() * 5000 + 1000),
            price: parseFloat((0.61 + (Math.random() - 0.5) * 0.05).toFixed(2)),
            amount: Math.floor(Math.random() * 200) + 10,
            type: Math.random() > 0.5 ? OrderType.BUY : OrderType.SELL,
        });
    }
    return new Promise(resolve => setTimeout(() => resolve(trades.sort((a, b) => b.time - a.time)), 150));
};

export const getPortfolio = async () => {
    const positions: Position[] = [
        { marketId: '1', marketQuestion: mockMarkets[0].question, shares: 150, shareType: ShareType.YES, avgCost: 0.58, currentValue: 93.00, unrealizedPL: 6.00 },
        { marketId: '2', marketQuestion: mockMarkets[1].question, shares: 500, shareType: ShareType.NO, avgCost: 0.75, currentValue: 395.00, unrealizedPL: 20.00 },
        { marketId: '4', marketQuestion: mockMarkets[3].question, shares: 200, shareType: ShareType.YES, avgCost: 0.72, currentValue: 156.00, unrealizedPL: 12.00 },
    ];

    const resolved: ResolvedMarket[] = [
        { marketId: 'x1', marketQuestion: 'Will Bitcoin price surpass $70,000 in Q1 2024?', shares: 100, shareType: ShareType.YES, avgCost: 0.40, currentValue: 100, unrealizedPL: 0, outcome: ShareType.YES, realizedPL: 60.00 },
    ];
    
    const summary = {
        totalValue: positions.reduce((acc, p) => acc + p.currentValue, 0),
        totalPL: positions.reduce((acc, p) => acc + p.unrealizedPL, 0) + resolved.reduce((acc, p) => acc + p.realizedPL, 0),
        availableFunds: 1234.56,
    };

    return new Promise(resolve => setTimeout(() => resolve({ summary, positions, resolved }), 600));
};
