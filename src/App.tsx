import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PinGate } from "@/components/home/PinGate";
import { HomePage } from "@/pages/HomePage";
import { DashboardPage } from "@/pages/DashboardPage";

function AppRoutes() {
  const { loading, env } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-neutral-400">
        読み込み中...
      </div>
    );
  }

  if (!env) {
    return <PinGate />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/:yearId" element={<DashboardPage />} />
    </Routes>
  );
}

function RouteAnalytics() {
  const { pathname } = useLocation();
  const route = pathname === "/" ? "/" : "/:yearId";

  return <Analytics route={route} path={pathname} />;
}

function App() {
  return (
    <BrowserRouter>
      <RouteAnalytics />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
