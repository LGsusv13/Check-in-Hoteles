import { Routes, Route, Navigate } from 'react-router-dom'
import Inicio from './pages/Inicio.jsx'
import CheckIn from './pages/CheckIn.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import NuevaReserva from './pages/NuevaReserva.jsx'
import DetalleReserva from './pages/DetalleReserva.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import MarcaTogo from './components/MarcaTogo.jsx'

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
