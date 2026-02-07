import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getMarketById, getOrderBook, getTradeHistory, buyShares, sellShares, isApplicationConnected } from '../services/marketService';
import { Market, Order, Trade, OrderType, ShareType } from '../types';
import { useWallet } from '../contexts/WalletContext';
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

const SLIPPAGE_TOLERANCE = 0.10; // 10% slippage tolerance

/**
 * Calculate AMM cost for buying shares.
 * cost = poolIn * shares / (poolOut - shares)
 * For buying YES: poolIn = noPool, poolOut = yesPool
 * For buying NO:  poolIn = yesPool, poolOut = noPool
 */
function calcBuyCost(yesPool: number, noPool: number, shares: number, isYes: boolean): number | null {
    const poolIn = isYes ? noPool : yesPool;
    const poolOut = isYes ? yesPool : noPool;
    if (shares <= 0 || shares >= poolOut) return null; // invalid or exceeds liquidity
    return (poolIn * shares) / (poolOut - shares);
}

/**
 * Calculate AMM proceeds for selling shares.
 * proceeds = poolOut * shares / (poolIn + shares)
 * For selling YES: poolIn = yesPool, poolOut = noPool
 * For selling NO:  poolIn = noPool, poolOut = yesPool
 */
function calcSellProceeds(yesPool: number, noPool: number, shares: number, isYes: boolean): number | null {
    const poolIn = isYes ? yesPool : noPool;
    const poolOut = isYes ? noPool : yesPool;
    if (shares <= 0 || poolIn + shares <= 0) return null;
    return (poolOut * shares) / (poolIn + shares);
}

const TradeWidget: React.FC<{ marketId?: string; market?: Market | null }> = ({ marketId, market }) => {
    const { wallet } = useWallet();
    const [tradeMode, setTradeMode] = useState<'market' | 'limit'>('market');
    const [orderType, setOrderType] = useState<OrderType>(OrderType.BUY);
    const [shareType, setShareType] = useState<ShareType>(ShareType.YES);
    const [amount, setAmount] = useState('');
    const [price, setPrice] = useState('0.50');
    const [expiryType, setExpiryType] = useState<'gtc' | 'gtt' | 'ioc'>('gtc');
    const [expiryTime, setExpiryTime] = useState('');
    const [openOrders, setOpenOrders] = useState<{ id: number; type: 'buy' | 'sell'; share: 'yes' | 'no'; price: string; amount: string; filled: string; expiry: string }[]>([]);
    const [showOrders, setShowOrders] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const isYes = shareType === ShareType.YES;
    const sharesNum = parseFloat(amount) || 0;
    const yesPool = market?.yesPool || 0;
    const noPool = market?.noPool || 0;

    // Compute real AMM cost/proceeds
    const ammCost = orderType === OrderType.BUY
        ? calcBuyCost(yesPool, noPool, sharesNum, isYes)
        : calcSellProceeds(yesPool, noPool, sharesNum, isYes);

    const estimatedCost = ammCost ?? 0;
    const avgPrice = sharesNum > 0 && ammCost != null ? ammCost / sharesNum : 0;
    const maxPool = isYes ? yesPool : noPool;
    const poolWarning = orderType === OrderType.BUY && sharesNum > 0 && sharesNum >= maxPool;
    const payout = sharesNum; // Shares pay 1:1 if market resolves in your favor

    // Update price display from market data
    useEffect(() => {
        if (market) {
            setPrice(isYes ? market.currentPrice.toFixed(4) : (1 - market.currentPrice).toFixed(4));
        }
    }, [market, isYes]);

    const handlePlaceOrder = async () => {
        if (!amount || sharesNum <= 0) return;
        if (!wallet.isConnected) {
            setError('Please connect your wallet first');
            return;
        }
        if (!isApplicationConnected()) {
            setError('Application not connected. Please reconnect your wallet.');
            return;
        }
        if (!marketId) {
            setError('Market ID not found');
            return;
        }
        if (orderType === OrderType.BUY && poolWarning) {
            setError(`Cannot buy ${sharesNum} shares — exceeds pool liquidity (${maxPool.toFixed(2)} available)`);
            return;
        }
        if (ammCost == null || ammCost <= 0) {
            setError('Unable to calculate trade cost. Check your amount.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            if (orderType === OrderType.BUY) {
                // Use AMM-calculated cost + slippage tolerance as maxCost
                const maxCost = estimatedCost * (1 + SLIPPAGE_TOLERANCE);
                console.log('💰 Buying shares:', { marketId, isYes, shares: amount, estimatedCost: estimatedCost.toFixed(6), maxCost: maxCost.toFixed(6) });
                const result = await buyShares({
                    marketId,
                    isYes,
                    shares: amount,
                    maxCost: maxCost.toFixed(6),
                });
                
                if (result.success) {
                    setSuccess(`✅ Bought ${result.shares || amount} ${isYes ? 'YES' : 'NO'} shares for ~${estimatedCost.toFixed(4)}!`);
                    setAmount('');
                } else {
                    throw new Error(result.error || 'Failed to buy shares');
                }
            } else {
                // For sell, use AMM-calculated proceeds with slippage as minReturn
                const minReturn = estimatedCost * (1 - SLIPPAGE_TOLERANCE);
                console.log('💸 Selling shares:', { marketId, isYes, shares: amount, estimatedProceeds: estimatedCost.toFixed(6), minReturn: minReturn.toFixed(6) });
                const result = await sellShares({
                    marketId,
                    isYes,
                    shares: amount,
                    minReturn: minReturn.toFixed(6),
                });
                
                if (result.success) {
                    setSuccess(`✅ Sold ${amount} ${isYes ? 'YES' : 'NO'} shares for ~${estimatedCost.toFixed(4)}!`);
                    setAmount('');
                } else {
                    throw new Error(result.error || 'Failed to sell shares');
                }
            }
        } catch (err) {
            console.error('❌ Trade failed:', err);
            setError(err instanceof Error ? err.message : 'Trade failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const cancelOrder = (id: number) => {
        setOpenOrders(openOrders.filter(o => o.id !== id));
    };

    return (
        <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
                <button 
                    onClick={() => setTradeMode('market')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${tradeMode === 'market' ? 'bg-brand-primary text-white' : 'bg-brand-surface-2 text-brand-secondary hover:text-brand-text'}`}
                >
                    Market
                </button>
                <button 
                    onClick={() => setTradeMode('limit')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${tradeMode === 'limit' ? 'bg-brand-primary text-white' : 'bg-brand-surface-2 text-brand-secondary hover:text-brand-text'}`}
                >
                    Limit
                </button>
            </div>

            {/* Buy/Sell Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4 bg-brand-surface-2 p-1 rounded-lg">
                <button onClick={() => setOrderType(OrderType.BUY)} className={`py-2 rounded-md font-semibold transition-colors ${orderType === OrderType.BUY ? 'bg-brand-success text-white' : 'text-brand-secondary hover:text-brand-text'}`}>Buy</button>
                <button onClick={() => setOrderType(OrderType.SELL)} className={`py-2 rounded-md font-semibold transition-colors ${orderType === OrderType.SELL ? 'bg-brand-danger text-white' : 'text-brand-secondary hover:text-brand-text'}`}>Sell</button>
            </div>

            {/* Yes/No Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <button onClick={() => setShareType(ShareType.YES)} className={`py-2 rounded-md font-semibold border-2 transition-all ${isYes ? 'border-brand-yes text-brand-yes bg-brand-yes-bg' : 'border-transparent text-brand-secondary bg-brand-surface-2 hover:bg-brand-border'}`}>YES</button>
                <button onClick={() => setShareType(ShareType.NO)} className={`py-2 rounded-md font-semibold border-2 transition-all ${!isYes ? 'border-brand-no text-brand-no bg-brand-no-bg' : 'border-transparent text-brand-secondary bg-brand-surface-2 hover:bg-brand-border'}`}>NO</button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-xs text-brand-secondary block mb-1">Amount (Shares)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-brand-surface-2 p-2 rounded-md border border-brand-border focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary" placeholder="0" />
                </div>
                
                {tradeMode === 'limit' && (
                    <>
                        <div>
                            <label className="text-xs text-brand-secondary block mb-1">Limit Price (per share)</label>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-brand-surface-2 p-2 rounded-md border border-brand-border focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary" placeholder="0.00" step="0.01" />
                        </div>
                        
                        <div>
                            <label className="text-xs text-brand-secondary block mb-1">Order Duration</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => setExpiryType('gtc')} className={`py-1.5 text-xs rounded-md transition-colors ${expiryType === 'gtc' ? 'bg-brand-primary text-white' : 'bg-brand-surface-2 text-brand-secondary'}`}>
                                    GTC
                                </button>
                                <button onClick={() => setExpiryType('gtt')} className={`py-1.5 text-xs rounded-md transition-colors ${expiryType === 'gtt' ? 'bg-brand-primary text-white' : 'bg-brand-surface-2 text-brand-secondary'}`}>
                                    GTT
                                </button>
                                <button onClick={() => setExpiryType('ioc')} className={`py-1.5 text-xs rounded-md transition-colors ${expiryType === 'ioc' ? 'bg-brand-primary text-white' : 'bg-brand-surface-2 text-brand-secondary'}`}>
                                    IOC
                                </button>
                            </div>
                            <p className="text-[10px] text-brand-secondary mt-1">
                                {expiryType === 'gtc' && 'Good Till Cancelled - Order stays open until filled or cancelled'}
                                {expiryType === 'gtt' && 'Good Till Time - Order expires at specified time'}
                                {expiryType === 'ioc' && 'Immediate Or Cancel - Fill immediately or cancel'}
                            </p>
                        </div>
                        
                        {expiryType === 'gtt' && (
                            <div>
                                <label className="text-xs text-brand-secondary block mb-1">Expires In</label>
                                <select value={expiryTime} onChange={e => setExpiryTime(e.target.value)} className="w-full bg-brand-surface-2 p-2 rounded-md border border-brand-border text-brand-text">
                                    <option value="1h">1 Hour</option>
                                    <option value="4h">4 Hours</option>
                                    <option value="24h">24 Hours</option>
                                    <option value="7d">7 Days</option>
                                    <option value="30d">30 Days</option>
                                </select>
                            </div>
                        )}
                    </>
                )}
                
                {tradeMode === 'market' && (
                    <div>
                        <label className="text-xs text-brand-secondary block mb-1">Est. Price (per share)</label>
                        <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-brand-surface-2 p-2 rounded-md border border-brand-border focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary" placeholder="0.00" step="0.01" disabled />
                        <p className="text-[10px] text-brand-secondary mt-1">Price determined by order book</p>
                    </div>
                )}
            </div>

            <div className="mt-4 text-xs space-y-2 text-brand-secondary">
                <div className="flex justify-between"><span>Avg Price:</span> <span className="font-mono text-brand-text">{avgPrice > 0 ? avgPrice.toFixed(4) : '—'}</span></div>
                <div className="flex justify-between">
                    <span>{orderType === OrderType.BUY ? 'Est. Cost:' : 'Est. Proceeds:'}</span>
                    <span className="font-mono text-brand-text">{estimatedCost > 0 ? estimatedCost.toFixed(4) : '—'}</span>
                </div>
                {orderType === OrderType.BUY && (
                    <div className="flex justify-between"><span>Max Cost (incl. {SLIPPAGE_TOLERANCE * 100}% slippage):</span> <span className="font-mono text-brand-text">{estimatedCost > 0 ? (estimatedCost * (1 + SLIPPAGE_TOLERANCE)).toFixed(4) : '—'}</span></div>
                )}
                <div className="flex justify-between"><span>Potential Payout (if correct):</span> <span className="font-mono text-brand-text">{payout > 0 ? payout.toFixed(4) : '—'}</span></div>
                {avgPrice > 0 && sharesNum > 0 && parseFloat(price) > 0 && Math.abs(avgPrice - parseFloat(price)) / parseFloat(price) > 0.05 && (
                    <div className="text-yellow-400 text-[10px] mt-1">⚠️ Price impact: {((avgPrice / parseFloat(price) - 1) * 100).toFixed(1)}% above spot price due to trade size</div>
                )}
                {poolWarning && (
                    <div className="text-red-400 text-[10px] mt-1">🚫 Shares exceed available pool ({maxPool.toFixed(2)} max)</div>
                )}
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="mt-3 p-2 bg-red-900/20 border border-red-700 rounded text-red-400 text-xs">
                    ⚠️ {error}
                </div>
            )}
            {success && (
                <div className="mt-3 p-2 bg-green-900/20 border border-green-700 rounded text-green-400 text-xs">
                    {success}
                </div>
            )}

            {/* Wallet Warning */}
            {!wallet.isConnected && (
                <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-700 rounded text-yellow-400 text-xs">
                    ⚠️ Connect wallet to trade
                </div>
            )}

            <button 
                onClick={handlePlaceOrder}
                disabled={isSubmitting || !wallet.isConnected || !amount}
                className={`w-full mt-4 py-3 rounded-md font-bold text-white transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed ${orderType === OrderType.BUY ? 'bg-brand-success hover:bg-green-700' : 'bg-brand-danger hover:bg-red-700'}`}
            >
                {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                    </span>
                ) : (
                    orderType === OrderType.BUY ? 'Buy Shares' : 'Sell Shares'
                )}
            </button>

            {/* Open Orders Section */}
            <div className="mt-4 pt-4 border-t border-brand-border">
                <button 
                    onClick={() => setShowOrders(!showOrders)}
                    className="flex items-center justify-between w-full text-sm text-brand-secondary hover:text-brand-text"
                >
                    <span>Open Orders ({openOrders.length})</span>
                    <span>{showOrders ? '▲' : '▼'}</span>
                </button>
                
                {showOrders && (
                    <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                        {openOrders.length === 0 ? (
                            <p className="text-xs text-brand-secondary text-center py-2">No open orders</p>
                        ) : (
                            openOrders.map(order => (
                                <div key={order.id} className="bg-brand-surface-2 rounded-lg p-2 text-xs">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className={order.type === 'buy' ? 'text-brand-yes' : 'text-brand-no'}>
                                                {order.type.toUpperCase()}
                                            </span>
                                            <span className={order.share === 'yes' ? 'text-brand-yes' : 'text-brand-no'}>
                                                {order.share.toUpperCase()}
                                            </span>
                                        </div>
                                        <button onClick={() => cancelOrder(order.id)} className="text-brand-no hover:underline">
                                            Cancel
                                        </button>
                                    </div>
                                    <div className="flex justify-between mt-1 text-brand-secondary">
                                        <span>{order.filled}/{order.amount} @ ${order.price}</span>
                                        <span>{order.expiry}</span>
                                    </div>
                                    <div className="mt-1 h-1 bg-brand-border rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-brand-primary"
                                            style={{ width: `${(parseFloat(order.filled) / parseFloat(order.amount)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
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
    const intervalRef = useRef<number | undefined>(undefined);

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
                    <TradeWidget marketId={id} market={market} />
                     <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
                        <h3 className="font-semibold text-brand-text mb-2">Your Positions</h3>
                        <p className="text-sm text-brand-secondary">Connect wallet to view your positions in this market.</p>
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