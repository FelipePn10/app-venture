import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "@/components/auth/LoginPage";
import { SessionBootstrap } from "@/components/auth/SessionBootstrap";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ScreenHostPage } from "@/components/screens/ScreenHostPage";
import { useAuthStore } from "@/store/authStore";

function PrivateRoute({ children }: { children: JSX.Element }): JSX.Element {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function AppRouter(): JSX.Element {
  return (
    <HashRouter>
      <SessionBootstrap>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/screen/:code"
            element={
              <PrivateRoute>
                <ScreenHostPage />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </SessionBootstrap>
    </HashRouter>
  );
}
