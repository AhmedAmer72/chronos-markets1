import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

// Types
interface ComboLeg {
    id: number;
    marketId: number;
    marketQuestion: string;
    prediction: 'yes' | 'no';
    odds: number;
    category: string;
}

interface SavedCombo {
    id: number;
    name: string;
    legs: ComboLeg[];
    stake: number;
    potentialPayout: number;
    createdAt: string;
    status: 'active' | 'won' | 'lost' | 'partial';
}

// Mock available markets for combo building
const availableMarkets = [
    { id: 1, question: 'Will BTC hit $100k by Dec 2025?', yesOdds: 0.62, noOdds: 0.38, category: 'Crypto', volume: 125000 },
    { id: 2, question: 'Will ETH 2.0 full rollout happen in Q1?', yesOdds: 0.45, noOdds: 0.55, category: 'Crypto', volume: 89000 },
    { id: 3, question: 'Fed rate cut in March 2025?', yesOdds: 0.72, noOdds: 0.28, category: 'Finance', volume: 67000 },
    { id: 4, question: 'SpaceX Starship successful orbital flight Q1?', yesOdds: 0.58, noOdds: 0.42, category: 'Tech', volume: 45000 },
    { id: 5, question: 'Will Trump win 2024 election?', yesOdds: 0.48, noOdds: 0.52, category: 'Politics', volume: 234000 },
    { id: 6, question: 'Super Bowl LVIII - Chiefs win?', yesOdds: 0.35, noOdds: 0.65, category: 'Sports', volume: 156000 },
    { id: 7, question: 'Apple Vision Pro sells 1M units in 2024?', yesOdds: 0.28, noOdds: 0.72, category: 'Tech', volume: 34000 },
    { id: 8, question: 'Solana price above $200 by June?', yesOdds: 0.41, noOdds: 0.59, category: 'Crypto', volume: 78000 },
];

// Mock saved combos
const mockSavedCombos: SavedCombo[] = [
    {
        id: 1,
        name: 'Crypto Bull Run',
        legs: [
            { id: 1, marketId: 1, marketQuestion: 'BTC $100k', prediction: 'yes', odds: 0.62, category: 'Crypto' },
            { id: 2, marketId: 8, marketQuestion: 'SOL $200', prediction: 'yes', odds: 0.41, category: 'Crypto' },
        ],
        stake: 100,
        potentialPayout: 393.70,
        createdAt: '2025-01-10T10:00:00Z',
        status: 'active'
    },
    {
        id: 2,
        name: 'Tech Winners',
        legs: [
            { id: 1, marketId: 4, marketQuestion: 'SpaceX Starship', prediction: 'yes', odds: 0.58, category: 'Tech' },
            { id: 2, marketId: 7, marketQuestion: 'Vision Pro 1M', prediction: 'no', odds: 0.72, category: 'Tech' },
        ],
        stake: 50,
        potentialPayout: 119.75,
        createdAt: '2025-01-08T14:30:00Z',
        status: 'won'
    },
];

// Popular combo templates
const popularTemplates = [
    { name: 'Crypto Triple', description: 'BTC, ETH, SOL all bullish', expectedOdds: 5.2, popularity: 234 },
    { name: 'Tech Moonshot', description: 'SpaceX + Apple success combo', expectedOdds: 3.8, popularity: 189 },
    { name: 'Political Upset', description: 'Underdog political outcomes', expectedOdds: 8.5, popularity: 145 },
    { name: 'Safe Parlay', description: 'High probability combo', expectedOdds: 1.8, popularity: 312 },
];

const CombosPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'builder' | 'my-combos' | 'popular'>('builder');
    const [selectedLegs, setSelectedLegs] = useState<ComboLeg[]>([]);
    const [stake, setStake] = useState('');
    const [comboName, setComboName] = useState('');
    const [savedCombos, setSavedCombos] = useState<SavedCombo[]>(mockSavedCombos);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [showSaveModal, setShowSaveModal] = useState(false);

    // Calculate combined odds and potential payout
    const { combinedOdds, potentialPayout, impliedProbability } = useMemo(() => {
        if (selectedLegs.length === 0) {
            return { combinedOdds: 0, potentialPayout: 0, impliedProbability: 0 };
        }
        const odds = selectedLegs.reduce((acc, leg) => acc * (1 / leg.odds), 1);
        const stakeAmount = parseFloat(stake) || 0;
        return {
            combinedOdds: odds,
            potentialPayout: stakeAmount * odds,
            impliedProbability: selectedLegs.reduce((acc, leg) => acc * leg.odds, 1) * 100
        };
    }, [selectedLegs, stake]);

    const addLeg = (market: typeof availableMarkets[0], prediction: 'yes' | 'no') => {
        // Check if market already in combo
        if (selectedLegs.some(l => l.marketId === market.id)) {
            // Update prediction if same market
            setSelectedLegs(selectedLegs.map(l => 
                l.marketId === market.id 
                    ? { ...l, prediction, odds: prediction === 'yes' ? market.yesOdds : market.noOdds }
                    : l
            ));
        } else {
            const newLeg: ComboLeg = {
                id: Date.now(),
                marketId: market.id,
                marketQuestion: market.question,
                prediction,
                odds: prediction === 'yes' ? market.yesOdds : market.noOdds,
                category: market.category
            };
            setSelectedLegs([...selectedLegs, newLeg]);
        }
    };

    const removeLeg = (legId: number) => {
        setSelectedLegs(selectedLegs.filter(l => l.id !== legId));
    };

    const saveCombo = () => {
        if (selectedLegs.length < 2 || !stake || !comboName) return;
        
        const newCombo: SavedCombo = {
            id: Date.now(),
            name: comboName,
            legs: selectedLegs,
            stake: parseFloat(stake),
            potentialPayout,
            createdAt: new Date().toISOString(),
            status: 'active'
        };
        setSavedCombos([newCombo, ...savedCombos]);
        setSelectedLegs([]);
        setStake('');
        setComboName('');
        setShowSaveModal(false);
    };

    const filteredMarkets = categoryFilter === 'all' 
        ? availableMarkets 
        : availableMarkets.filter(m => m.category === categoryFilter);

    const categories = ['all', ...new Set(availableMarkets.map(m => m.category))];

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-brand-text">Market Combos</h1>
                <p className="mt-2 text-brand-secondary">
                    Create parlay bets by combining multiple market predictions for higher payouts.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-brand-surface border border-brand-border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-brand-text">{savedCombos.filter(c => c.status === 'active').length}</div>
                    <div className="text-xs text-brand-secondary">Active Combos</div>
                </div>
                <div className="bg-brand-surface border border-brand-border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-brand-yes">
                        ${savedCombos.filter(c => c.status === 'won').reduce((acc, c) => acc + c.potentialPayout, 0).toFixed(0)}
                    </div>
                    <div className="text-xs text-brand-secondary">Total Won</div>
                </div>
                <div className="bg-brand-surface border border-brand-border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-brand-text">
                        {((savedCombos.filter(c => c.status === 'won').length / savedCombos.length) * 100 || 0).toFixed(0)}%
                    </div>
                    <div className="text-xs text-brand-secondary">Win Rate</div>
                </div>
                <div className="bg-brand-surface border border-brand-border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-brand-text">{availableMarkets.length}</div>
                    <div className="text-xs text-brand-secondary">Available Markets</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-brand-border">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'builder', name: 'Combo Builder' },
                        { id: 'my-combos', name: 'My Combos' },
                        { id: 'popular', name: 'Popular Templates' },
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)} 
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === tab.id 
                                    ? 'border-brand-primary text-brand-primary' 
                                    : 'border-transparent text-brand-secondary hover:text-brand-text'
                            }`}
                        >
                            {tab.name}
                            {tab.id === 'my-combos' && savedCombos.length > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-brand-surface-2 text-xs rounded-full">
                                    {savedCombos.length}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div>
                {/* Combo Builder */}
                {activeTab === 'builder' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Market Selection */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-brand-text">Select Markets</h2>
                                <div className="flex gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setCategoryFilter(cat)}
                                            className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                                categoryFilter === cat
                                                    ? 'bg-brand-primary text-white'
                                                    : 'bg-brand-surface text-brand-secondary hover:text-brand-text'
                                            }`}
                                        >
                                            {cat === 'all' ? 'All' : cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {filteredMarkets.map(market => {
                                    const isSelected = selectedLegs.some(l => l.marketId === market.id);
                                    const selectedPrediction = selectedLegs.find(l => l.marketId === market.id)?.prediction;
                                    
                                    return (
                                        <div 
                                            key={market.id} 
                                            className={`bg-brand-surface border rounded-lg p-4 transition-all ${
                                                isSelected ? 'border-brand-primary' : 'border-brand-border hover:border-brand-border/80'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <Link to={`/market/${market.id}`} className="text-brand-text font-medium hover:text-brand-primary">
                                                        {market.question}
                                                    </Link>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs px-2 py-0.5 bg-brand-surface-2 rounded text-brand-secondary">
                                                            {market.category}
                                                        </span>
                                                        <span className="text-xs text-brand-secondary">
                                                            Vol: ${(market.volume / 1000).toFixed(0)}K
                                                        </span>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <button 
                                                        onClick={() => removeLeg(selectedLegs.find(l => l.marketId === market.id)!.id)}
                                                        className="text-brand-no hover:underline text-xs"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => addLeg(market, 'yes')}
                                                    className={`py-2 rounded-md font-semibold text-sm transition-all ${
                                                        selectedPrediction === 'yes'
                                                            ? 'bg-brand-yes text-white'
                                                            : 'bg-brand-surface-2 text-brand-secondary hover:text-brand-yes hover:bg-brand-yes/10'
                                                    }`}
                                                >
                                                    YES @ {(market.yesOdds * 100).toFixed(0)}¢
                                                </button>
                                                <button
                                                    onClick={() => addLeg(market, 'no')}
                                                    className={`py-2 rounded-md font-semibold text-sm transition-all ${
                                                        selectedPrediction === 'no'
                                                            ? 'bg-brand-no text-white'
                                                            : 'bg-brand-surface-2 text-brand-secondary hover:text-brand-no hover:bg-brand-no/10'
                                                    }`}
                                                >
                                                    NO @ {(market.noOdds * 100).toFixed(0)}¢
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Combo Slip */}
                        <div className="lg:sticky lg:top-20 h-fit">
                            <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
                                <h3 className="text-lg font-bold text-brand-text mb-4">
                                    Combo Slip ({selectedLegs.length} legs)
                                </h3>

                                {selectedLegs.length === 0 ? (
                                    <div className="text-center py-8 text-brand-secondary">
                                        <p>Select markets to build your combo</p>
                                        <p className="text-xs mt-2">Minimum 2 legs required</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                                            {selectedLegs.map((leg, idx) => (
                                                <div key={leg.id} className="bg-brand-surface-2 rounded-lg p-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-brand-secondary">#{idx + 1}</span>
                                                            <span className={`text-xs font-bold ${leg.prediction === 'yes' ? 'text-brand-yes' : 'text-brand-no'}`}>
                                                                {leg.prediction.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <button onClick={() => removeLeg(leg.id)} className="text-brand-secondary hover:text-brand-no">
                                                            ✕
                                                        </button>
                                                    </div>
                                                    <p className="text-sm text-brand-text mt-1 line-clamp-2">{leg.marketQuestion}</p>
                                                    <p className="text-xs text-brand-secondary mt-1">Odds: {(1/leg.odds).toFixed(2)}x</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="border-t border-brand-border pt-4 space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-brand-secondary">Combined Odds:</span>
                                                <span className="text-brand-text font-bold">{combinedOdds.toFixed(2)}x</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-brand-secondary">Win Probability:</span>
                                                <span className="text-brand-text">{impliedProbability.toFixed(1)}%</span>
                                            </div>
                                            
                                            <div>
                                                <label className="text-xs text-brand-secondary block mb-1">Stake (USDC)</label>
                                                <input
                                                    type="number"
                                                    value={stake}
                                                    onChange={e => setStake(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full bg-brand-surface-2 p-2 rounded-md border border-brand-border text-brand-text"
                                                />
                                            </div>

                                            <div className="flex justify-between text-lg font-bold">
                                                <span className="text-brand-secondary">Potential Payout:</span>
                                                <span className="text-brand-yes">${potentialPayout.toFixed(2)}</span>
                                            </div>

                                            <button
                                                onClick={() => setShowSaveModal(true)}
                                                disabled={selectedLegs.length < 2 || !stake}
                                                className="w-full py-3 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Place Combo Bet
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* My Combos */}
                {activeTab === 'my-combos' && (
                    <div className="space-y-4">
                        {savedCombos.length === 0 ? (
                            <div className="bg-brand-surface border border-brand-border rounded-lg p-8 text-center">
                                <p className="text-brand-secondary mb-4">No combos yet. Create your first parlay bet!</p>
                                <button 
                                    onClick={() => setActiveTab('builder')}
                                    className="px-6 py-2 bg-brand-primary text-white font-semibold rounded-lg"
                                >
                                    Build Combo
                                </button>
                            </div>
                        ) : (
                            savedCombos.map(combo => (
                                <div key={combo.id} className="bg-brand-surface border border-brand-border rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-brand-text">{combo.name}</h3>
                                            <p className="text-xs text-brand-secondary">
                                                {new Date(combo.createdAt).toLocaleDateString()} · {combo.legs.length} legs
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                            combo.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                                            combo.status === 'won' ? 'bg-brand-yes/20 text-brand-yes' :
                                            combo.status === 'lost' ? 'bg-brand-no/20 text-brand-no' :
                                            'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                            {combo.status.toUpperCase()}
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-2 mb-4">
                                        {combo.legs.map((leg, idx) => (
                                            <div key={leg.id} className="flex items-center gap-3 text-sm">
                                                <span className="text-brand-secondary">#{idx + 1}</span>
                                                <span className={`font-semibold ${leg.prediction === 'yes' ? 'text-brand-yes' : 'text-brand-no'}`}>
                                                    {leg.prediction.toUpperCase()}
                                                </span>
                                                <span className="text-brand-text">{leg.marketQuestion}</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="flex justify-between items-center pt-3 border-t border-brand-border">
                                        <div>
                                            <span className="text-brand-secondary text-sm">Stake: </span>
                                            <span className="text-brand-text font-mono">${combo.stake.toFixed(2)}</span>
                                        </div>
                                        <div>
                                            <span className="text-brand-secondary text-sm">Payout: </span>
                                            <span className="text-brand-yes font-mono font-bold">${combo.potentialPayout.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Popular Templates */}
                {activeTab === 'popular' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {popularTemplates.map((template, idx) => (
                            <div key={idx} className="bg-brand-surface border border-brand-border rounded-lg p-4 hover:border-brand-primary/50 transition-all cursor-pointer">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-brand-text">{template.name}</h3>
                                    <span className="text-xs text-brand-secondary">👥 {template.popularity}</span>
                                </div>
                                <p className="text-sm text-brand-secondary mb-3">{template.description}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-brand-text">Expected Odds: <span className="font-bold">{template.expectedOdds}x</span></span>
                                    <button 
                                        onClick={() => setActiveTab('builder')}
                                        className="px-3 py-1 bg-brand-primary text-white text-sm rounded hover:bg-brand-primary-hover"
                                    >
                                        Use Template
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Save Combo Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-brand-surface border border-brand-border rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-brand-text mb-4">Name Your Combo</h3>
                        <input
                            type="text"
                            value={comboName}
                            onChange={e => setComboName(e.target.value)}
                            placeholder="e.g., Crypto Bull Run"
                            className="w-full bg-brand-surface-2 p-3 rounded-lg border border-brand-border text-brand-text mb-4"
                        />
                        <div className="bg-brand-surface-2 rounded-lg p-3 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-brand-secondary">Legs:</span>
                                <span className="text-brand-text">{selectedLegs.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-brand-secondary">Stake:</span>
                                <span className="text-brand-text">${stake}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold">
                                <span className="text-brand-secondary">Potential Payout:</span>
                                <span className="text-brand-yes">${potentialPayout.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowSaveModal(false)}
                                className="flex-1 px-4 py-2 bg-brand-surface-2 text-brand-text rounded-lg"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={saveCombo}
                                disabled={!comboName}
                                className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg disabled:opacity-50"
                            >
                                Place Bet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CombosPage;
