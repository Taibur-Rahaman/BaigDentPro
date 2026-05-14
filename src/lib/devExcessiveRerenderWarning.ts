import { useEffect, useRef } from 'react';

/**
 * DEV-only: warns when a component subtree re-renders suspiciously often (possible loop / thrash).
 * No-op in production builds.
 */
export function useDevExcessiveRerenderWarning(componentName: string, threshold = 25, windowMs = 5000): void {
  const countRef = useRef(0);
  const windowStartRef = useRef(Date.now());

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const now = Date.now();
    if (now - windowStartRef.current > windowMs) {
      countRef.current = 0;
      windowStartRef.current = now;
    }
    countRef.current += 1;
    if (countRef.current > threshold) {
      console.warn(
        `[BaigDentPro perf] "${componentName}" exceeded ${threshold} renders within ~${windowMs}ms — check effects, context value identity, and navigation loops.`,
      );
      countRef.current = 0;
      windowStartRef.current = now;
    }
  });
}
