import { ReactNode, useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/redux/store';

interface ReduxProviderProps {
  children: ReactNode;
}

export function ReduxProvider({ children }: ReduxProviderProps) {
  // Use ref to ensure store reference is stable across HMR
  const storeRef = useRef(store);
  
  return <Provider store={storeRef.current}>{children}</Provider>;
}
