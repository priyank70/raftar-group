'use client';

import { useEffect } from 'react';

/**
 * Locks body scroll when `isLocked` is true.
 * Works correctly on iOS Safari (which ignores overflow:hidden on body)
 * by using position:fixed + scroll position restoration.
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;

    // Store original styles
    const originalOverflow = body.style.overflow;
    const originalPosition = body.style.position;
    const originalTop = body.style.top;
    const originalWidth = body.style.width;
    const originalHtmlOverflow = html.style.overflow;

    // Apply lock
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    html.style.overflow = 'hidden';

    // Add class for CSS-based fixes (header, etc.)
    body.classList.add('modal-open');

    return () => {
      // Restore original styles
      body.style.overflow = originalOverflow;
      body.style.position = originalPosition;
      body.style.top = originalTop;
      body.style.width = originalWidth;
      html.style.overflow = originalHtmlOverflow;

      // Remove class
      body.classList.remove('modal-open');

      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}
