import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import EnlaceAutoCheckin from '../components/EnlaceAutoCheckin.jsx'

const BADGE = {
  pendiente: 'badge-pendiente',
  'check-in': 'badge-checkin',
  'check-out': 'badge-checkout',
}

const FILTROS = ['todas', 'pendiente', 'check-in', 'check-out']

export default function AdminDashboard() {
  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const { data } = await supabase.from('reservas').select('*').order('created_at', { ascending: false })
      setReservas(data || [])
      setCargando(false)
    }
    cargar()
  }, [])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const visibles = useMemo(() => {
    return reservas.filter((r) => {
      const pasaFiltro = filtro === 'todas' || r.estado === filtro
      const pasaBusqueda =
        !busqueda ||
        r.nombre_titular.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.codigo.toLowerCase().includes(busqueda.toLowerCase())
      return pasaFiltro && pasaBusqueda
    })
  }, [reservas, filtro, busqueda])

  const exportarCSV = () => {
    const encabezados = ['codigo', 'titular', 'habitacion', 'entrada', 'salida', 'personas', 'estado']
    const filas = visibles.map((r) => [
      r.codigo, r.nombre_titular, r.habitacion || '', r.fecha_entrada, r.fecha_salida, r.num_personas, r.estado,
    ])
    const csv = [encabezados, ...filas].map((f) => f.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reservas-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const contadores = useMemo(() => {
    return {
      todas: reservas.length,
      pendiente: reservas.filter((r) => r.estado === 'pendiente').length,
      'check-in': reservas.filter((r) => r.estado === 'check-in').length,
      'check-out': reservas.filter((r) => r.estado === 'check-out').length,
    }
  }, [reservas])

  return (
    <div className="min-h-screen font-body">
      <header className="border-b border-ink/10 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-hotel-oscuro.png" alt="Casa San Rafael" className="h-9 w-auto" />
            <div>
              <p className="eyebrow">Panel administrativo</p>
              <h1 className="font-display text-xl text-ink font-semibold">Reservas y check-ins</h1>
            </div>
          </div>
          <button onClick={cerrarSesion} className="btn-ghost text-xs px-3 py-2">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <EnlaceAutoCheckin />

        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-6">
          <div className="flex gap-2 flex-wrap">
            {FILTROS.map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${
                  filtro === f ? 'bg-ink text-paper' : 'bg-white text-ink/50 border border-ink/10 hover:bg-ink/5'
                }`}
              >
                {f} <span className="opacity-60 normal-case">· {contadores[f]}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código…"
              className="field-input w-full md:w-56"
            />
            <button onClick={exportarCSV} className="btn-outline text-xs px-3.5 py-2.5 shrink-0">
              CSV
            </button>
            <Link to="/admin/reservas/nueva" className="btn-outline text-xs px-3.5 py-2.5 shrink-0">
              + Reserva anticipada
            </Link>
          </div>
        </div>

        {cargando && (
          <div className="card p-10 text-center text-ink/40 text-sm">Cargando…</div>
        )}

        {!cargando && visibles.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-ink/50 text-sm mb-4">
              {reservas.length === 0
                ? 'Aún no hay check-ins. Comparte el QR de arriba en recepción para que los huéspedes empiecen.'
                : 'No hay reservas que coincidan con tu búsqueda.'}
            </p>
          </div>
        )}

        {!cargando && visibles.length > 0 && (
          <>
            {/* Tabla — pantallas medianas en adelante */}
            <div className="card overflow-hidden hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-ink/40 border-b border-ink/10">
                    <th className="px-5 py-3 font-semibold">Titular</th>
                    <th className="px-5 py-3 font-semibold">Habitación</th>
                    <th className="px-5 py-3 font-semibold">Fechas</th>
                    <th className="px-5 py-3 font-semibold">Personas</th>
                    <th className="px-5 py-3 font-semibold">Código</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/admin/reservas/${r.id}`)}
                      className="border-b border-ink/5 last:border-0 hover:bg-brass/5 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 font-medium text-ink">{r.nombre_titular}</td>
                      <td className="px-5 py-3.5 text-ink/60">{r.habitacion || '—'}</td>
                      <td className="px-5 py-3.5 text-ink/60">{r.fecha_entrada} → {r.fecha_salida}</td>
                      <td className="px-5 py-3.5 text-ink/60">{r.num_personas}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-ink/50">{r.codigo}</td>
                      <td className="px-5 py-3.5"><span className={BADGE[r.estado]}>{r.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas — celular */}
            <div className="grid gap-3 md:hidden">
              {visibles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/admin/reservas/${r.id}`)}
                  className="card p-4 text-left hover:border-brass/40 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-ink text-sm">{r.nombre_titular}</p>
                    <span className={BADGE[r.estado]}>{r.estado}</span>
                  </div>
                  <p className="text-ink/50 text-xs">
                    {r.habitacion && <>Hab. {r.habitacion} · </>}
                    {r.fecha_entrada} → {r.fecha_salida} · {r.num_personas} {r.num_personas === 1 ? 'persona' : 'personas'}
                  </p>
                  <p className="font-mono text-[11px] text-ink/35 mt-1.5">{r.codigo}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
