import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMarket, isApplicationConnected } from '../services/marketService';
import { useWallet } from '../contexts/WalletContext';

const CreateMarketPage: React.FC = () => {
    const navigate = useNavigate();
    const { wallet } = useWallet();
    
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [marketData, setMarketData] = useState({
        question: '',
        endDate: '',
        endTime: '',
        oracle: 'Chainlink',
        details: '',
        liquidity: ''
    });

    const handleNext = () => setStep(s => Math.min(s + 1, 4));
    const handlePrev = () => setStep(s => Math.max(s - 1, 1));
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setMarketData({ ...marketData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        // Validate data
        if (!marketData.question.trim()) {
            setError('Please enter a question');
            return;
        }
        if (!marketData.endDate || !marketData.endTime) {
            setError('Please set an end date and time');
            return;
        }
        if (!marketData.liquidity || parseFloat(marketData.liquidity) <= 0) {
            setError('Please provide initial liquidity');
            return;
        }

        // Check wallet connection
        if (!wallet.isConnected) {
            setError('Please connect your wallet first');
            return;
        }

        // Check application connection
        if (!isApplicationConnected()) {
            setError('Application not connected. Please reconnect your wallet.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Convert date/time to Unix timestamp
            const endDateTime = new Date(`${marketData.endDate}T${marketData.endTime}`);
            const endTimeUnix = Math.floor(endDateTime.getTime() / 1000);

            // Determine category based on oracle or default
            const categories = [marketData.oracle || 'General'];

            console.log('📝 Creating market on blockchain:', {
                question: marketData.question,
                categories,
                endTime: endTimeUnix,
                initialLiquidity: marketData.liquidity
            });

            // Call blockchain via marketService
            const result = await createMarket({
                question: marketData.question,
                categories,
                endTime: endTimeUnix,
                initialLiquidity: marketData.liquidity
            });

            if (result.success) {
                console.log('✅ Market created successfully! ID:', result.marketId);
                
                // Show success message
                alert(`🎉 Market created successfully on Linera blockchain!\n\nMarket ID: ${result.marketId}\n\nRedirecting to markets page...`);
                
                // Navigate to markets page
                navigate('/markets');
            } else {
                throw new Error(result.error || 'Failed to create market');
            }
        } catch (err) {
            console.error('❌ Failed to create market:', err);
            setError(err instanceof Error ? err.message : 'Failed to create market. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h2 className="text-xl font-bold text-brand-text mb-4">The Question</h2>
                        <p className="text-sm text-brand-secondary mb-4">Enter a clear, binary (YES/NO) question for your market.</p>
                        <textarea name="question" value={marketData.question} onChange={handleChange} className="w-full bg-brand-surface-2 p-3 rounded-md border border-brand-border focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary h-24" placeholder="e.g., Will an Ethereum spot ETF be approved by July 26, 2024?" />
                    </div>
                );
            case 2:
                return (
                    <div>
                        <h2 className="text-xl font-bold text-brand-text mb-4">Resolution Details</h2>
                        <div className="space-y-4">
                             <div>
                                <label className="text-sm text-brand-secondary block mb-1">End Date & Time</label>
                                <div className="flex gap-4">
                                    <input type="date" name="endDate" value={marketData.endDate} onChange={handleChange} className="w-full bg-brand-surface-2 p-3 rounded-md border border-brand-border focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary" />
                                    <input type="time" name="endTime" value={marketData.endTime} onChange={handleChange} className="w-full bg-brand-surface-2 p-3 rounded-md border border-brand-border focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-brand-secondary block mb-1">Resolution Source (Oracle)</label>
                                <select name="oracle" value={marketData.oracle} onChange={handleChange} className="w-full bg-brand-surface-2 p-3 rounded-md border border-brand-border focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary">
                                    <option>UMA</option>
                                    <option>Chainlink</option>
                                    <option>Project-Specific Oracle</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-brand-secondary block mb-1">Detailed Criteria for "YES" Outcome</label>
                                <textarea name="details" value={marketData.details} onChange={handleChange} className="w-full bg-brand-surface-2 p-3 rounded-md border border-brand-border focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary h-32" placeholder="Describe the exact conditions that will resolve this market to YES." />
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                     <div>
                        <h2 className="text-xl font-bold text-brand-text mb-4">Provide Initial Liquidity</h2>
                        <p className="text-sm text-brand-secondary mb-4">Bootstrap the market's liquidity pool. This helps create a fair initial price.</p>
                        <input type="number" name="liquidity" value={marketData.liquidity} onChange={handleChange} className="w-full bg-brand-surface-2 p-3 rounded-md border border-brand-border focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary" placeholder="Enter USDC amount" />
                    </div>
                );
            case 4:
                return (
                     <div>
                        <h2 className="text-xl font-bold text-brand-text mb-4">Review & Submit</h2>
                        <div className="space-y-4 text-sm bg-brand-surface-2 p-4 rounded-lg border border-brand-border">
                            <p><strong className="text-brand-secondary">Question:</strong> <span className="text-brand-text">{marketData.question || 'Not set'}</span></p>
                            <p><strong className="text-brand-secondary">Ends:</strong> <span className="text-brand-text">{marketData.endDate || 'Not set'} at {marketData.endTime || 'Not set'}</span></p>
                            <p><strong className="text-brand-secondary">Oracle:</strong> <span className="text-brand-text">{marketData.oracle}</span></p>
                             <p><strong className="text-brand-secondary">Liquidity:</strong> <span className="text-brand-text">${parseFloat(marketData.liquidity).toLocaleString() || '0'} USDC</span></p>
                             <p className="text-brand-secondary">Details:</p>
                            <p className="text-brand-text whitespace-pre-wrap p-2 bg-brand-bg rounded">{marketData.details || 'Not set'}</p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="max-w-2xl mx-auto animate-fadeIn">
            <h1 className="text-3xl font-bold text-brand-text text-center mb-8">Create a New Market</h1>

            <div className="flex justify-between items-center mb-6">
                {[1, 2, 3, 4].map(num => (
                    <React.Fragment key={num}>
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all ${step >= num ? 'bg-brand-primary border-brand-primary text-white' : 'bg-brand-surface border-brand-border text-brand-secondary'}`}>
                                {num}
                            </div>
                            <span className={`text-xs mt-2 w-20 ${step >= num ? 'text-brand-text' : 'text-brand-secondary'}`}>{['Question', 'Details', 'Liquidity', 'Review'][num-1]}</span>
                        </div>
                        {num < 4 && <div className={`flex-grow h-0.5 mx-2 transition-colors ${step > num ? 'bg-brand-primary' : 'bg-brand-border'}`}></div>}
                    </React.Fragment>
                ))}
            </div>

            <div className="bg-brand-surface border border-brand-border rounded-lg p-8 min-h-[300px]">
                {renderStep()}
                
                {/* Error message */}
                {error && (
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
                        ⚠️ {error}
                    </div>
                )}
                
                {/* Wallet warning */}
                {step === 4 && !wallet.isConnected && (
                    <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg text-yellow-400 text-sm">
                        ⚠️ Please connect your wallet to create a market
                    </div>
                )}
            </div>
            
            <div className="flex justify-between mt-8">
                <button onClick={handlePrev} disabled={step === 1} className="px-6 py-2 rounded-lg bg-brand-surface-2 border border-brand-border disabled:opacity-50 hover:bg-brand-border text-brand-text">Back</button>
                {step < 4 && <button onClick={handleNext} className="px-6 py-2 rounded-lg bg-brand-primary text-white hover:bg-brand-primary-hover font-semibold">Next</button>}
                {step === 4 && (
                    <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting || !wallet.isConnected}
                        className="px-6 py-2 rounded-lg bg-brand-success text-white hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Creating...
                            </>
                        ) : (
                            'Submit & Deploy'
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default CreateMarketPage;