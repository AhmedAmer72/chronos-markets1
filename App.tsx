
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './components/HomePage';
import MarketsPage from './components/MarketsPage';
import MarketPage from './components/MarketPage';
import PortfolioPage from './components/PortfolioPage';
import CreateMarketPage from './components/CreateMarketPage';
import AgentHubPage from './components/AgentHubPage';

const AnimatedBackground: React.FC = () => (
    <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden bg-brand-bg">
        <div 
            className="absolute inset-0 opacity-20 animate-grid-pan"
            style={{
                backgroundImage: `
                    radial-gradient(circle at 20% 20%, rgba(35, 134, 54, 0.3), transparent 25%),
                    radial-gradient(circle at 80% 70%, rgba(35, 134, 54, 0.2), transparent 25%),
                    linear-gradient(to right, rgba(48, 54, 61, 0.5) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(48, 54, 61, 0.5) 1px, transparent 1px)
                `,
                backgroundSize: '2.5rem 2.5rem, 2.5rem 2.5rem, 2.5rem 2.5rem, 2.5rem 2.5rem',
            }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-brand-bg via-brand-bg/80 to-brand-bg"></div>
    </div>
);


const App: React.FC = () => {
    return (
        <WalletProvider>
            <HashRouter>
                <div className="min-h-screen flex flex-col relative">
                    <AnimatedBackground />
                    <Header />
                    <main className="flex-grow container mx-auto px-4 py-8 z-10">
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/markets" element={<MarketsPage />} />
                            <Route path="/market/:id" element={<MarketPage />} />
                            <Route path="/portfolio" element={<PortfolioPage />} />
                            <Route path="/create" element={<CreateMarketPage />} />
                            <Route path="/agent-hub" element={<AgentHubPage />} />
                        </Routes>
                    </main>
                    <Footer />
                </div>
            </HashRouter>
        </WalletProvider>
    );
};

export default App;