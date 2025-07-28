'use client'

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function usePageLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Hide loading spinner when pathname changes (page has loaded)
    setIsLoading(false);
  }, [pathname]);

  const startLoading = () => {
    setIsLoading(true);
  };

  return { isLoading, startLoading };
} 