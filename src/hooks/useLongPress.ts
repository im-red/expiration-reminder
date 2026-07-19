import { useRef, useCallback } from 'react';

/**
 * Detects long press via pointer events. Works across mouse, touch, and pen.
 *
 * Usage:
 *   const lp = useLongPress(onLongPress, 500);
 *   <div
 *     onPointerDown={() => lp.start(id)}
 *     onPointerUp={lp.cancel}
 *     onPointerLeave={lp.cancel}
 *     onClick={() => { if (lp.consumeFire()) return; /* normal click * / }}
 *   />
 */
export function useLongPress(onLongPress: (id: string) => void, ms = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const targetRef = useRef<string | null>(null);
  const firedIdRef = useRef<string | null>(null);

  const start = useCallback((id: string) => {
    console.log('[useLongPress] start', id);
    targetRef.current = id;
    firedIdRef.current = null;
    timerRef.current = setTimeout(() => {
      if (targetRef.current === id) {
        console.log('[useLongPress] FIRED', id);
        timerRef.current = undefined;
        firedIdRef.current = id;
        onLongPress(id);
      } else {
        console.log('[useLongPress] stale timer ignored', id, 'current target:', targetRef.current);
      }
    }, ms);
  }, [onLongPress, ms]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      console.log('[useLongPress] cancelled (short tap)');
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    targetRef.current = null;
  }, []);

  /** Returns true if a long press just fired for the given id, and resets. */
  const consumeFire = useCallback((id: string) => {
    if (firedIdRef.current === id) {
      console.log('[useLongPress] consumeFire → SUPPRESS click for', id);
      firedIdRef.current = null;
      return true;
    }
    console.log('[useLongPress] consumeFire → allow click for', id, '(firedIdRef:', firedIdRef.current, ')');
    return false;
  }, []);

  return { start, cancel, consumeFire };
}
