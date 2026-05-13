import { useContext } from 'react';
import { RealtimeDataContext } from '../context/RealtimeDataContext';

export function useRealtimeData() {
  const context = useContext(RealtimeDataContext)
  if (!context) {
    throw new Error('useRealtimeData must be used within RealtimeDataProvider')
  }
  return context
}
