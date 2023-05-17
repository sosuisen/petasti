import { useCallback, useRef } from 'react';

// カスタムフックを作成します。
export const useDebounce = <T extends (...args: any[]) => unknown>(
  callbackFunc: T,
  delay = 250
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => callbackFunc(...args), delay);
    },
    [callbackFunc, delay]
  );
};
