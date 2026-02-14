import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import { useAuthStore } from "./store/authStore";

// Lazy-loaded pages for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Chat = lazy(() => import("./pages/Chat"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Agents = lazy(() => import("./pages/Agents"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Admin = lazy(() => import("./pages/Admin"));

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-screen bg-gray-950">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
        <span className="text-white text-xl font-bold">S</span>
      </div>
      <div className="w-8 h-8 border-3 border-gray-700 border-t-violet-500 rounded-full animate-spin" />
      <span className="text-sm text-gray-400">Loading SUMONIX AI...</span>
    </div>
  </div>
);

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-screen bg-gray-950 overflow-hidden">
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
          path="/welcome"
          element={isAuthenticated ? <Navigate to="/chat" replace /> : <Landing />}
        />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/chat" replace /> : <Login />}
        />

        {/* Chat — full screen, no sidebar (ChatGPT style) */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />

        {/* Dashboard pages with sidebar */}
        <Route
          path="/dashboard"
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
        <Route
          path="/pricing"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Pricing />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Admin />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Default: redirect to chat if authenticated, else landing */}
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/chat" replace /> : <Navigate to="/welcome" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
