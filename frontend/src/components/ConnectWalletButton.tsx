import React from 'react';
import { useAppChain } from '../hooks/useAppChain';

export const ConnectWalletButton: React.FC = () => {
    const { connectWallet, account, isLoading, error, isOnCorrectChain } = useAppChain();

    if (account) {
        return (
            <div className="text-center">
                <p className="text-sm text-brand-green truncate">Connected: {account.substring(0,6)}...{account.substring(account.length - 4)}</p>
                {!isOnCorrectChain && error && (
                    <p className="text-xs text-red-500 mt-1">{error}</p>
                )}
            </div>
        );
    }

    return (
        <div className="text-center">
            <button
                onClick={connectWallet}
                disabled={isLoading}
                className="px-8 py-3 bg-brand-green hover:bg-brand-green-dark text-brand-dark font-heading font-bold rounded-lg shadow-md transition-colors duration-150 ease-in-out disabled:opacity-50"
            >
                {isLoading ? 'Connecting...' : 'CONNECT WALLET'}
            </button>
            {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>
    );
};
