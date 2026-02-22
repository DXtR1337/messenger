'use client';

import { useState, useEffect } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';

export default function ConditionalAnalytics({ gaId }: { gaId: string }) {
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    setConsent(localStorage.getItem('podtekst-cookie-consent') === 'true');
    const onConsent = () => setConsent(true);
    window.addEventListener('podtekst-consent', onConsent);
    return () => window.removeEventListener('podtekst-consent', onConsent);
  }, []);

  if (!consent) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
