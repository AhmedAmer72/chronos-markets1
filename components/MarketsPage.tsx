import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Market } from '../types';
import { getMarkets } from '../services/mockApi';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { ArrowRightIcon } from './icons';

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

const MarketsPage: React.FC = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortKey, setSortKey] = useState('volume');

  useEffect(() => {
    const fetchMarkets = async () => {
      setLoading(true);
      try {
        const data = await getMarkets();
        console.log('Fetched markets:', data);
        setMarkets(data);
      } catch (error) {
        console.error('Error fetching markets:', error);
      }
      setLoading(false);
    };
    fetchMarkets();
  }, []);

  const categories = useMemo(() => ['All', 'Politics', 'Crypto', 'Sports', 'Science & Tech', 'Culture'], []);

  const filteredAndSortedMarkets = useMemo(() => {
    return markets
      .filter(market => activeCategory === 'All' || market.categories.includes(activeCategory))
      .sort((a, b) => {
        if (sortKey === 'volume') return b.volume - a.volume;
        if (sortKey === 'liquidity') return b.liquidity - a.liquidity;
        if (sortKey === 'endingSoon') return a.ends - b.ends;
        return 0;
      });
  }, [markets, activeCategory, sortKey]);

  if (loading) {
    return <div className="text-center p-10 text-brand-text">Loading markets...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-brand-text">All Markets ({markets.length})</h1>
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
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
            <button 
              key={key} 
              onClick={() => setSortKey(key)} 
              className={`px-3 py-1 rounded-md ${sortKey === key ? 'bg-brand-surface-2 text-brand-primary' : 'text-brand-secondary hover:text-brand-text'}`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1).replace('Soon', ' Soon')}
            </button>
          ))}
        </div>
      </div>

      {filteredAndSortedMarkets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedMarkets.map((market, i) => (
            <div key={market.id} style={{animationDelay: `${i * 50}ms`}}>
              <MarketCard market={market} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-10 text-brand-secondary">
          No markets found for the selected category.
        </div>
      )}
    </div>
  );
};

export default MarketsPage;