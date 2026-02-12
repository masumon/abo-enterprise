import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import { useAuthStore } from "./store/authStore";

// Lazy-loaded pages for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Agents = lazy(() => import("./pages/Agents"));
const Login = lazy(() => import("./pages/Login"));

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-screen bg-surface-950">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-3 border-surface-700 border-t-aegis-500 rounded-full animate-spin" />
      <span className="text-sm text-surface-400">Loading...</span>
    </div>
  </div>
);

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-screen bg-surface-950 overflow-hidden">
    <Sidebar />
    <main className="flex-1 overflow-y-auto">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
    </main>
  </div>
);

const App: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <Login />
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Tasks />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/agents"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Agents />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
