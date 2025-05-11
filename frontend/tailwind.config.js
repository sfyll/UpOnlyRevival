/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#121212', // Slightly darker than #1A1A1A for more depth
        'brand-charcoal': '#1A1A1B', // For cards or subtle background variations
        'brand-light-text': '#E0E0E0', // Main text, slightly off-white
        'brand-secondary-text': '#A0A0A0', // For less important text
        'brand-green': '#39FF14',     // Vibrant "Up Only" green
        'brand-green-dark': '#00E676', // A slightly darker green for hover/active
        'brand-cream': '#FAF0E6',     // Cream accent from NFT ticket
      },
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'], // Using Inter for body text, very readable
      },
      // For the subtle background image effect
      backgroundImage: {
        'hero-pattern': "linear-gradient(to bottom, rgba(18,18,18,0.85) 0%, rgba(18,18,18,0.98) 100%), url('/Jail isn't so bad.jpg')",
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out',
      }
    },
  },
  plugins: [],
}
