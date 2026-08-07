import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'

const ESTADO_ESTILOS = {
  pendiente: 'bg-ink/10 text-ink/60',
  'check-in': 'bg-moss/10 text-moss',
  'check-out': 'bg-brass/10 text-brass',
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
      r.codigo,
      r.nombre_titular,
      r.habitacion || '',
      r.fecha_entrada,
      r.fecha_salida,
      r.num_personas,
      r.estado,
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

  return (
    <div className="min-h-screen bg-paper font-body">
      <header className="border-b border-ink/10 bg-white/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-brass uppercase">Panel administrativo</p>
            <h1 className="font-display text-xl text-ink font-semibold">Reservas y check-ins</h1>
          </div>
          <button onClick={cerrarSesion} className="text-sm text-ink/50 hover:text-ink transition-colors">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
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
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código…"
              className="px-3.5 py-2 rounded-lg bg-white border border-ink/15 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-brass/50"
            />
            <button onClick={exportarCSV} className="px-3.5 py-2 rounded-lg border border-ink/15 text-sm font-semibold text-ink/70 hover:bg-white transition-colors">
              Exportar CSV
            </button>
            <Link to="/admin/reservas/nueva" className="px-3.5 py-2 rounded-lg bg-ink text-paper text-sm font-semibold hover:bg-ink/90 transition-colors">
              + Nueva reserva
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-ink/10 overflow-hidden">
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
              {cargando && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-ink/40">Cargando…</td></tr>
              )}
              {!cargando && visibles.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-ink/40">No hay reservas que coincidan.</td></tr>
              )}
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
                  <td className="px-5 py-3.5">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide ${ESTADO_ESTILOS[r.estado]}`}>
                      {r.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
