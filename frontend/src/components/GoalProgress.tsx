import React from 'react';
import { usePoolContractData } from '../hooks/usePoolContractData';
import { useAppChain } from '../hooks/useAppChain';

export const GoalProgress: React.FC = () => {
    const { publicClient } = useAppChain();
    const { poolData } = usePoolContractData(publicClient);

    const { totalRaisedFormatted, targetPriceFormatted, percentageFunded, isLoading, error } = poolData;
    return (
        <section id="goal" className="pt-8 md:pt-12 pb-12 md:pb-20 bg-brand-charcoal">
            <div className="container mx-auto px-6">
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-3">
                    THE GOAL: <span className="text-brand-green">{targetPriceFormatted} ETH</span>
                </h2>
                {isLoading && <p className="text-center text-brand-secondary-text">Loading pool data...</p>}
                {error && <p className="text-center text-red-500">Error: {error}</p>}
                {!isLoading && !error && (
                    <>
                    <div className="w-full max-w-3xl mx-auto bg-gray-700 rounded-full h-8 md:h-10 my-6 progress-bar-bg overflow-hidden shadow-inner relative"> {/* Added relative for text below */}
                        <div
                            className="bg-brand-green h-full rounded-full progress-bar-filled flex items-center justify-center"
                            style={{ width: `${percentageFunded}%` }}
                        >
                            {percentageFunded > 10 && ( // Only show % if bar is wide enough
                                <span className="text-sm md:text-base text-brand-dark font-bold px-2">
                                    {percentageFunded.toFixed(2)}%
                                </span>
                            )}
                        </div>
                        {/* If 0% or very low, show text on the track itself or outside */}
                        {percentageFunded <= 10 && (
                            <span className="absolute inset-0 flex items-center justify-center text-sm md:text-base text-brand-light-text font-bold">
                                 {percentageFunded.toFixed(2)}%
                            </span>
                        )}
                    </div>
                        <p className="text-center text-brand-secondary-text text-lg">
                            <span className="text-brand-light-text font-semibold">{totalRaisedFormatted} ETH</span> raised of <span className="text-brand-light-text font-semibold">{targetPriceFormatted} ETH</span>
                        </p>
                        {poolData.currentState === 1 && (
                            <p className="text-center text-brand-green font-bold text-2xl mt-6">
                                🎉 NFT ACQUIRED & BURNED! UP ONLY IS (HOPEFULLY) BACK! 🎉
                            </p>
                        )}
                         {poolData.currentState === 2 && (
                            <p className="text-center text-yellow-500 font-bold text-xl mt-6">
                                ⚠️ EMERGENCY REFUND ENABLED. Please claim funds via Etherscan.
                            </p>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};
