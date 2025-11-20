import { useEffect, useRef } from 'react';

export function useInterval<T extends Function,>(callback: T, delay: number | null) {
  // FIX: When passing a generic type to `useRef`, an initial value is expected.
  // Initialize with `null` to resolve the "Expected 1 arguments, but got 0" error.
  const savedCallback = useRef<T | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
