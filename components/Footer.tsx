import React from 'react';
import { Link } from 'react-router-dom';
import { ChronosLogo, TwitterIcon, DiscordIcon, GitHubIcon } from './icons';

const Footer: React.FC = () => {
    const navLinks = [
        { label: 'Markets', path: '/' },
        { label: 'Portfolio', path: '/portfolio' },
        { label: 'Create Market', path: '/create' },
        { label: 'Agent Hub', path: '/agent-hub' },
    ];

    const socialLinks = [
        { Icon: TwitterIcon, path: '#' },
        { Icon: DiscordIcon, path: '#' },
        { Icon: GitHubIcon, path: '#' },
    ];

    return (
        <footer className="bg-brand-surface/50 border-t border-brand-border mt-auto z-10 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                    {/* Branding Section */}
                    <div className="space-y-4">
                        <Link to="/" className="flex items-center space-x-2 justify-center md:justify-start group">
                            <ChronosLogo className="w-8 h-8 text-brand-primary" />
                            <h1 className="text-xl font-bold text-brand-text">Chronos</h1>
                        </Link>
                        <p className="text-sm text-brand-secondary max-w-xs mx-auto md:mx-0">
                            High-frequency prediction markets on the Linera protocol. Trade the future, faster.
                        </p>
                    </div>

                    {/* Links Section */}
                    <div className="md:col-span-1 md:justify-self-center">
                        <h3 className="font-semibold text-brand-text mb-4">Quick Links</h3>
                        <ul className="space-y-2">
                            {navLinks.map(link => (
                                <li key={link.path}>
                                    <Link to={link.path} className="text-sm text-brand-secondary hover:text-brand-primary transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Socials & Disclaimer */}
                    <div className="md:col-span-1 md:justify-self-end">
                         <h3 className="font-semibold text-brand-text mb-4">Join the Community</h3>
                         <div className="flex justify-center md:justify-start space-x-4 mb-4">
                            {socialLinks.map((social, index) => (
                                <a key={index} href={social.path} target="_blank" rel="noopener noreferrer" className="text-brand-secondary hover:text-brand-primary transition-colors">
                                    <social.Icon className="w-6 h-6" />
                                </a>
                            ))}
                        </div>
                        <p className="text-xs text-brand-secondary/70">
                            Chronos is a decentralized protocol. All markets are created and resolved by the community. Trade responsibly.
                        </p>
                    </div>
                </div>
                <div className="border-t border-brand-border mt-8 pt-4 text-center text-xs text-brand-secondary">
                    &copy; {new Date().getFullYear()} Chronos Markets. All rights reserved.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
