'use client';

import { useSyncExternalStore } from 'react';
import { getAuthSession, subscribeAuthSession, type AuthSession } from '../storage';

export function useAuthSession(): AuthSession | null {
  return useSyncExternalStore(subscribeAuthSession, getAuthSession, () => null);
}

