import { useEffect, useRef } from "react";

// Returns a ref whose `.current` always tracks the latest `value`, so code
// running inside a requestAnimationFrame loop or a stable useCallback can
// read the current value without needing `value` in its own dependency array.
export function useLiveRef(value) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
