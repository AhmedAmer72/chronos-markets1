import React, { useState, useEffect } from 'react';
import { TradingAgent, AgentStrategy } from '../src/lib/chronos/types';

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <pre className="bg-brand-surface-2 p-4 rounded-lg border border-brand-border text-sm overflow-x-auto">
        <code className="language-rust font-mono">{children}</code>
    </pre>
);

// Strategy configurations
const STRATEGIES: { id: AgentStrategy; name: string; description: string; risk: string }[] = [
    { id: 'momentum', name: 'Momentum', description: 'Follow price trends and momentum indicators', risk: 'Medium' },
    { id: 'mean_reversion', name: 'Mean Reversion', description: 'Trade against extremes, betting on return to average', risk: 'Low' },
    { id: 'arbitrage', name: 'Arbitrage', description: 'Exploit price differences across markets', risk: 'Low' },
    { id: 'market_maker', name: 'Market Maker', description: 'Provide liquidity on both sides of the book', risk: 'Medium' },
    { id: 'sentiment', name: 'Sentiment Analysis', description: 'Trade based on news and social sentiment', risk: 'High' },
];

// Mock data for demo
const mockAgents: TradingAgent[] = [
    { 
        id: 1, name: 'AlphaTrader_v3', strategy: 'momentum', creator: '0x1234...5678',
        totalVolume: '152345.67', profitLoss: '15234.56', winRate: 68.5, followers: 234,
        isActive: true, config: { maxPositionSize: '1000', maxDrawdown: '0.1', targetMarkets: ['crypto'], riskLevel: 'medium', autoRebalance: true, parameters: {} },
        createdAt: '2025-12-01T10:00:00Z'
    },
    { 
        id: 2, name: 'MomentumBot_9000', strategy: 'mean_reversion', creator: '0xabcd...efgh',
        totalVolume: '98765.43', profitLoss: '12012.89', winRate: 72.1, followers: 189,
        isActive: true, config: { maxPositionSize: '500', maxDrawdown: '0.05', targetMarkets: ['politics'], riskLevel: 'low', autoRebalance: false, parameters: {} },
        createdAt: '2025-11-15T10:00:00Z'
    },
    { 
        id: 3, name: 'ArbiGuppy', strategy: 'arbitrage', creator: '0x9876...1234',
        totalVolume: '456789.12', profitLoss: '9876.12', winRate: 89.3, followers: 567,
        isActive: true, config: { maxPositionSize: '2000', maxDrawdown: '0.02', targetMarkets: ['all'], riskLevel: 'low', autoRebalance: true, parameters: {} },
        createdAt: '2025-10-20T10:00:00Z'
    },
    { 
        id: 4, name: 'EventHorizon', strategy: 'sentiment', creator: '0xfedc...ba98',
        totalVolume: '67890.34', profitLoss: '7543.21', winRate: 61.2, followers: 145,
        isActive: true, config: { maxPositionSize: '750', maxDrawdown: '0.15', targetMarkets: ['culture', 'sports'], riskLevel: 'high', autoRebalance: false, parameters: {} },
        createdAt: '2025-09-10T10:00:00Z'
    },
];

// Agent Card Component
const AgentCard: React.FC<{ agent: TradingAgent; onFollow: () => void; isFollowing: boolean }> = ({ agent, onFollow, isFollowing }) => {
    const strategyInfo = STRATEGIES.find(s => s.id === agent.strategy);
    const pnl = parseFloat(agent.profitLoss);
    const isProfitable = pnl >= 0;

    return (
        <div className="bg-brand-surface border border-brand-border rounded-xl p-5 hover:border-brand-primary/50 transition-all duration-300 hover:shadow-glow-primary">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-brand-text">{agent.name}</h3>
                    <p className="text-xs text-brand-secondary">by {agent.creator}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    agent.config.riskLevel === 'low' ? 'bg-brand-yes/20 text-brand-yes' :
                    agent.config.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-brand-no/20 text-brand-no'
                }`}>
                    {agent.config.riskLevel.toUpperCase()} RISK
                </div>
            </div>
            
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-brand-surface-2 rounded text-xs text-brand-secondary">
                        {strategyInfo?.name || agent.strategy}
                    </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 py-3 border-t border-b border-brand-border">
                    <div className="text-center">
                        <div className={`text-lg font-bold ${isProfitable ? 'text-brand-yes' : 'text-brand-no'}`}>
                            {isProfitable ? '+' : ''}{pnl.toLocaleString()}
                        </div>
                        <div className="text-xs text-brand-secondary">P&L (USDC)</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-brand-text">{agent.winRate}%</div>
                        <div className="text-xs text-brand-secondary">Win Rate</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-brand-text">{agent.followers}</div>
                        <div className="text-xs text-brand-secondary">Followers</div>
                    </div>
                </div>
                
                <div className="flex items-center justify-between">
                    <span className="text-xs text-brand-secondary">
                        Vol: ${parseFloat(agent.totalVolume).toLocaleString()}
                    </span>
                    <button
                        onClick={onFollow}
                        disabled={isFollowing}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                            isFollowing 
                                ? 'bg-brand-surface-2 text-brand-secondary cursor-not-allowed'
                                : 'bg-brand-primary text-white hover:bg-brand-primary-hover'
                        }`}
                    >
                        {isFollowing ? 'Following' : 'Copy Trade'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const AgentHubPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('browse');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showFollowModal, setShowFollowModal] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<TradingAgent | null>(null);
    const [agentName, setAgentName] = useState('');
    const [agentStrategy, setAgentStrategy] = useState<AgentStrategy>('momentum');
    const [followAmount, setFollowAmount] = useState('');
    const [maxPositionSize, setMaxPositionSize] = useState('1000');
    const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
    const [deployedAgents, setDeployedAgents] = useState<TradingAgent[]>([]);
    const [followedAgents, setFollowedAgents] = useState<{ agentId: number; allocation: string }[]>([]);
    const [agents] = useState<TradingAgent[]>(mockAgents);

    const handleFollow = (agent: TradingAgent) => {
        setSelectedAgent(agent);
        setShowFollowModal(true);
    };

    const confirmFollow = () => {
        if (selectedAgent && followAmount) {
            setFollowedAgents([...followedAgents, { 
                agentId: selectedAgent.id, 
                allocation: followAmount 
            }]);
            setFollowAmount('');
            setShowFollowModal(false);
            setSelectedAgent(null);
        }
    };

    const handleCreateAgent = () => {
        if (agentName && agentStrategy) {
            const newAgent: TradingAgent = {
                id: Date.now(),
                name: agentName,
                strategy: agentStrategy,
                creator: '0xYou',
                totalVolume: '0',
                profitLoss: '0',
                winRate: 0,
                followers: 0,
                isActive: true,
                config: {
                    maxPositionSize,
                    maxDrawdown: '0.1',
                    targetMarkets: [],
                    riskLevel,
                    autoRebalance: true,
                    parameters: {}
                },
                createdAt: new Date().toISOString()
            };
            setDeployedAgents([...deployedAgents, newAgent]);
            setAgentName('');
            setAgentStrategy('momentum');
            setShowCreateModal(false);
        }
    };

    return (
        <div className="space-y-10 animate-fadeIn">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-brand-text">AI Agent Hub</h1>
                <p className="mt-2 text-brand-secondary">Deploy autonomous trading agents or copy trade the best performers.</p>
            </div>
            
            {/* Stats Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-brand-surface border border-brand-border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-brand-text">{agents.length + deployedAgents.length}</div>
                    <div className="text-xs text-brand-secondary">Active Agents</div>
                </div>
                <div className="bg-brand-surface border border-brand-border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-brand-yes">$44,666</div>
                    <div className="text-xs text-brand-secondary">Total P&L</div>
                </div>
                <div className="bg-brand-surface border border-brand-border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-brand-text">1,135</div>
                    <div className="text-xs text-brand-secondary">Total Followers</div>
                </div>
                <div className="bg-brand-surface border border-brand-border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-brand-text">51,454</div>
                    <div className="text-xs text-brand-secondary">Total Trades</div>
                </div>
            </div>
            
            {/* Tabs */}
            <div className="border-b border-brand-border">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {[
                        { id: 'browse', name: 'Browse Agents' },
                        { id: 'following', name: 'Following' },
                        { id: 'my-agents', name: 'My Agents' },
                        { id: 'docs', name: 'Documentation' },
                        { id: 'leaderboard', name: 'Leaderboard' },
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)} 
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === tab.id 
                                    ? 'border-brand-primary text-brand-primary' 
                                    : 'border-transparent text-brand-secondary hover:text-brand-text hover:border-gray-500'
                            }`}
                        >
                            {tab.name}
                            {tab.id === 'following' && followedAgents.length > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-brand-primary text-white text-xs rounded-full">
                                    {followedAgents.length}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div>
                {/* Browse Agents */}
                {activeTab === 'browse' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl text-brand-text font-bold">Top Performing Agents</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {agents.map(agent => (
                                <AgentCard
                                    key={agent.id}
                                    agent={agent}
                                    onFollow={() => handleFollow(agent)}
                                    isFollowing={followedAgents.some(f => f.agentId === agent.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Following */}
                {activeTab === 'following' && (
                    <div className="space-y-6">
                        <h2 className="text-xl text-brand-text font-bold">Agents You're Following</h2>
                        {followedAgents.length === 0 ? (
                            <div className="bg-brand-surface border border-brand-border rounded-lg p-8 text-center">
                                <p className="text-brand-secondary mb-4">Not following any agents. Browse and start copy trading!</p>
                                <button onClick={() => setActiveTab('browse')} className="px-6 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-primary-hover">Browse Agents</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {followedAgents.map(followed => {
                                    const agent = agents.find(a => a.id === followed.agentId);
                                    if (!agent) return null;
                                    return (
                                        <div key={followed.agentId} className="bg-brand-surface border border-brand-border rounded-xl p-5">
                                            <h3 className="text-lg font-bold text-brand-text">{agent.name}</h3>
                                            <p className="text-xs text-brand-secondary">Allocation: ${followed.allocation}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* My Agents */}
                {activeTab === 'my-agents' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl text-brand-text font-bold">My Deployed Agents</h2>
                            <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-primary-hover">+ Create Agent</button>
                        </div>
                        {deployedAgents.length === 0 ? (
                            <div className="bg-brand-surface border border-brand-border rounded-lg p-8 text-center">
                                <p className="text-brand-secondary mb-4">No agents deployed yet. Create your first agent!</p>
                                <button onClick={() => setShowCreateModal(true)} className="px-6 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-primary-hover">Create Agent</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {deployedAgents.map(agent => (
                                    <AgentCard key={agent.id} agent={agent} onFollow={() => {}} isFollowing={false} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
                
                {/* Documentation */}
                {activeTab === 'docs' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl text-brand-text font-bold">API Documentation</h2>
                        <p className="text-brand-secondary">Interact with Chronos programmatically via GraphQL.</p>
                        <div>
                            <h3 className="text-lg text-brand-text font-semibold mb-2">Create Trading Agent</h3>
                            <CodeBlock>{`mutation CreateAgent($name: String!, $strategy: String!, $config: String!) {
    createAgent(name: $name, strategy: $strategy, config: $config)
}`}</CodeBlock>
                        </div>
                        <div>
                            <h3 className="text-lg text-brand-text font-semibold mb-2">Follow Agent (Copy Trading)</h3>
                            <CodeBlock>{`mutation FollowAgent($agentId: Int!, $amount: String!) {
    followAgent(agentId: $agentId, amount: $amount)
}`}</CodeBlock>
                        </div>
                    </div>
                )}

                {/* Leaderboard */}
                {activeTab === 'leaderboard' && (
                    <div>
                        <h2 className="text-2xl text-brand-text font-bold mb-4">Agent Leaderboard</h2>
                        <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-brand-surface-2 text-xs text-brand-secondary uppercase">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Rank</th>
                                        <th className="px-6 py-3 font-semibold">Agent</th>
                                        <th className="px-6 py-3 text-right font-semibold">P&L</th>
                                        <th className="px-6 py-3 text-right font-semibold">Win Rate</th>
                                        <th className="px-6 py-3 text-right font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agents.map((agent, idx) => (
                                        <tr key={agent.id} className="border-b border-brand-border hover:bg-brand-surface-2">
                                            <td className="px-6 py-4 font-bold text-brand-text">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</td>
                                            <td className="px-6 py-4 font-mono text-brand-text">{agent.name}</td>
                                            <td className="px-6 py-4 text-right text-brand-yes">+${parseFloat(agent.profitLoss).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-brand-text">{agent.winRate}%</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleFollow(agent)} disabled={followedAgents.some(f => f.agentId === agent.id)} className="px-3 py-1 bg-brand-primary text-white text-xs rounded hover:bg-brand-primary-hover disabled:opacity-50">
                                                    {followedAgents.some(f => f.agentId === agent.id) ? 'Following' : 'Follow'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Create Agent Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-brand-surface border border-brand-border rounded-lg p-6 max-w-lg w-full mx-4">
                        <h3 className="text-lg font-bold text-brand-text mb-4">Create AI Trading Agent</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-brand-secondary mb-1">Agent Name</label>
                                <input type="text" placeholder="e.g., MyMomentumBot" value={agentName} onChange={(e) => setAgentName(e.target.value)} className="w-full p-3 bg-brand-surface-2 border border-brand-border rounded-lg text-brand-text" />
                            </div>
                            <div>
                                <label className="block text-sm text-brand-secondary mb-1">Strategy</label>
                                <select value={agentStrategy} onChange={(e) => setAgentStrategy(e.target.value as AgentStrategy)} className="w-full p-3 bg-brand-surface-2 border border-brand-border rounded-lg text-brand-text">
                                    {STRATEGIES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-brand-secondary mb-1">Max Position Size (USDC)</label>
                                <input type="number" placeholder="1000" value={maxPositionSize} onChange={(e) => setMaxPositionSize(e.target.value)} className="w-full p-3 bg-brand-surface-2 border border-brand-border rounded-lg text-brand-text" />
                            </div>
                            <div>
                                <label className="block text-sm text-brand-secondary mb-1">Risk Level</label>
                                <div className="flex gap-2">
                                    {(['low', 'medium', 'high'] as const).map(level => (
                                        <button key={level} onClick={() => setRiskLevel(level)} className={`flex-1 py-2 rounded-lg font-semibold text-sm ${riskLevel === level ? (level === 'low' ? 'bg-brand-yes text-white' : level === 'medium' ? 'bg-yellow-500 text-white' : 'bg-brand-no text-white') : 'bg-brand-surface-2 text-brand-secondary'}`}>
                                            {level.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-brand-surface-2 text-brand-text rounded-lg hover:bg-brand-border">Cancel</button>
                            <button onClick={handleCreateAgent} disabled={!agentName} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover disabled:opacity-50">Deploy Agent</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Follow Agent Modal */}
            {showFollowModal && selectedAgent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-brand-surface border border-brand-border rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-brand-text mb-2">Copy Trade: {selectedAgent.name}</h3>
                        <p className="text-sm text-brand-secondary mb-4">Allocate funds to copy this agent's trades automatically.</p>
                        <div className="bg-brand-surface-2 rounded-lg p-4 mb-4">
                            <div className="flex justify-between mb-2">
                                <span className="text-brand-secondary">Win Rate</span>
                                <span className="text-brand-text font-semibold">{selectedAgent.winRate}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-brand-secondary">Total P&L</span>
                                <span className="text-brand-yes font-semibold">+${parseFloat(selectedAgent.profitLoss).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm text-brand-secondary mb-1">Allocation (USDC)</label>
                            <input type="number" placeholder="100" value={followAmount} onChange={(e) => setFollowAmount(e.target.value)} className="w-full p-3 bg-brand-surface-2 border border-brand-border rounded-lg text-brand-text" />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowFollowModal(false); setSelectedAgent(null); }} className="flex-1 px-4 py-2 bg-brand-surface-2 text-brand-text rounded-lg hover:bg-brand-border">Cancel</button>
                            <button onClick={confirmFollow} disabled={!followAmount} className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover disabled:opacity-50">Start Copy Trading</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentHubPage;