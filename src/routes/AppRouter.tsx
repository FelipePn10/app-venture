import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/components/auth/LoginPage';

export function AppRouter(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
}
