import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChronosLogo, WalletIcon } from './icons';
import { useWallet } from '../contexts/WalletContext';

const Header: React.FC = () => {
    const location = useLocation();
    const { wallet, connect, disconnect, isLoading } = useWallet();

    const navItems = [
        { path: '/', label: 'Home' },
        { path: '/markets', label: 'Markets' },
        { path: '/create', label: 'Create Market' },
        { path: '/portfolio', label: 'Portfolio' },
        { path: '/agent-hub', label: 'Agent Hub' },
    ];

    return (
        <header className="bg-transparent backdrop-blur-md border-b border-brand-border/50 sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <Link to="/" className="flex items-center space-x-2 group">
                        <ChronosLogo className="w-8 h-8 text-brand-primary group-hover:animate-glow transition-all"/>
                        <h1 className="text-xl font-bold text-brand-text group-hover:text-brand-primary transition-colors">Chronos</h1>
                    </Link>
                    <nav className="hidden md:flex items-center space-x-1 bg-brand-surface/50 p-1 rounded-lg border border-brand-border">
                        {navItems.map(item => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    location.pathname === item.path
                                        ? 'bg-brand-surface text-brand-text'
                                        : 'text-brand-secondary hover:bg-brand-surface-2/50 hover:text-brand-text'
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                    <div className="flex items-center space-x-4">
                        {wallet.isConnected ? (
                            <div className="flex items-center space-x-3">
                                <div className="text-sm text-brand-secondary">
                                    {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                                </div>
                                <button 
                                    onClick={disconnect}
                                    className="px-3 py-1 text-sm text-brand-secondary hover:text-brand-text border border-brand-border rounded-md hover:bg-brand-surface transition-all"
                                >
                                    Disconnect
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={connect}
                                disabled={isLoading}
                                className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20 transform hover:scale-105 disabled:opacity-50"
                            >
                                <WalletIcon className="w-5 h-5" />
                                <span>{isLoading ? 'Connecting...' : 'Connect'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;