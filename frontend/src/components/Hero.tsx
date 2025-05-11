import React from 'react';

export const Hero: React.FC = () => {
    return (
        // Reduced section padding
        <section className="relative py-12 md:py-20 bg-hero-pattern bg-cover bg-center"> {/* Was py-20 md:py-32 */}
            <div className="container mx-auto px-6 text-center">
                <h1 className="text-5xl md:text-7xl font-heading font-black text-brand-light-text uppercase tracking-tight leading-tight">
                    <span className="block">UNLOCK</span>
                    <span className="block text-brand-green">UP ONLY</span>
                </h1>
                {/* Reduced margin above paragraph */}
                <p className="mt-4 text-lg md:text-xl text-brand-secondary-text max-w-2xl mx-auto"> {/* Was mt-6 */}
                    Cobie has locked the future of Up Only behind this NFT.
                    Let's crowdfund its purchase, burn it, and bring back the podcast. 
                </p>
                {/* Reduced margin above image */}
                <div className="mt-6 max-w-xs mx-auto"> {/* Was mt-10 */}
                    <img src="/Up Only Nft.avif" alt="Up Only TV Admission Ticket NFT" className="rounded-lg shadow-2xl border-4 border-brand-cream" />
                </div>
            </div>
        </section>
    );
};
