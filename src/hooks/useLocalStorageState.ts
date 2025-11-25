import { Dispatch, SetStateAction, useEffect, useState } from 'react';

const isFunction = <T,>(value: T | ((prevState: T) => T)): value is (prevState: T) => T =>
  typeof value === 'function';

const useLocalStorageState = <T,>(
  key: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] => {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return defaultValue;
    }

    try {
      return JSON.parse(stored) as T;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  const setValue: Dispatch<SetStateAction<T>> = value => {
    setState(prev => {
      const next = isFunction(value) ? value(prev) : value;
      return next;
    });
  };

  return [state, setValue];
};

export default useLocalStorageState;

