// frontend/src/components/Footer.tsx
import React from 'react';

export const Footer: React.FC = () => {
    return (
        <footer className="py-8 bg-brand-charcoal border-t border-gray-700">
            <div className="container mx-auto px-6 text-center text-brand-secondary-text">
                <p className="mb-2">
                    Built by{' '}
                    <a
                        href="https://www.sfyl.xyz/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-green hover:underline"
                    >
                        SFYL.xyz
                    </a>
                    . For the culture.
                </p>
                <p className="text-xs mt-2">
                    Not financial advice. Interact with smart contracts at your own risk.
                </p>
            </div>
        </footer>
    );
};
