'use client';

import { useEffect } from 'react';
import { captureReferralParam } from '@/lib/analytics/events';

/**
 * Invisible component that captures UTM/referral parameters from the URL
 * on initial page load and stores them in localStorage for attribution.
 *
 * Mount once in the root layout.
 */
export default function ReferralCapture() {
  useEffect(() => {
    captureReferralParam();
  }, []);

  return null;
}
