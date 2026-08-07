import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { PinGate } from '@/components/home/PinGate'
import { HomePage } from '@/pages/HomePage'
import { DashboardPage } from '@/pages/DashboardPage'

function AppRoutes() {
  const { loading, env } = useAuth()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-neutral-400">読み込み中...</div>
  }

  if (!env) {
    return <PinGate />
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/:yearId" element={<DashboardPage />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
