import dynamic from 'next/dynamic';
import LandingHero from '@/components/landing/LandingHero';
import LandingSocialProof from '@/components/landing/LandingSocialProof';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
import CurtainReveal from '@/components/landing/CurtainReveal';
import ScrollProgress from '@/components/landing/ScrollProgress';
import ToggleLettersButton from '@/components/landing/ToggleLettersButton';

const ParticleBackground = dynamic(() => import('@/components/landing/ParticleBackground'));
const LandingDemo = dynamic(() => import('@/components/landing/LandingDemo'));
const LandingFAQ = dynamic(() => import('@/components/landing/LandingFAQ'));
const LandingFooter = dynamic(() => import('@/components/landing/LandingFooter'));

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <noscript>
        <style>{`.landing-content { opacity: 1 !important; }`}</style>
      </noscript>
      <CurtainReveal />
      <ScrollProgress />
      <ToggleLettersButton />

      <ParticleBackground />

      <div id="landing-content" className="landing-content">
        <LandingHero />
        <LandingSocialProof />
        <LandingHowItWorks />
        <LandingDemo />
        <LandingFAQ />
        <LandingFooter />
      </div>
    </main>
  );
}
