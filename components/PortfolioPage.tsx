import React, { useState, useEffect } from 'react';
import { getPortfolio } from '../services/mockApi';
import { Position, ResolvedMarket, ShareType } from '../types';

interface PortfolioData {
    summary: {
        totalValue: number;
        totalPL: number;
        availableFunds: number;
    };
    positions: Position[];
    resolved: ResolvedMarket[];
}

const PortfolioPage: React.FC = () => {
    const [data, setData] = useState<PortfolioData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPortfolio = async () => {
            setLoading(true);
            const portfolioData = await getPortfolio();
            setData(portfolioData as PortfolioData);
            setLoading(false);
        };
        fetchPortfolio();
    }, []);
    
    const PLColor = (pl: number) => pl >= 0 ? 'text-brand-yes' : 'text-brand-danger';

    if (loading || !data) {
        return <div className="text-center p-10">Loading portfolio...</div>;
    }

    return (
        <div className="space-y-10 animate-fadeIn">
            <div>
                <h1 className="text-3xl font-bold text-brand-text">My Portfolio</h1>
            </div>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-brand-surface border border-brand-border rounded-lg p-6">
                    <div className="text-sm text-brand-secondary">Total Portfolio Value</div>
                    <div className="text-3xl font-bold text-brand-text mt-2">${data.summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-brand-surface border border-brand-border rounded-lg p-6">
                    <div className="text-sm text-brand-secondary">Total P/L</div>
                    <div className={`text-3xl font-bold mt-2 ${PLColor(data.summary.totalPL)}`}>
                        {data.summary.totalPL >= 0 ? '+' : ''}${data.summary.totalPL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="bg-brand-surface border border-brand-border rounded-lg p-6">
                    <div className="text-sm text-brand-secondary">Available Funds (USDC)</div>
                    <div className="text-3xl font-bold text-brand-text mt-2">${data.summary.availableFunds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-brand-text mb-4">Active Positions</h2>
                 <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-brand-surface-2 text-xs text-brand-secondary uppercase">
                                <tr>
                                    <th scope="col" className="px-6 py-3 font-semibold">Market</th>
                                    <th scope="col" className="px-6 py-3 text-center font-semibold">Shares</th>
                                    <th scope="col" className="px-6 py-3 text-right font-semibold">Avg Cost</th>
                                    <th scope="col" className="px-6 py-3 text-right font-semibold">Current Value</th>
                                    <th scope="col" className="px-6 py-3 text-right font-semibold">Unrealized P/L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.positions.map(pos => (
                                    <tr key={pos.marketId} className="border-b border-brand-border last:border-b-0 hover:bg-brand-surface-2 transition-colors">
                                        <td className="px-6 py-4 font-medium text-brand-text">{pos.marketQuestion}</td>
                                        <td className={`px-6 py-4 text-center font-bold ${pos.shareType === ShareType.YES ? 'text-brand-yes' : 'text-brand-no'}`}>
                                            {pos.shares} {pos.shareType}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-brand-secondary">${pos.avgCost.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-mono text-brand-text">${pos.currentValue.toFixed(2)}</td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold ${PLColor(pos.unrealizedPL)}`}>
                                            {pos.unrealizedPL >= 0 ? '+' : ''}${pos.unrealizedPL.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-brand-text mb-4">Resolved Markets</h2>
                 <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-brand-surface-2 text-xs text-brand-secondary uppercase">
                                <tr>
                                    <th scope="col" className="px-6 py-3 font-semibold">Market</th>
                                    <th scope="col" className="px-6 py-3 text-center font-semibold">Outcome</th>
                                    <th scope="col" className="px-6 py-3 text-right font-semibold">Realized P/L</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.resolved.map(res => (
                                     <tr key={res.marketId} className="border-b border-brand-border last:border-b-0 hover:bg-brand-surface-2 transition-colors">
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
                </div>
            </section>
        </div>
    );
};

export default PortfolioPage;