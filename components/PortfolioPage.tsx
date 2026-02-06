import React, { useState, useEffect, useMemo } from 'react';
import { getPortfolio, isConnected } from '../services/marketService';
import { Position, ResolvedMarket, ShareType } from '../types';
import { useWallet } from '../contexts/WalletContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface PortfolioData {
    summary: {
        totalValue: number;
        totalPL: number;
        availableFunds: number;
    };
    positions: Position[];
    resolved: ResolvedMarket[];
}

// Generate mock historical data for charts
const generateHistoricalData = () => {
    const data = [];
    let value = 5000;
    for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        value += (Math.random() - 0.4) * 200;
        data.push({
            date: date.toISOString(),
            value: Math.max(1000, value),
            pnl: value - 5000
        });
    }
    return data;
};

const generateCategoryData = () => [
    { name: 'Crypto', value: 35, color: '#F7931A' },
    { name: 'Politics', value: 25, color: '#6366F1' },
    { name: 'Sports', value: 20, color: '#22C55E' },
    { name: 'Tech', value: 15, color: '#3B82F6' },
    { name: 'Other', value: 5, color: '#8B949E' },
];

const generateMonthlyPnL = () => [
    { month: 'Aug', pnl: 234 },
    { month: 'Sep', pnl: -156 },
    { month: 'Oct', pnl: 478 },
    { month: 'Nov', pnl: 312 },
    { month: 'Dec', pnl: -89 },
    { month: 'Jan', pnl: 567 },
];

// Custom Chart Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-brand-surface-2 p-3 border border-brand-border rounded-lg shadow-lg text-sm">
                <p className="text-brand-secondary">{new Date(label).toLocaleDateString()}</p>
                <p className="text-brand-text font-bold">${payload[0].value.toLocaleString()}</p>
            </div>
        );
    }
    return null;
};

const PortfolioPage: React.FC = () => {
    const [data, setData] = useState<PortfolioData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'history' | 'analytics'>('overview');
    const [timeframe, setTimeframe] = useState<'7D' | '30D' | '90D' | 'ALL'>('30D');

    const historicalData = useMemo(() => generateHistoricalData(), []);
    const categoryData = useMemo(() => generateCategoryData(), []);
    const monthlyPnL = useMemo(() => generateMonthlyPnL(), []);

    // Calculate analytics
    const analytics = useMemo(() => {
        if (!data) return null;
        const totalTrades = data.resolved.length + data.positions.length;
        const winningTrades = data.resolved.filter(r => r.realizedPL > 0).length;
        const winRate = totalTrades > 0 ? (winningTrades / data.resolved.length) * 100 : 0;
        const avgWin = data.resolved.filter(r => r.realizedPL > 0).reduce((acc, r) => acc + r.realizedPL, 0) / (winningTrades || 1);
        const losingTrades = data.resolved.filter(r => r.realizedPL < 0);
        const avgLoss = losingTrades.reduce((acc, r) => acc + r.realizedPL, 0) / (losingTrades.length || 1);
        const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;
        
        return {
            totalTrades,
            winningTrades,
            losingTrades: losingTrades.length,
            winRate,
            avgWin,
            avgLoss,
            profitFactor,
            bestTrade: Math.max(...data.resolved.map(r => r.realizedPL), 0),
            worstTrade: Math.min(...data.resolved.map(r => r.realizedPL), 0),
            sharpeRatio: 1.85, // Mock
            maxDrawdown: -12.5, // Mock %
        };
    }, [data]);

    useEffect(() => {
        const fetchPortfolio = async () => {
            setLoading(true);
            if (isConnected()) {
                const portfolioData = await getPortfolio();
                setData(portfolioData as PortfolioData);
            } else {
                // Default empty state
                setData({
                    summary: { totalValue: 0, totalPL: 0, availableFunds: 0 },
                    positions: [],
                    resolved: []
                });
            }
            setLoading(false);
        };
        fetchPortfolio();
    }, []);
    
    const { wallet } = useWallet();
    const PLColor = (pl: number) => pl >= 0 ? 'text-brand-yes' : 'text-brand-danger';

    if (loading) {
        return <div className="text-center p-10">Loading portfolio...</div>;
    }

    if (!wallet.isConnected) {
        return (
            <div className="text-center p-10 bg-brand-surface/50 rounded-xl border border-brand-border max-w-md mx-auto mt-10">
                <h2 className="text-xl font-semibold text-brand-text mb-2">Connect Wallet</h2>
                <p className="text-brand-secondary">Connect your wallet to view your portfolio and positions.</p>
            </div>
        );
    }

    if (!data) {
        return <div className="text-center p-10">No portfolio data available</div>;
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-brand-text">Portfolio</h1>
                    <p className="text-brand-secondary mt-1">Track your positions, performance, and analytics</p>
                </div>
                <div className="flex gap-2">
                    {(['7D', '30D', '90D', 'ALL'] as const).map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-3 py-1 text-sm rounded-md ${timeframe === tf ? 'bg-brand-primary text-white' : 'bg-brand-surface text-brand-secondary hover:text-brand-text'}`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
                    <div className="text-xs text-brand-secondary">Total Value</div>
                    <div className="text-2xl font-bold text-brand-text mt-1">${data.summary.totalValue.toLocaleString()}</div>
                    <div className="text-xs text-brand-yes mt-1">+5.2% this week</div>
                </div>
                <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
                    <div className="text-xs text-brand-secondary">Total P&L</div>
                    <div className={`text-2xl font-bold mt-1 ${PLColor(data.summary.totalPL)}`}>
                        {data.summary.totalPL >= 0 ? '+' : ''}${data.summary.totalPL.toLocaleString()}
                    </div>
                    <div className="text-xs text-brand-secondary mt-1">{((data.summary.totalPL / 5000) * 100).toFixed(1)}% ROI</div>
                </div>
                <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
                    <div className="text-xs text-brand-secondary">Available</div>
                    <div className="text-2xl font-bold text-brand-text mt-1">${data.summary.availableFunds.toLocaleString()}</div>
                    <div className="text-xs text-brand-secondary mt-1">USDC Balance</div>
                </div>
                <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
                    <div className="text-xs text-brand-secondary">Win Rate</div>
                    <div className="text-2xl font-bold text-brand-text mt-1">{analytics?.winRate.toFixed(1)}%</div>
                    <div className="text-xs text-brand-secondary mt-1">{analytics?.winningTrades}W / {analytics?.losingTrades}L</div>
                </div>
            </section>

            {/* Tabs */}
            <div className="border-b border-brand-border">
                <nav className="-mb-px flex space-x-8">
                    {(['overview', 'positions', 'history', 'analytics'] as const).map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)} 
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-secondary hover:text-brand-text'}`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Portfolio Value Chart */}
                        <div className="lg:col-span-2 bg-brand-surface border border-brand-border rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-brand-text mb-4">Portfolio Value</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={historicalData}>
                                        <defs>
                                            <linearGradient id="colorPV" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#238636" stopOpacity={0.6}/>
                                                <stop offset="95%" stopColor="#238636" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                                        <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString()} stroke="#8B949E" fontSize={11} />
                                        <YAxis stroke="#8B949E" fontSize={11} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="value" stroke="#238636" strokeWidth={2} fill="url(#colorPV)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Category Allocation */}
                        <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-brand-text mb-4">Allocation</h3>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            dataKey="value"
                                            label={(props: Record<string, unknown>) => `${props.name} ${(Number(props.percent) * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={index} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {categoryData.map(cat => (
                                    <div key={cat.name} className="flex items-center gap-2 text-xs">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                        <span className="text-brand-secondary">{cat.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Monthly P&L */}
                        <div className="lg:col-span-3 bg-brand-surface border border-brand-border rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-brand-text mb-4">Monthly P&L</h3>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyPnL}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                                        <XAxis dataKey="month" stroke="#8B949E" fontSize={11} />
                                        <YAxis stroke="#8B949E" fontSize={11} tickFormatter={(v) => `$${v}`} />
                                        <Tooltip />
                                        <Bar dataKey="pnl" fill="#238636">
                                            {monthlyPnL.map((entry, index) => (
                                                <Cell key={index} fill={entry.pnl >= 0 ? '#238636' : '#DA3633'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* Positions Tab */}
                {activeTab === 'positions' && (
                    <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-brand-surface-2 text-xs text-brand-secondary uppercase">
                                <tr>
                                    <th className="px-6 py-3 text-left font-semibold">Market</th>
                                    <th className="px-6 py-3 text-center font-semibold">Position</th>
                                    <th className="px-6 py-3 text-right font-semibold">Avg Cost</th>
                                    <th className="px-6 py-3 text-right font-semibold">Current</th>
                                    <th className="px-6 py-3 text-right font-semibold">P&L</th>
                                    <th className="px-6 py-3 text-right font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.positions.map(pos => (
                                    <tr key={pos.marketId} className="border-b border-brand-border hover:bg-brand-surface-2">
                                        <td className="px-6 py-4 font-medium text-brand-text">{pos.marketQuestion}</td>
                                        <td className={`px-6 py-4 text-center font-bold ${pos.shareType === ShareType.YES ? 'text-brand-yes' : 'text-brand-no'}`}>
                                            {pos.shares} {pos.shareType}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-brand-secondary">${pos.avgCost.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-mono text-brand-text">${pos.currentValue.toFixed(2)}</td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold ${PLColor(pos.unrealizedPL)}`}>
                                            {pos.unrealizedPL >= 0 ? '+' : ''}${pos.unrealizedPL.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="px-3 py-1 bg-brand-primary text-white text-xs rounded hover:bg-brand-primary-hover">
                                                Trade
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-brand-surface-2 text-xs text-brand-secondary uppercase">
                                <tr>
                                    <th className="px-6 py-3 text-left font-semibold">Market</th>
                                    <th className="px-6 py-3 text-center font-semibold">Outcome</th>
                                    <th className="px-6 py-3 text-right font-semibold">Realized P&L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.resolved.map(res => (
                                    <tr key={res.marketId} className="border-b border-brand-border hover:bg-brand-surface-2">
                                        <td className="px-6 py-4 font-medium text-brand-text">{res.marketQuestion}</td>
                                        <td className={`px-6 py-4 text-center font-bold ${res.outcome === ShareType.YES ? 'text-brand-yes' : 'text-brand-no'}`}>
                                            {res.outcome}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold ${PLColor(res.realizedPL)}`}>
                                            {res.realizedPL >= 0 ? '+' : ''}${res.realizedPL.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && analytics && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Performance Stats */}
                        <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-brand-text mb-4">Performance Stats</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-brand-secondary">Win Rate</span>
                                    <span className="text-brand-text font-mono">{analytics.winRate.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-brand-secondary">Profit Factor</span>
                                    <span className="text-brand-text font-mono">{analytics.profitFactor.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-brand-secondary">Sharpe Ratio</span>
                                    <span className="text-brand-text font-mono">{analytics.sharpeRatio.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-brand-secondary">Max Drawdown</span>
                                    <span className="text-brand-no font-mono">{analytics.maxDrawdown.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Trade Stats */}
                        <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-brand-text mb-4">Trade Statistics</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-brand-secondary">Total Trades</span>
                                    <span className="text-brand-text font-mono">{analytics.totalTrades}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-brand-secondary">Winning Trades</span>
                                    <span className="text-brand-yes font-mono">{analytics.winningTrades}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-brand-secondary">Losing Trades</span>
                                    <span className="text-brand-no font-mono">{analytics.losingTrades}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-brand-secondary">Avg Win</span>
                                    <span className="text-brand-yes font-mono">+${analytics.avgWin.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-brand-secondary">Avg Loss</span>
                                    <span className="text-brand-no font-mono">${analytics.avgLoss.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Best/Worst */}
                        <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-brand-text mb-4">Extremes</h3>
                            <div className="space-y-4">
                                <div className="bg-brand-yes/10 p-3 rounded-lg">
                                    <div className="text-xs text-brand-secondary">Best Trade</div>
                                    <div className="text-xl font-bold text-brand-yes">+${analytics.bestTrade.toFixed(2)}</div>
                                </div>
                                <div className="bg-brand-no/10 p-3 rounded-lg">
                                    <div className="text-xs text-brand-secondary">Worst Trade</div>
                                    <div className="text-xl font-bold text-brand-no">${analytics.worstTrade.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PortfolioPage;