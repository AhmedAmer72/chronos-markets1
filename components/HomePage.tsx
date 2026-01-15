import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getMarkets, isApplicationConnected } from '../services/marketService';
import { Market } from '../types';
import { useWallet } from '../contexts/WalletContext';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { TrendingUpIcon, UsersIcon, ZapIcon, ArrowRightIcon } from './icons';

const SparklineChart: React.FC<{ data: { time: number; value: number }[] }> = ({ data }) => {
    const chartColor = data[data.length - 1].value >= data[0].value ? '#238636' : '#DA3633';
    return (
        <ResponsiveContainer width="100%" height={50}>
            <LineChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                <YAxis domain={['dataMin', 'dataMax']} hide />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#161B22',
                        borderColor: '#30363D',
                        fontSize: '12px',
                    }}
                    labelFormatter={(label) => new Date(label).toLocaleTimeString()}
                    formatter={(value: any) => [`${(value * 100).toFixed(0)}¢`, 'Price']}
                />
                <Line type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    );
};

const MarketCard: React.FC<{ market: Market }> = ({ market }) => (
    <Link 
        to={`/market/${market.id}`} 
        className="block bg-brand-surface/80 backdrop-blur-sm border border-brand-border rounded-xl p-4 transition-all duration-300 transform hover:-translate-y-1 group animate-fadeIn hover:shadow-glow-primary hover:border-brand-primary/50"
    >
        <div className="flex justify-between items-start">
            <span className="text-xs bg-brand-surface-2 text-brand-secondary font-medium px-2 py-1 rounded-full border border-brand-border">{market.categories[0]}</span>
            <div className="text-right">
                <div className="text-3xl font-bold text-brand-text">{(market.currentPrice * 100).toFixed(0)}¢</div>
                <div className={`text-sm font-semibold ${market.currentPrice >= 0.5 ? 'text-brand-yes' : 'text-brand-no'}`}>YES</div>
            </div>
        </div>
        <p className="mt-4 mb-2 text-base font-semibold text-brand-text h-12 group-hover:text-brand-primary transition-colors">{market.question}</p>
        <div className="mt-4 mb-2">
            <SparklineChart data={market.priceHistory} />
        </div>
        <div className="text-xs text-brand-secondary flex justify-between items-center">
            <span>Volume: <span className="font-mono text-brand-text">${market.volume.toLocaleString()}</span></span>
            <span className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity text-brand-primary font-semibold">
                Trade Now <ArrowRightIcon className="ml-1"/>
            </span>
        </div>
    </Link>
);

const MarketTicker: React.FC<{ markets: Market[] }> = ({ markets }) => {
    if (!markets.length) return null;
    
    const tickerItems = [...markets, ...markets]; // Duplicate for seamless loop

    return (
        <div className="w-full bg-brand-surface-2/50 backdrop-blur-sm border-y border-brand-border overflow-hidden relative py-2">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-bg via-transparent to-brand-bg z-10"></div>
            <div className="flex animate-marquee">
                {tickerItems.map((market, index) => (
                    <Link key={`${market.id}-${index}`} to={`/market/${market.id}`} className="flex items-center flex-shrink-0 mx-6 text-sm">
                        <span className="text-brand-secondary mr-2 truncate max-w-[200px]">{market.question}</span>
                        <span className={`font-bold font-mono ${market.currentPrice > 0.5 ? 'text-brand-yes' : 'text-brand-no'}`}>
                            {(market.currentPrice * 100).toFixed(0)}¢
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    )
};


const HomePage: React.FC = () => {
    const { wallet } = useWallet();
    const [markets, setMarkets] = useState<Market[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');
    const [sortKey, setSortKey] = useState('volume');

    useEffect(() => {
        const fetchMarkets = async () => {
            setLoading(true);
            // Only fetch if application is connected
            if (isApplicationConnected()) {
                const data = await getMarkets();
                console.log('📊 Loaded markets from blockchain:', data.length);
                setMarkets(data);
            } else {
                console.log('⏳ Waiting for wallet connection to load markets');
                setMarkets([]);
            }
            setLoading(false);
        };
        fetchMarkets();
    }, [wallet.isConnected]); // Re-fetch when wallet connects

    const categories = useMemo(() => ['All', 'Politics', 'Crypto', 'Sports', 'Science & Tech', 'Culture'], []);

    const filteredAndSortedMarkets = useMemo(() => {
        return markets
            .filter(market => activeCategory === 'All' || market.categories.includes(activeCategory))
            .sort((a, b) => {
                if (sortKey === 'volume') return b.volume - a.volume;
                if (sortKey === 'liquidity') return b.liquidity - a.liquidity;
                if (sortKey === 'endingSoon') return a.ends - b.ends;
                if (sortKey === 'newlyListed') return b.id.localeCompare(a.id);
                return 0;
            });
    }, [markets, activeCategory, sortKey]);

    const stats = [
        { icon: TrendingUpIcon, label: '24h Volume', value: '$' + (markets.reduce((sum, m) => sum + m.volume, 0) / 1_000_000).toFixed(2) + 'M' },
        { icon: UsersIcon, label: 'Active Traders', value: (markets.reduce((sum, m) => sum + m.traders, 0)).toLocaleString() },
        { icon: ZapIcon, label: 'Avg. TPS', value: '1,000+' }
    ];

    if (loading) {
        return <div className="text-center p-10">Initializing Chronos Interface...</div>;
    }

    return (
        <div className="space-y-12 md:space-y-20">
            <section 
                className="text-center animate-fadeIn pt-20 pb-24"
            >
                <div className="relative z-10">
                    <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-brand-text to-brand-primary bg-clip-text text-transparent pb-2">
                        The Future of Prediction
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-brand-secondary">
                        Trade on real-world events with unparalleled speed and scale, powered by the Linera protocol.
                    </p>
                    <div className="mt-8 flex justify-center gap-4">
                        <Link to="/markets" className="px-6 py-3 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20 transform hover:scale-105">
                           Explore Markets
                        </Link>
                         <Link to="/create" className="px-6 py-3 text-sm font-semibold text-brand-text bg-brand-surface-2/80 border border-brand-border rounded-lg hover:bg-brand-border hover:border-brand-primary/50 transition-colors">
                            Create a Market
                        </Link>
                    </div>

                    <div className="mt-16 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        {stats.map((stat, i) => (
                            <div key={i} className="bg-brand-surface/50 backdrop-blur-sm border border-brand-border/50 rounded-lg p-4 flex items-center space-x-4 animate-float" style={{animationDelay: `${i * 2}s`}}>
                                <stat.icon className="w-8 h-8 text-brand-primary"/>
                                <div>
                                    <div className="text-2xl font-bold font-mono text-brand-text">{stat.value}</div>
                                    <div className="text-xs text-brand-secondary uppercase tracking-wider">{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            
            <MarketTicker markets={markets} />
            
            <section className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
                <h2 className="text-3xl font-bold text-brand-text mb-6 text-center">Trending Markets</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {markets.slice(0, 4).map((market, i) => (
                        <div key={market.id} style={{animationDelay: `${i * 100}ms`}}>
                             <MarketCard market={market} />
                        </div>
                    ))}
                </div>
            </section>

            <section id="all-markets" className="animate-fadeIn" style={{ animationDelay: '300ms' }}>
                <h2 className="text-3xl font-bold text-brand-text mb-6 text-center">Market Clusters</h2>
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                     <div className="flex flex-wrap gap-2 p-1 bg-brand-surface/80 backdrop-blur-sm border border-brand-border rounded-lg">
                        {categories.map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    activeCategory === category ? 'bg-brand-primary text-white shadow-md' : 'bg-transparent text-brand-secondary hover:bg-brand-surface-2 hover:text-brand-text'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                     <div className="flex gap-2 text-sm bg-brand-surface/80 backdrop-blur-sm border border-brand-border rounded-lg p-1">
                        {['volume', 'liquidity', 'endingSoon'].map(key => (
                            <button key={key} onClick={() => setSortKey(key)} className={`px-3 py-1 rounded-md ${sortKey === key ? 'bg-brand-surface-2 text-brand-primary' : 'text-brand-secondary hover:text-brand-text'}`}>
                                {key.charAt(0).toUpperCase() + key.slice(1).replace('Soon', ' Soon')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-brand-surface/80 backdrop-blur-sm border border-brand-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-brand-surface-2 text-xs text-brand-secondary uppercase tracking-wider">
                                <tr>
                                    <th scope="col" className="px-6 py-3 font-semibold">Market</th>
                                    <th scope="col" className="px-6 py-3 text-right font-semibold">Price (YES)</th>
                                    <th scope="col" className="px-6 py-3 text-right font-semibold">Volume</th>
                                    <th scope="col" className="px-6 py-3 text-right font-semibold">Ends In</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedMarkets.map(market => (
                                    <tr key={market.id} className="border-b border-brand-border last:border-b-0 hover:bg-brand-surface-2/50 transition-colors group">
                                        <th scope="row" className="px-6 py-4 font-medium text-brand-text whitespace-nowrap">
                                            <Link to={`/market/${market.id}`} className="group-hover:text-brand-primary group-hover:underline">{market.question}</Link>
                                        </th>
                                        <td className={`px-6 py-4 text-right font-mono text-lg font-bold ${market.currentPrice > 0.5 ? 'text-brand-yes' : 'text-brand-no'}`}>{(market.currentPrice * 100).toFixed(0)}¢</td>
                                        <td className="px-6 py-4 text-right font-mono text-brand-secondary">${market.volume.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-mono text-brand-secondary">{new Date(market.ends).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;