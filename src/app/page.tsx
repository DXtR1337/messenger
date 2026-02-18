import dynamic from 'next/dynamic';
import LandingHero from '@/components/landing/LandingHero';
import LandingSocialProof from '@/components/landing/LandingSocialProof';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
import LandingFeatureShowcase from '@/components/landing/LandingFeatureShowcase';
import SplineInterlude from '@/components/landing/SplineInterlude';
import ParticleBackground from '@/components/landing/ParticleBackground';

const LandingDemo = dynamic(() => import('@/components/landing/LandingDemo'));
const LandingFAQ = dynamic(() => import('@/components/landing/LandingFAQ'));
const LandingFooter = dynamic(() => import('@/components/landing/LandingFooter'));

export default function Home() {
  return (
    <main className="relative min-h-screen bg-background">
      {/* Full-page particle network — fixed behind all content */}
      <ParticleBackground />

      <LandingHero />
      <LandingSocialProof />
      <LandingHowItWorks />
      <LandingFeatureShowcase />
      <SplineInterlude scene="/scene-2.splinecode" height="380px" />
      <LandingDemo />
      <LandingFAQ />
      <SplineInterlude scene="/scene-3.splinecode" height="380px" />
      <LandingFooter />
    </main>
  );
}
