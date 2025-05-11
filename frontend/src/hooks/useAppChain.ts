import { useState, useEffect, useMemo } from 'react';
import { createPublicClient, http, createWalletClient, custom } from 'viem';
import type { PublicClient, WalletClient } from 'viem'; // Added Chain
import { ACTIVE_CHAIN } from '../config';

export function useAppChain() {
    const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
    const [publicClient, setPublicClient] = useState<PublicClient | null>(null);
    const [account, setAccount] = useState<`0x${string}` | null>(null);
    const [chainId, setChainId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false); // For connectWallet action
    const [isInitializing, setIsInitializing] = useState<boolean>(true); // For initial page load check

    // Helper to create wallet client and fetch chainId
    const setupWalletClientAndChainId = async (ethProvider: any): Promise<{ wc: WalletClient, currentChainId: number } | null> => {
        try {
            const wc = createWalletClient({
                chain: ACTIVE_CHAIN, // Configure for the app's target chain
                transport: custom(ethProvider),
            });
            const currentChainId = await wc.getChainId();
            return { wc, currentChainId };
        } catch (err) {
            console.warn("Error setting up wallet client or fetching chain ID:", err);
            return null;
        }
    };


    useEffect(() => {
        setIsInitializing(true);
        setPublicClient(createPublicClient({
            chain: ACTIVE_CHAIN,
            transport: http(),
        }));

        if (window.ethereum) {
            const handleInitialConnection = async () => {
                try {
                    // Check if already permitted (e.g., EIP-6963 or previous connection)
                    const initialWcForAddresses = createWalletClient({ transport: custom(window.ethereum) });
                    const addresses = await initialWcForAddresses.getAddresses();

                    if (addresses.length > 0) {
                        const setup = await setupWalletClientAndChainId(window.ethereum);
                        if (setup) {
                            setAccount(addresses[0]);
                            setWalletClient(setup.wc);
                            setChainId(setup.currentChainId);
                            if (setup.currentChainId !== ACTIVE_CHAIN.id) {
                                setError(`Please connect to the ${ACTIVE_CHAIN.name} network.`);
                            } else {
                                setError(null);
                            }
                        }
                    } else {
                        // Not connected or no permissions yet
                        setAccount(null);
                        setWalletClient(null);
                        setChainId(null);
                    }
                } catch (err) {
                    console.warn("Error during initial wallet check:", err);
                    setAccount(null);
                    setWalletClient(null);
                    setChainId(null);
                } finally {
                    setIsInitializing(false);
                }
            };
            handleInitialConnection();

            const handleAccountsChanged = async (accounts: string[]) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0] as `0x${string}`);
                    const setup = await setupWalletClientAndChainId(window.ethereum);
                    if (setup) {
                        setWalletClient(setup.wc);
                        setChainId(setup.currentChainId);
                        if (setup.currentChainId !== ACTIVE_CHAIN.id) {
                            setError(`Please connect to the ${ACTIVE_CHAIN.name} network.`);
                        } else {
                            setError(null);
                        }
                    }
                } else {
                    setAccount(null);
                    setWalletClient(null);
                    setChainId(null);
                    setError(null);
                }
            };

            const handleChainChanged = (newChainIdHex: string) => {
                const newChainId = parseInt(newChainIdHex, 16);
                setChainId(newChainId);
                if (newChainId !== ACTIVE_CHAIN.id) {
                    setError(`Please connect to the ${ACTIVE_CHAIN.name} network.`);
                } else {
                    setError(null);
                }
                // Re-create wallet client, still configured for ACTIVE_CHAIN,
                // as the app logic depends on it. The error state handles UI for wrong network.
                if (window.ethereum && account) { // only if still connected
                     setupWalletClientAndChainId(window.ethereum).then(setup => {
                        if(setup) setWalletClient(setup.wc);
                     });
                }
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            return () => {
                window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
                window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
            };

        } else {
            setIsInitializing(false); // No ethereum provider
        }
    }, [account]); // Rerun effect if account changes to potentially re-init wallet client for new chain context from wallet

    const connectWallet = async () => {
        if (isLoading || isInitializing) return; // Prevent multiple connect attempts or during init

        setIsLoading(true);
        setError(null);
        setChainId(null); // CRITICAL: Reset chainId before attempting to connect

        if (window.ethereum) {
            try {
                // Request accounts first
                const wcForRequest = createWalletClient({ transport: custom(window.ethereum) });
                const addresses = await wcForRequest.requestAddresses();

                if (addresses.length > 0) {
                    setAccount(addresses[0]); // Set account

                    // Now setup wallet client for ACTIVE_CHAIN and get current chain ID
                    const setup = await setupWalletClientAndChainId(window.ethereum);
                    if (setup) {
                        setWalletClient(setup.wc);
                        setChainId(setup.currentChainId); // Set actual chainId

                        if (setup.currentChainId !== ACTIVE_CHAIN.id) {
                            setError(`Please connect to the ${ACTIVE_CHAIN.name} network.`);
                        } else {
                            setError(null); // Clear error if on correct chain
                        }
                    } else {
                        setError("Failed to setup wallet client after connecting.");
                        setAccount(null); // Rollback
                        setWalletClient(null);
                    }
                } else {
                     setError("No accounts found. Please ensure your wallet is set up.");
                     setAccount(null);
                     setWalletClient(null);
                }
            } catch (err: any) {
                console.error("Error connecting wallet:", err);
                setError(err.shortMessage || err.message || "Failed to connect wallet.");
                setAccount(null);
                setWalletClient(null);
                // chainId is already null
            }
        } else {
            setError("MetaMask (or other Ethereum wallet) not detected. Please install it.");
        }
        setIsLoading(false); // Set loading to false AFTER all async operations and state updates
    };

    const isConnected = useMemo(() => !!walletClient && !!account, [walletClient, account]);
    const isOnCorrectChain = useMemo(() => {
        return chainId !== null && chainId === ACTIVE_CHAIN.id;
    }, [chainId]);

    return {
        walletClient,
        publicClient,
        account,
        chainId,
        error,
        isLoading, // Use this for the connectWallet button's loading state
        isInitializing, // Use this for an initial page loading overlay/spinner if needed
        connectWallet,
        isConnected,
        isOnCorrectChain,
        targetChain: ACTIVE_CHAIN
    };
}
