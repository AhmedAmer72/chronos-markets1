import React, { useState } from 'react';

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <pre className="bg-brand-surface-2 p-4 rounded-lg border border-brand-border text-sm overflow-x-auto">
        <code className="language-rust font-mono">{children}</code>
    </pre>
);

const AgentHubPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('agents');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [agentName, setAgentName] = useState('');
    const [agentStrategy, setAgentStrategy] = useState('');
    const [deployedAgents, setDeployedAgents] = useState<{name: string, strategy: string, status: string}[]>([]);
    
    const agents = [
        { name: 'AlphaTrader_v3', pnl: 15234.56, trades: 12045, rank: 1 },
        { name: 'MomentumBot_9000', pnl: 12012.89, trades: 8901, rank: 2 },
        { name: 'ArbiGuppy', pnl: 9876.12, trades: 25034, rank: 3 },
        { name: 'EventHorizon', pnl: 7543.21, trades: 5432, rank: 4 },
    ];

    return (
        <div className="space-y-10 animate-fadeIn">
            <div>
                <h1 className="text-3xl font-bold text-brand-text">Agent Hub</h1>
                <p className="mt-2 text-brand-secondary">A protocol for autonomous agents. Deploy, manage, and compete.</p>
            </div>
            
            <div className="border-b border-brand-border">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('agents')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'agents' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-secondary hover:text-brand-text hover:border-gray-500'}`}>My Agents</button>
                    <button onClick={() => setActiveTab('docs')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'docs' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-secondary hover:text-brand-text hover:border-gray-500'}`}>API Documentation</button>
                    <button onClick={() => setActiveTab('leaderboard')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'leaderboard' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-secondary hover:text-brand-text hover:border-gray-500'}`}>Leaderboard</button>
                </nav>
            </div>

            <div>
                {activeTab === 'agents' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl text-brand-text font-bold">My Agents</h2>
                            <button 
                                onClick={() => setShowCreateModal(true)}
                                className="px-4 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-primary-hover"
                            >
                                Deploy New Agent
                            </button>
                        </div>
                        {deployedAgents.length === 0 ? (
                            <div className="bg-brand-surface border border-brand-border rounded-lg p-8 text-center">
                                <h3 className="text-lg text-brand-text font-semibold mb-2">No agents deployed yet</h3>
                                <p className="text-brand-secondary mb-4">Deploy your first autonomous trading agent to get started.</p>
                                <button 
                                    onClick={() => setShowCreateModal(true)}
                                    className="px-6 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-primary-hover"
                                >
                                    Create Agent
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {deployedAgents.map((agent, index) => (
                                    <div key={index} className="bg-brand-surface border border-brand-border rounded-lg p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-lg font-semibold text-brand-text">{agent.name}</h4>
                                                <p className="text-brand-secondary text-sm mt-1">{agent.strategy}</p>
                                            </div>
                                            <span className="px-2 py-1 bg-brand-yes text-white text-xs rounded-full">{agent.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'docs' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl text-brand-text font-bold">API Documentation</h2>
                        <p className="text-brand-secondary">Interact with Chronos programmatically via GraphQL and the Linera client.</p>
                        <div>
                            <h3 className="text-lg text-brand-text font-semibold mb-2">Place an Order (Pseudo-code)</h3>
                             <CodeBlock>{`
// In orderbook_contract.rs
// This contract runs on each parallel Orderbook Chain.
#[contract]
impl Orderbook {
    // Called when a PlaceOrder message arrives from a user chain.
    async fn execute_message(&mut self, message: Message) {
        match message {
            Message::PlaceOrder { owner, order_type, price, amount } => {
                // 1. Matching logic: Check for crossing orders in bids and asks.
                let (filled_amount, matches) = self.match_orders(order_type, price, amount);

                // 2. For each match, send messages to the involved parties.
                for match in matches {
                    self.send_fill_confirmation(match.taker, match.maker, match.amount);
                }

                // 3. If order is not fully filled, add remainder to the book.
                if filled_amount < amount {
                    self.add_to_book(order_type, price, amount - filled_amount);
                }

                // 4. Send a state update to the Resolver Chain.
                let update_message = ResolverMessage::PriceUpdate { new_price: self.get_mid_price() };
                self.runtime.prepare_message(update_message).send_to(self.state.resolver_chain_id);
            }
        }
    }
}
`}</CodeBlock>
                        </div>
                         <div>
                            <h3 className="text-lg text-brand-text font-semibold mb-2">Query Market State (GraphQL)</h3>
                             <CodeBlock>{`
query GetMarketState($marketId: ID!) {
  market(id: $marketId) {
    question
    lastPrice
    totalVolume
    orderbook {
      bids { price, size }
      asks { price, size }
    }
  }
}
`}</CodeBlock>
                        </div>
                    </div>
                )}

                {activeTab === 'leaderboard' && (
                     <div>
                        <h2 className="text-2xl text-brand-text font-bold mb-4">Agent Leaderboard</h2>
                        <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-brand-surface-2 text-xs text-brand-secondary uppercase">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 font-semibold">Rank</th>
                                        <th scope="col" className="px-6 py-3 font-semibold">Agent Name</th>
                                        <th scope="col" className="px-6 py-3 text-right font-semibold">Total P/L (USDC)</th>
                                        <th scope="col" className="px-6 py-3 text-right font-semibold">Trades</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agents.map(agent => (
                                        <tr key={agent.rank} className="border-b border-brand-border last:border-b-0 hover:bg-brand-surface-2 transition-colors">
                                            <td className="px-6 py-4 font-bold text-brand-text text-lg">{agent.rank}</td>
                                            <td className="px-6 py-4 font-mono text-brand-text">{agent.name}</td>
                                            <td className="px-6 py-4 font-mono text-right text-brand-yes">${agent.pnl.toLocaleString()}</td>
                                            <td className="px-6 py-4 font-mono text-right text-brand-secondary">{agent.trades.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-brand-surface border border-brand-border rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-brand-text mb-4">Create New Agent</h3>
                        <div className="space-y-4">
                            <input 
                                type="text" 
                                placeholder="Agent Name" 
                                value={agentName}
                                onChange={(e) => setAgentName(e.target.value)}
                                className="w-full p-3 bg-brand-surface-2 border border-brand-border rounded-lg text-brand-text"
                            />
                            <textarea 
                                placeholder="Agent Strategy Description" 
                                value={agentStrategy}
                                onChange={(e) => setAgentStrategy(e.target.value)}
                                className="w-full p-3 bg-brand-surface-2 border border-brand-border rounded-lg text-brand-text h-24"
                            />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2 bg-brand-surface-2 text-brand-text rounded-lg hover:bg-brand-border"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    if (agentName && agentStrategy) {
                                        setDeployedAgents([...deployedAgents, {
                                            name: agentName,
                                            strategy: agentStrategy,
                                            status: 'Active'
                                        }]);
                                        setAgentName('');
                                        setAgentStrategy('');
                                        setShowCreateModal(false);
                                    }
                                }}
                                disabled={!agentName || !agentStrategy}
                                className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover disabled:opacity-50"
                            >
                                Deploy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentHubPage;