import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

// Types
interface FeedItem {
    id: number;
    type: 'trade' | 'market_created' | 'comment' | 'follow' | 'achievement';
    user: {
        address: string;
        displayName: string;
        avatar?: string;
        reputation: number;
    };
    content: {
        marketId?: number;
        marketQuestion?: string;
        position?: 'yes' | 'no';
        amount?: string;
        price?: string;
        text?: string;
        achievement?: string;
        followedUser?: string;
    };
    timestamp: string;
    likes: number;
    comments: number;
    isLiked?: boolean;
}

// Mock data
const mockFeedItems: FeedItem[] = [
    {
        id: 1,
        type: 'trade',
        user: { address: '0x1234...5678', displayName: 'whaletrader.eth', reputation: 1250 },
        content: { marketId: 1, marketQuestion: 'Will BTC hit $100k by Dec 2025?', position: 'yes', amount: '5000', price: '0.68' },
        timestamp: '2025-01-14T10:30:00Z',
        likes: 24,
        comments: 8
    },
    {
        id: 2,
        type: 'market_created',
        user: { address: '0xabcd...efgh', displayName: 'cryptoqueen', reputation: 890 },
        content: { marketId: 5, marketQuestion: 'Will SpaceX launch Starship in Q1 2025?' },
        timestamp: '2025-01-14T09:15:00Z',
        likes: 45,
        comments: 12
    },
    {
        id: 3,
        type: 'comment',
        user: { address: '0x9876...1234', displayName: 'defi_degen', reputation: 450 },
        content: { marketId: 1, marketQuestion: 'Will BTC hit $100k by Dec 2025?', text: 'This is looking more likely after the ETF news! Bullish 🚀' },
        timestamp: '2025-01-14T08:45:00Z',
        likes: 18,
        comments: 3
    },
    {
        id: 4,
        type: 'achievement',
        user: { address: '0xfedc...ba98', displayName: 'alpha_seeker', reputation: 2100 },
        content: { achievement: 'Market Maven', text: 'Earned for 50 correct predictions!' },
        timestamp: '2025-01-14T07:20:00Z',
        likes: 67,
        comments: 15
    },
    {
        id: 5,
        type: 'trade',
        user: { address: '0x5555...6666', displayName: 'momentum_master', reputation: 780 },
        content: { marketId: 3, marketQuestion: 'Will ETH flip BTC market cap by 2026?', position: 'no', amount: '2500', price: '0.12' },
        timestamp: '2025-01-14T06:00:00Z',
        likes: 31,
        comments: 22
    },
    {
        id: 6,
        type: 'follow',
        user: { address: '0x7777...8888', displayName: 'newbie_trader', reputation: 50 },
        content: { followedUser: 'whaletrader.eth' },
        timestamp: '2025-01-14T05:30:00Z',
        likes: 5,
        comments: 0
    },
];

// Top traders leaderboard
const topTraders = [
    { rank: 1, name: 'whaletrader.eth', pnl: 152345.67, winRate: 78.5, followers: 1234 },
    { rank: 2, name: 'alpha_seeker', pnl: 98765.43, winRate: 72.1, followers: 987 },
    { rank: 3, name: 'cryptoqueen', pnl: 76543.21, winRate: 69.8, followers: 856 },
    { rank: 4, name: 'defi_degen', pnl: 54321.09, winRate: 65.4, followers: 654 },
    { rank: 5, name: 'momentum_master', pnl: 43210.98, winRate: 62.3, followers: 543 },
];

// Helper to format time ago
const timeAgo = (timestamp: string): string => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

// Feed Item Component
const FeedItemCard: React.FC<{ item: FeedItem; onLike: () => void }> = ({ item, onLike }) => {
    const getIcon = () => {
        switch (item.type) {
            case 'trade': return item.content.position === 'yes' ? '📈' : '📉';
            case 'market_created': return '🎯';
            case 'comment': return '💬';
            case 'achievement': return '🏆';
            case 'follow': return '👥';
            default: return '📌';
        }
    };

    const getContent = () => {
        switch (item.type) {
            case 'trade':
                return (
                    <div>
                        <p className="text-brand-text">
                            Bought <span className={item.content.position === 'yes' ? 'text-brand-yes font-semibold' : 'text-brand-no font-semibold'}>${item.content.amount} {item.content.position?.toUpperCase()}</span> @ {(parseFloat(item.content.price || '0') * 100).toFixed(0)}%
                        </p>
                        <Link to={`/market/${item.content.marketId}`} className="text-sm text-brand-primary hover:underline mt-1 block">
                            {item.content.marketQuestion}
                        </Link>
                    </div>
                );
            case 'market_created':
                return (
                    <div>
                        <p className="text-brand-text">Created a new prediction market</p>
                        <Link to={`/market/${item.content.marketId}`} className="text-sm text-brand-primary hover:underline mt-1 block">
                            {item.content.marketQuestion}
                        </Link>
                    </div>
                );
            case 'comment':
                return (
                    <div>
                        <p className="text-brand-text italic">"{item.content.text}"</p>
                        <Link to={`/market/${item.content.marketId}`} className="text-sm text-brand-secondary hover:text-brand-text mt-1 block">
                            on: {item.content.marketQuestion}
                        </Link>
                    </div>
                );
            case 'achievement':
                return (
                    <div>
                        <p className="text-brand-text">Earned badge: <span className="text-yellow-400 font-semibold">{item.content.achievement}</span></p>
                        <p className="text-sm text-brand-secondary">{item.content.text}</p>
                    </div>
                );
            case 'follow':
                return (
                    <p className="text-brand-text">Started following <span className="text-brand-primary font-semibold">{item.content.followedUser}</span></p>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4 hover:border-brand-border/80 transition-all">
            <div className="flex gap-4">
                {/* Avatar / Icon */}
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-brand-surface-2 rounded-full flex items-center justify-center text-2xl">
                        {getIcon()}
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex-grow">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-brand-text">{item.user.displayName}</span>
                        <span className="text-xs px-2 py-0.5 bg-brand-surface-2 rounded-full text-brand-secondary">
                            ⭐ {item.user.reputation}
                        </span>
                        <span className="text-xs text-brand-secondary">·</span>
                        <span className="text-xs text-brand-secondary">{timeAgo(item.timestamp)}</span>
                    </div>
                    
                    {/* Body */}
                    <div className="mb-3">{getContent()}</div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-6 text-sm">
                        <button 
                            onClick={onLike}
                            className={`flex items-center gap-1 transition-colors ${item.isLiked ? 'text-brand-no' : 'text-brand-secondary hover:text-brand-no'}`}
                        >
                            <span>{item.isLiked ? '❤️' : '🤍'}</span>
                            <span>{item.likes}</span>
                        </button>
                        <button className="flex items-center gap-1 text-brand-secondary hover:text-brand-text transition-colors">
                            <span>💬</span>
                            <span>{item.comments}</span>
                        </button>
                        <button className="flex items-center gap-1 text-brand-secondary hover:text-brand-text transition-colors">
                            <span>🔗</span>
                            <span>Share</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main Page Component
const SocialFeedPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'feed' | 'following' | 'trending' | 'leaderboard'>('feed');
    const [filter, setFilter] = useState<'all' | 'trades' | 'markets' | 'comments'>('all');
    const [feedItems, setFeedItems] = useState<FeedItem[]>(mockFeedItems);
    const [followingList, setFollowingList] = useState<string[]>(['whaletrader.eth', 'alpha_seeker']);

    const filteredItems = useMemo(() => {
        let items = feedItems;
        
        // Filter by type
        if (filter === 'trades') items = items.filter(i => i.type === 'trade');
        else if (filter === 'markets') items = items.filter(i => i.type === 'market_created');
        else if (filter === 'comments') items = items.filter(i => i.type === 'comment');
        
        // Filter by following (for following tab)
        if (activeTab === 'following') {
            items = items.filter(i => followingList.includes(i.user.displayName));
        }
        
        return items;
    }, [feedItems, filter, activeTab, followingList]);

    const handleLike = (id: number) => {
        setFeedItems(prev => prev.map(item => 
            item.id === id 
                ? { ...item, isLiked: !item.isLiked, likes: item.isLiked ? item.likes - 1 : item.likes + 1 }
                : item
        ));
    };

    const handleFollow = (name: string) => {
        if (followingList.includes(name)) {
            setFollowingList(prev => prev.filter(n => n !== name));
        } else {
            setFollowingList(prev => [...prev, name]);
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-brand-text">Social Feed</h1>
                <p className="mt-2 text-brand-secondary">Follow top traders, see their moves, and engage with the community.</p>
            </div>

            {/* Layout: Feed + Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Feed */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tabs */}
                    <div className="flex gap-2 border-b border-brand-border pb-4">
                        {(['feed', 'following', 'trending'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                                    activeTab === tab
                                        ? 'bg-brand-primary text-white'
                                        : 'bg-brand-surface text-brand-secondary hover:text-brand-text'
                                }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                {tab === 'following' && followingList.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">{followingList.length}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2">
                        {(['all', 'trades', 'markets', 'comments'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                    filter === f
                                        ? 'bg-brand-surface-2 text-brand-text border border-brand-primary'
                                        : 'bg-brand-surface text-brand-secondary hover:text-brand-text border border-brand-border'
                                }`}
                            >
                                {f === 'all' ? '🌐 All' : f === 'trades' ? '📊 Trades' : f === 'markets' ? '🎯 Markets' : '💬 Comments'}
                            </button>
                        ))}
                    </div>

                    {/* Feed Items */}
                    <div className="space-y-4">
                        {filteredItems.length === 0 ? (
                            <div className="bg-brand-surface border border-brand-border rounded-xl p-8 text-center">
                                <p className="text-brand-secondary">No activity to show. {activeTab === 'following' && 'Follow some traders to see their activity!'}</p>
                            </div>
                        ) : (
                            filteredItems.map(item => (
                                <FeedItemCard 
                                    key={item.id} 
                                    item={item} 
                                    onLike={() => handleLike(item.id)} 
                                />
                            ))
                        )}
                    </div>

                    {/* Load More */}
                    <div className="text-center">
                        <button className="px-6 py-2 bg-brand-surface border border-brand-border text-brand-secondary rounded-lg hover:text-brand-text hover:border-brand-primary transition-colors">
                            Load More
                        </button>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Top Traders */}
                    <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
                        <h3 className="text-lg font-bold text-brand-text mb-4">🏆 Top Traders</h3>
                        <div className="space-y-3">
                            {topTraders.map(trader => (
                                <div key={trader.rank} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-bold text-brand-secondary w-6">
                                            {trader.rank === 1 ? '🥇' : trader.rank === 2 ? '🥈' : trader.rank === 3 ? '🥉' : trader.rank}
                                        </span>
                                        <div>
                                            <p className="font-semibold text-brand-text text-sm">{trader.name}</p>
                                            <p className="text-xs text-brand-secondary">{trader.winRate}% win rate</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleFollow(trader.name)}
                                        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                            followingList.includes(trader.name)
                                                ? 'bg-brand-surface-2 text-brand-secondary'
                                                : 'bg-brand-primary text-white hover:bg-brand-primary-hover'
                                        }`}
                                    >
                                        {followingList.includes(trader.name) ? 'Following' : 'Follow'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Trending Markets */}
                    <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
                        <h3 className="text-lg font-bold text-brand-text mb-4">🔥 Trending Markets</h3>
                        <div className="space-y-3">
                            {[
                                { id: 1, question: 'BTC to $100k by Dec 2025?', volume: '125K', change: '+12%' },
                                { id: 2, question: 'ETH 2.0 full rollout Q1?', volume: '89K', change: '+8%' },
                                { id: 3, question: 'Fed rate cut in March?', volume: '67K', change: '+15%' },
                            ].map(market => (
                                <Link 
                                    key={market.id} 
                                    to={`/market/${market.id}`}
                                    className="block p-3 bg-brand-surface-2 rounded-lg hover:bg-brand-border transition-colors"
                                >
                                    <p className="text-sm text-brand-text font-medium line-clamp-2">{market.question}</p>
                                    <div className="flex justify-between mt-2">
                                        <span className="text-xs text-brand-secondary">Vol: ${market.volume}</span>
                                        <span className="text-xs text-brand-yes">{market.change}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Your Stats */}
                    <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
                        <h3 className="text-lg font-bold text-brand-text mb-4">📊 Your Activity</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-brand-text">12</div>
                                <div className="text-xs text-brand-secondary">Trades Today</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-brand-yes">+$234</div>
                                <div className="text-xs text-brand-secondary">Today's P&L</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-brand-text">{followingList.length}</div>
                                <div className="text-xs text-brand-secondary">Following</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-brand-text">45</div>
                                <div className="text-xs text-brand-secondary">Followers</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialFeedPage;
