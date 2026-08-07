import { Routes, Route, Navigate } from 'react-router-dom'
import CheckIn from './pages/CheckIn.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import NuevaReserva from './pages/NuevaReserva.jsx'
import DetalleReserva from './pages/DetalleReserva.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import MarcaTogo from './components/MarcaTogo.jsx'

function Inicio() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 font-body text-center">
      <div>
        <p className="font-mono text-[11px] tracking-[0.2em] text-brass uppercase mb-3">Sistema de check-in</p>
        <h1 className="font-display text-3xl text-ink font-semibold mb-3">Hotel Check-In Digital</h1>
        <p className="text-ink/50 text-sm max-w-sm mx-auto">
          Si eres huésped, usa el link que te compartió el hotel (formato /checkin/CODIGO).
          Si eres administrador, entra al panel.
        </p>
        <a href="/admin" className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-ink text-paper text-sm font-semibold hover:bg-ink/90 transition-colors">
          Ir al panel admin
        </a>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/checkin/:codigo" element={<CheckIn />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/reservas/nueva"
          element={
            <RequireAuth>
              <NuevaReserva />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/reservas/:id"
          element={
            <RequireAuth>
              <DetalleReserva />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <MarcaTogo />
    </>
  )
}
