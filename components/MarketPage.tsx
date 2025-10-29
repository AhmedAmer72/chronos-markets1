import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getMarketById, getOrderBook, getTradeHistory } from '../services/mockApi';
import { Market, Order, Trade, OrderType, ShareType } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { InfoIcon, ClockIcon } from './icons';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-brand-surface-2 p-3 border border-brand-border rounded-lg shadow-lg text-sm">
        <p className="label text-brand-secondary">{`${new Date(label).toLocaleString()}`}</p>
        <p className="intro text-brand-text font-bold text-base">{`Price: ${(payload[0].value * 100).toFixed(0)}¢`}</p>
      </div>
    );
  }
  return null;
};

const MarketChart: React.FC<{ data: { time: number, value: number }[] }> = ({ data }) => {
    const [timeframe, setTimeframe] = useState('7D');
    
    const filteredData = data.filter(d => {
        const now = Date.now();
        if (timeframe === '1H') return d.time > now - 60 * 60 * 1000;
        if (timeframe === '24H') return d.time > now - 24 * 60 * 60 * 1000;
        if (timeframe === '7D') return d.time > now - 7 * 24 * 60 * 60 * 1000;
        return true;
    });

    const chartColor = filteredData.length > 1 && filteredData[filteredData.length - 1].value >= filteredData[0].value ? '#238636' : '#DA3633';
    
    return (
        <div className="bg-brand-surface border border-brand-border rounded-lg p-4 h-[400px] flex flex-col">
            <div className="flex justify-end space-x-1 mb-4 bg-brand-surface-2 p-1 rounded-lg">
                {['1H', '24H', '7D', 'All'].map(tf => (
                    <button key={tf} onClick={() => setTimeframe(tf)} className={`px-3 py-1 text-xs rounded-md font-medium ${timeframe === tf ? 'bg-brand-primary text-white' : 'text-brand-secondary hover:text-brand-text'}`}>
                        {tf}
                    </button>
                ))}
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.6}/>
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                    <XAxis dataKey="time" tickFormatter={(time) => new Date(time).toLocaleTimeString()} stroke="#8B949E" fontSize={12} />
                    <YAxis dataKey="value" orientation="right" domain={[0, 1]} tickFormatter={(val) => `${(val * 100).toFixed(0)}¢`} stroke="#8B949E" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

const TradeWidget: React.FC = () => {
    const [orderType, setOrderType] = useState<OrderType>(OrderType.BUY);
    const [shareType, setShareType] = useState<ShareType>(ShareType.YES);
    const [amount, setAmount] = useState('');
    const [price, setPrice] = useState('0.62');

    const cost = (parseFloat(amount) || 0) * (parseFloat(price) || 0);
    const payout = (parseFloat(amount) || 0) * 1;
    const isYes = shareType === ShareType.YES;

    return (
        <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2 mb-4 bg-brand-surface-2 p-1 rounded-lg">
                <button onClick={() => setOrderType(OrderType.BUY)} className={`py-2 rounded-md font-semibold transition-colors ${orderType === OrderType.BUY ? 'bg-brand-success text-white' : 'text-brand-secondary hover:text-brand-text'}`}>Buy</button>
                <button onClick={() => setOrderType(OrderType.SELL)} className={`py-2 rounded-md font-semibold transition-colors ${orderType === OrderType.SELL ? 'bg-brand-danger text-white' : 'text-brand-secondary hover:text-brand-text'}`}>Sell</button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
                <button onClick={() => setShareType(ShareType.YES)} className={`py-2 rounded-md font-semibold border-2 transition-all ${isYes ? 'border-brand-yes text-brand-yes bg-brand-yes-bg' : 'border-transparent text-brand-secondary bg-brand-surface-2 hover:bg-brand-border'}`}>YES</button>
                <button onClick={() => setShareType(ShareType.NO)} className={`py-2 rounded-md font-semibold border-2 transition-all ${!isYes ? 'border-brand-no text-brand-no bg-brand-no-bg' : 'border-transparent text-brand-secondary bg-brand-surface-2 hover:bg-brand-border'}`}>NO</button>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="text-xs text-brand-secondary block mb-1">Amount (Shares)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-brand-surface-2 p-2 rounded-md border border-brand-border focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary" placeholder="0" />
                </div>
                <div>
                    <label className="text-xs text-brand-secondary block mb-1">Price (Cents per share)</label>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-brand-surface-2 p-2 rounded-md border border-brand-border focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary" placeholder="0.00" step="0.01" />
                </div>
            </div>
            <div className="mt-4 text-xs space-y-2 text-brand-secondary">
                <div className="flex justify-between"><span>Cost:</span> <span className="font-mono text-brand-text">${cost.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Potential Payout:</span> <span className="font-mono text-brand-text">${payout.toFixed(2)}</span></div>
            </div>
            <button className={`w-full mt-4 py-3 rounded-md font-bold text-white transition-colors text-lg ${orderType === OrderType.BUY ? 'bg-brand-success hover:bg-green-700' : 'bg-brand-danger hover:bg-red-700'}`}>
                Place Order
            </button>
        </div>
    );
};

const OrderBook: React.FC<{ bids: Order[], asks: Order[] }> = ({ bids, asks }) => {
    return (
        <div className="bg-brand-surface border border-brand-border rounded-lg text-xs h-[300px] flex flex-col">
            <div className="p-2 border-b border-brand-border text-center font-semibold text-brand-text">Order Book</div>
            <div className="grid grid-cols-2 flex-grow overflow-hidden">
                <div className="overflow-y-auto">
                    <div className="grid grid-cols-3 text-center p-1 text-brand-secondary sticky top-0 bg-brand-surface font-semibold">
                        <div>Price</div><div>Size</div><div>Total</div>
                    </div>
                    {bids.map((order, i) => (
                        <div key={i} className="grid grid-cols-3 text-center p-1 font-mono hover:bg-brand-yes-bg relative">
                             <div className="absolute left-0 top-0 bottom-0 bg-brand-yes/10" style={{width: `${Math.random()*40+5}%`}}></div>
                            <span className="text-brand-yes relative font-semibold">{order.price.toFixed(2)}</span>
                            <span className="text-brand-text relative">{order.size}</span>
                            <span className="text-brand-secondary relative">${order.total.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                <div className="border-l border-brand-border overflow-y-auto">
                    <div className="grid grid-cols-3 text-center p-1 text-brand-secondary sticky top-0 bg-brand-surface font-semibold">
                        <div>Price</div><div>Size</div><div>Total</div>
                    </div>
                    {asks.map((order, i) => (
                        <div key={i} className="grid grid-cols-3 text-center p-1 font-mono hover:bg-brand-no-bg relative">
                             <div className="absolute right-0 top-0 bottom-0 bg-brand-no/10" style={{width: `${Math.random()*40+5}%`}}></div>
                            <span className="text-brand-no relative font-semibold">{order.price.toFixed(2)}</span>
                            <span className="text-brand-text relative">{order.size}</span>
                            <span className="text-brand-secondary relative">${order.total.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const TradeHistory: React.FC<{ trades: Trade[] }> = ({ trades }) => {
    const [latestTrade, setLatestTrade] = useState<Trade | null>(null);

    useEffect(() => {
        if (trades.length > 0) {
            setLatestTrade(trades[0]);
            const timer = setTimeout(() => setLatestTrade(null), 1000);
            return () => clearTimeout(timer);
        }
    }, [trades]);

    return (
        <div className="bg-brand-surface border border-brand-border rounded-lg text-xs h-[300px] flex flex-col">
            <div className="p-2 border-b border-brand-border text-center font-semibold text-brand-text">Trade History</div>
            <div className="flex-grow overflow-y-auto">
                <div className="grid grid-cols-3 text-center p-1 text-brand-secondary sticky top-0 bg-brand-surface font-semibold">
                    <div>Time</div><div>Price</div><div>Amount</div>
                </div>
                {trades.map((trade, i) => (
                    <div key={i} className={`grid grid-cols-3 text-center p-1 font-mono transition-colors duration-500 ${trade === latestTrade ? (trade.type === OrderType.BUY ? 'bg-brand-yes-bg' : 'bg-brand-no-bg') : ''}`}>
                        <span className="text-brand-secondary">{new Date(trade.time).toLocaleTimeString()}</span>
                        <span className={`font-semibold ${trade.type === OrderType.BUY ? 'text-brand-yes' : 'text-brand-no'}`}>{trade.price.toFixed(2)}</span>
                        <span className="text-brand-text">{trade.amount}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


const MarketPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [market, setMarket] = useState<Market | null>(null);
    const [orderBook, setOrderBook] = useState<{ bids: Order[]; asks: Order[] }>({ bids: [], asks: [] });
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const intervalRef = useRef<number>();

    const fetchData = useCallback(async () => {
        if (!id) return;
        const [marketData, orderBookData, tradeHistoryData] = await Promise.all([
            !market ? getMarketById(id) : Promise.resolve(market),
            getOrderBook(),
            getTradeHistory()
        ]);
        if (marketData) setMarket(marketData);
        setOrderBook(orderBookData);
        setTrades(tradeHistoryData);
        setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        fetchData();
        intervalRef.current = window.setInterval(fetchData, 2000);
        return () => clearInterval(intervalRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (loading || !market) {
        return <div className="text-center p-10">Loading market details...</div>;
    }

    return (
        <div className="space-y-6">
            <section className="animate-fadeIn">
                <h1 className="text-3xl font-bold text-brand-text mb-2">{market.question}</h1>
                <div className="flex items-center space-x-4 text-sm text-brand-secondary">
                    <div className="flex items-center space-x-2 group relative">
                        <InfoIcon className="w-4 h-4" />
                        <span>Oracle: {market.oracleSource}</span>
                        <div className="absolute bottom-full mb-2 w-72 p-3 bg-brand-surface-2 border border-brand-border rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {market.resolutionDetails}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                         <ClockIcon className="w-4 h-4" />
                        <span>Ends: {new Date(market.ends).toLocaleString()}</span>
                    </div>
                </div>
            </section>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 animate-fadeIn" style={{ animationDelay: '200ms' }}>
                    <MarketChart data={market.priceHistory} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
                            <div className="text-xs text-brand-secondary">24h Volume</div>
                            <div className="text-xl font-bold text-brand-text mt-1">${market.volume.toLocaleString()}</div>
                        </div>
                        <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
                            <div className="text-xs text-brand-secondary">Total Liquidity</div>
                            <div className="text-xl font-bold text-brand-text mt-1">${market.liquidity.toLocaleString()}</div>
                        </div>
                         <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
                            <div className="text-xs text-brand-secondary">Number of Traders</div>
                            <div className="text-xl font-bold text-brand-text mt-1">{market.traders.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
                <div className="space-y-4 animate-fadeIn" style={{ animationDelay: '300ms' }}>
                    <TradeWidget />
                     <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
                        <h3 className="font-semibold text-brand-text mb-2">Your Positions</h3>
                        <p className="text-sm text-brand-secondary">You have 150 YES shares. Current Value: <span className="font-mono text-brand-text">$93.00</span></p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn" style={{ animationDelay: '400ms' }}>
                <OrderBook bids={orderBook.bids} asks={orderBook.asks} />
                <TradeHistory trades={trades} />
            </div>
        </div>
    );
};

export default MarketPage;