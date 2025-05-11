import { Hero } from './components/Hero';
import { GoalProgress } from './components/GoalProgress';
import { ContributeForm } from './components/ContributeForm';
import { HowItWorks } from './components/HowItWorks';
import { Footer } from './components/Footer';

function App() {
    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-grow">
                <Hero />
                <GoalProgress />
                <ContributeForm />
                <HowItWorks />
            </main>
            <Footer />
        </div>
    );
}

export default App;
