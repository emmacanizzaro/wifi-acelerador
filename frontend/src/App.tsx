import { Navigate, Route, Routes } from 'react-router-dom';
import { RealtimeDataProvider } from './context/RealtimeDataContext';
import { AppShell } from './layouts/AppShell';
import { ConsumoPage } from './pages/ConsumoPage';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { InsightsPage } from './pages/InsightsPage';

export function App(): JSX.Element {
  return (
    <RealtimeDataProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dispositivos" element={<DevicesPage />} />
          <Route path="/consumo" element={<ConsumoPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </RealtimeDataProvider>
  )
}
