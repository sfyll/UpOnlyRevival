import React, { useState, useEffect, useRef } from 'react';
import { useAppChain } from '../hooks/useAppChain';
import { usePoolContractData } from '../hooks/usePoolContractData';
import { POOL_CONTRACT_ADDRESS } from '../config';
import NftPoolAbi from '../abis/NftPoolAndTriggerBuy.json';
import { getSeaportOrderParameters, type BasicOrderParametersForEfficient } from '../services/seaportService';
import { parseEther } from 'viem';
import { ConnectWalletButton } from './ConnectWalletButton';

export const ContributeForm: React.FC = () => {
    const { walletClient, account, publicClient, isConnected, isOnCorrectChain } = useAppChain();
    const { poolData, refreshPoolData } = usePoolContractData(publicClient);
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const blockExplorerUrl = 'https://etherscan.io';
    const [legendsVisibility, setLegendsVisibility] = useState(0); // 0 (hidden) to 1 (fully visible)
    const joinCauseTextRef = useRef<HTMLHeadingElement>(null); // Ref for "JOIN THE CAUSE" text container
    const contributeButtonRef = useRef<HTMLButtonElement>(null); // Keep if needed for other purposes

    // Your working handleSubmit logic
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConnected || !walletClient || !account || !publicClient || !isOnCorrectChain) {
            setError("Please connect your wallet to the correct network.");
            return;
        }
        if (poolData.currentState !== 0) {
            setError("Contributions are not currently accepted (pool state is not 'Funding').");
            return;
        }
        const ethAmount = parseFloat(amount);
        if (isNaN(ethAmount) || ethAmount <= 0) {
            setError("Please enter a valid ETH amount greater than 0.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const seaportParams: BasicOrderParametersForEfficient = await getSeaportOrderParameters(POOL_CONTRACT_ADDRESS);
            const { request } = await publicClient.simulateContract({
                address: POOL_CONTRACT_ADDRESS,
                abi: NftPoolAbi.abi,
                functionName: 'contributeAndAttemptPurchase',
                args: [seaportParams],
                value: parseEther(amount as `${number}`),
                account: account,
            });
            const hash = await walletClient.writeContract(request);
            setSuccessMessage(`Transaction sent! Hash: ${hash}. Waiting for confirmation...`);
            await publicClient.waitForTransactionReceipt({ hash });
            setSuccessMessage(hash);
            setAmount('');

            await refreshPoolData();
        } catch (err: any) {
            console.error("Contribution error:", err);
             { setError(err.message || "An unexpected error occurred during contribution."); }
        } finally { setIsLoading(false); }
    };

    useEffect(() => {
        const handleScroll = () => {
            if (!joinCauseTextRef.current) return;

            const textContainerElement = joinCauseTextRef.current;
            const textContainerRect = textContainerElement.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Tune these thresholds to control when the animation happens:
            // Image is fully visible (visibility=1) when the TOP of "JOIN THE CAUSE" container is at 50% of viewport height.
            const fullyVisibleThreshold = windowHeight * 0.65;
            // Image starts appearing (visibility=0) when the TOP of "JOIN THE CAUSE" container is at 85% of viewport height.
            const startVisibleThreshold = windowHeight * 0.70;

            let currentVisibility = 0;
            if (textContainerRect.top <= fullyVisibleThreshold) {
                // Container is at or above the "fully visible" point (higher on screen)
                currentVisibility = 1;
            } else if (textContainerRect.top >= startVisibleThreshold) {
                // Container is at or below the "start visible" point (lower on screen)
                currentVisibility = 0;
            } else {
                // Container is between the thresholds, interpolate visibility.
                // As textContainerRect.top moves from startVisibleThreshold down to fullyVisibleThreshold,
                // visibility goes from 0 to 1.
                currentVisibility = (startVisibleThreshold - textContainerRect.top) / (startVisibleThreshold - fullyVisibleThreshold);
            }

            currentVisibility = Math.max(0, Math.min(1, currentVisibility));
            setLegendsVisibility(currentVisibility);

            // Fade out the actual "JOIN THE CAUSE" text (the span inside h3)
            const textSpanElement = textContainerElement.querySelector('span');
            if (textSpanElement) {
                // Start fading text when image is 10% visible, text gone when image is 60% visible.
                const textFadeStartVisibility = 0.1;
                const textFadeEndVisibility = 0.6;

                if (currentVisibility >= textFadeEndVisibility) {
                    textSpanElement.style.opacity = '0';
                } else if (currentVisibility > textFadeStartVisibility) {
                    const textOpacity = 1 - (currentVisibility - textFadeStartVisibility) / (textFadeEndVisibility - textFadeStartVisibility);
                    textSpanElement.style.opacity = Math.max(0, textOpacity).toString();
                } else {
                    textSpanElement.style.opacity = '1';
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Call on mount to set initial state

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []); // Empty dependency array: refs are stable, window is stable.


    return (
        <section id="contribute" className="pt-6 pb-0">
            <div className="container mx-auto px-6 max-w-lg text-center">
                {/* Wrapper for "JOIN THE CAUSE" text and the Easter Egg Image */}
                <div className="relative mb-3"> {/* This div is the positioning context */}
                    <h3
                        ref={joinCauseTextRef}
                        // This h3 now acts as the container defining the space for the animation.
                        // It needs height to contain the image. Adjust min-h based on image aspect ratio.
                        // e.g., min-h-[200px], min-h-[240px] or Tailwind's h-48, h-56, h-64 etc.
                        className="text-2xl font-heading font-bold transition-opacity duration-300 ease-in-out flex items-center justify-center"
                        style={{
                            minHeight: '180px', // Adjust this to fit your image's aspect ratio!
                                                // Example: If image is w-96 (384px) and aspect 2:1, height is ~192px. Add padding.
                            zIndex: 5, // Text is initially visible
                        }}
                    >
                        {/* The actual text is in a span for opacity control */}
                        <span className="transition-opacity duration-300 ease-in-out">JOIN THE CAUSE</span>
                    </h3>

                    {/* The Legends Easter Egg Image - Positioned absolutely within the h3's box */}
                    <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{
                            opacity: legendsVisibility,
                            // translateY moves from 75% (image shifted down from center) to 0% (image centered)
                            // (1 - legendsVisibility) goes from 1 down to 0.
                            transform: `translateY(${(1 - legendsVisibility) * 30}%)`,
                            // Smooth transitions for opacity and transform
                            transition: 'opacity 0.3s ease-out, transform 0.5s ease-out',
                            zIndex: 10, // Image appears on top of the text
                        }}
                    >
                        <img
                            src="/jail-isnt-so-bad-transparant.png"
                            alt="The Legends"
                            className="w-72 md:w-96 h-auto max-h-full"
                        />
                    </div>
                </div>

                {!isConnected ? (
                    <ConnectWalletButton /> // Show connect button if not connected
                ) : (
                    // If connected, always show the form structure
                    <form onSubmit={handleSubmit} className="relative flex flex-col items-center space-y-4">
                        {!isOnCorrectChain && (
                            <div className="w-full p-3 mb-3 text-center text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-lg">
                                <p className="font-semibold">Wrong Network</p>
                                <p className="text-sm">Please switch to the correct network to contribute.</p>
                                {/* Optionally, if your ConnectWalletButton can also act as a network switcher */}
                                {/* <div className="mt-2"><ConnectWalletButton /></div> */}
                            </div>
                        )}

                        <label htmlFor="ethAmountInput" className="sr-only">ETH Amount</label>
                        <input
                            id="ethAmountInput"
                            name="ethAmount"
                            aria-label="ETH Contribution Amount"
                            type="number"
                            step="any" min="0" value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.1 ETH"
                            className="w-full p-4 text-lg bg-brand-charcoal border-2 border-gray-600 rounded-lg text-brand-light-text focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none placeholder-gray-500"
                            // Disable if not on correct chain, or if loading, or if pool state not 0
                            disabled={!isOnCorrectChain || isLoading || poolData.currentState !== 0}
                        />
                        <button
                            ref={contributeButtonRef}
                            type="submit"
                            // Disable if not on correct chain, or if loading, or if pool state not 0
                            disabled={!isOnCorrectChain || isLoading || poolData.currentState !== 0 || poolData.isLoading}
                            className="w-full px-8 py-4 bg-brand-green hover:bg-brand-green-dark text-brand-dark font-heading font-bold text-lg rounded-lg shadow-md transition-colors duration-150 ease-in-out disabled:opacity-60"
                        >
                            {isLoading ? 'PROCESSING...' : 'CONTRIBUTE & JAIL COBIE'}
                        </button>

                        {successMessage && !error && ( // also ensure no error is displayed with success
    <p className="text-brand-green mt-3 text-sm break-all">
        Contribution successful! Tx: <a
            href={`${blockExplorerUrl}/tx/${successMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-brand-green-dark"
        >
            {successMessage.substring(0, 6)}...{successMessage.substring(successMessage.length - 4)}
        </a>
    </p>
)}
                    </form>
                )}
            </div>
        </section>
    );
};
