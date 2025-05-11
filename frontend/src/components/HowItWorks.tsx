// frontend/src/components/HowItWorks.tsx
import React, { useState } from 'react';
import { TARGET_NFT_CONTRACT_ADDRESS, TARGET_NFT_TOKEN_ID_MAINNET } from '../config';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid'; // npm install @heroicons/react

export const HowItWorks: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false); 

    let explorerName = "Block Explorer";

    const contractLink = "https://etherscan.io/address/0xb2759d3f3487f52d45cc00c5b40f81f5e2e12d64#code" 

    return (
        <section className="pt-6 pb-12 md:pt-8 md:pb-16 bg-brand-dark"> {/* Reduced padding slightly */}
            <div className="container mx-auto px-6 max-w-3xl">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex justify-between items-center text-left py-3 focus:outline-none"
                >
                    <h2 className="text-3xl font-heading font-bold">HOW IT WORKS</h2>
                    {isOpen ? (
                        <ChevronUpIcon className="h-7 w-7 text-brand-green" />
                    ) : (
                        <ChevronDownIcon className="h-7 w-7 text-brand-green" />
                    )}
                </button>

                {isOpen && (
                    <div className="mt-6 space-y-8 text-brand-secondary-text animate-fadeIn"> {/* Simple fade-in animation */}
                        <div>
                            <h4 className="font-semibold text-lg text-brand-light-text mb-2">1. Pool ETH</h4>
                            <p>Pool ETH towards the 10,000 ETH target to acquire Cobie's NFT.</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-lg text-brand-light-text mb-2">2. Automatic Purchase & Burn</h4>
                            <p>
                                If the pool meets the NFT price, your contribution can trigger the smart contract to automatically purchase
                                Cobie's "Up Only Season Pass" NFT from OpenSea. Upon success, the NFT is <strong className="text-brand-green">immediately burned</strong>.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-lg text-brand-light-text mb-2">3. Up Only Returns (Hopefully!)</h4>
                            <p>With the NFT burned, Cobie's condition is met. The podcast restarts. The prophecy is fulfilled.</p>
                        </div>
                         <div>
                            <h4 className="font-semibold text-lg text-brand-light-text mb-2">Transparency & Your Funds</h4>
                            <p>
                                This interface simplifies contributions. For withdrawals (before purchase) or emergency refunds, interact directly with the smart contract.
                            </p>
                            <ul className="list-disc list-inside mt-3 space-y-1">
                                <li>
                                    <a href={`https://opensea.io/assets/ethereum/${TARGET_NFT_CONTRACT_ADDRESS}/${TARGET_NFT_TOKEN_ID_MAINNET}`} target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">
                                        View Target NFT on OpenSea
                                    </a>
                                </li>
                                <li>
                                    <a href={contractLink} target="_blank" rel="noopener noreferrer" className={`text-brand-green hover:underline ${contractLink? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        View Smart Contract on {explorerName}
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
