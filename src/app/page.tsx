'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Show loading briefly before redirecting
    const timer = setTimeout(() => {
      router.push('/demo');
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  return <LoadingSpinner message="Redirecting to Dashboard..." />;
} 