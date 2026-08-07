import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'

const ESTADO_ESTILOS = {
  pendiente: 'bg-ink/10 text-ink/60',
  'check-in': 'bg-moss/10 text-moss',
  'check-out': 'bg-brass/10 text-brass',
}

export default function DetalleReserva() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [reserva, setReserva] = useState(null)
  const [huespedes, setHuespedes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [noEncontrada, setNoEncontrada] = useState(false)
  const [urls, setUrls] = useState({})
  const [procesando, setProcesando] = useState(false)

  const cargar = async () => {
    setCargando(true)
    const { data: r } = await supabase.from('reservas').select('*').eq('id', id).maybeSingle()
    if (!r) {
      setNoEncontrada(true)
      setCargando(false)
      return
    }
    setReserva(r)

    const { data: h } = await supabase
      .from('huespedes')
      .select('*')
      .eq('reserva_id', id)
      .order('es_titular', { ascending: false })
    setHuespedes(h || [])
    setCargando(false)

    const paths = (h || []).filter((g) => g.documento_path).map((g) => g.documento_path)
    if (paths.length) {
      const nuevas = {}
      for (const p of paths) {
        const { data: signed } = await supabase.storage.from('documentos-identidad').createSignedUrl(p, 60 * 10)
        if (signed) nuevas[p] = signed.signedUrl
      }
      setUrls(nuevas)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const marcarCheckout = async () => {
    setProcesando(true)
    await supabase
      .from('reservas')
      .update({ estado: 'check-out', checkout_at: new Date().toISOString() })
      .eq('id', id)
    setProcesando(false)
    navigate('/admin')
  }

  if (cargando) {
    return (
      <Envoltorio>
        <p className="text-ink/40 text-sm">Cargando reserva…</p>
      </Envoltorio>
    )
  }

  if (noEncontrada) {
    return (
      <Envoltorio>
        <h1 className="font-display text-xl text-ink mb-2">Reserva no encontrada</h1>
        <Link to="/admin" className="text-brass text-sm font-semibold hover:underline">← Volver al panel</Link>
      </Envoltorio>
    )
  }

  return (
    <div className="min-h-screen bg-paper font-body">
      <header className="border-b border-ink/10 bg-white/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link to="/admin" className="text-ink/50 text-sm hover:text-ink transition-colors">← Volver al panel</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="font-display text-2xl text-ink font-semibold">{reserva.nombre_titular}</h1>
            <p className="text-ink/50 text-sm mt-0.5">
              {reserva.habitacion && <>Hab. {reserva.habitacion} · </>}
              {reserva.fecha_entrada} → {reserva.fecha_salida} · código {reserva.codigo}
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide shrink-0 ${ESTADO_ESTILOS[reserva.estado]}`}>
            {reserva.estado}
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {huespedes.length === 0 && (
            <p className="text-ink/40 text-sm">Aún no se ha registrado el check-in.</p>
          )}
          {huespedes.map((h) => (
            <div key={h.id} className="border border-ink/10 rounded-xl p-5 bg-white">
              <p className="font-semibold text-ink text-sm mb-2">
                {h.nombres} {h.apellidos}
                {h.es_titular && <span className="ml-2 text-[10px] uppercase tracking-wide text-brass font-bold">Titular</span>}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink/60">
                <span>Documento: {h.ci_pasaporte}</span>
                <span>Nacionalidad: {h.nacionalidad}</span>
                {h.telefono && <span>Tel: {h.telefono}</span>}
                {h.email && <span>Email: {h.email}</span>}
                {h.ciudad && <span>Ciudad: {h.ciudad}</span>}
              </div>
              {h.documento_path && (
                <a
                  href={urls[h.documento_path]}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-3 text-xs font-semibold text-brass hover:underline"
                >
                  Ver documento de identidad →
                </a>
              )}
            </div>
          ))}
        </div>

        {reserva.estado === 'check-in' && (
          <button
            onClick={marcarCheckout}
            disabled={procesando}
            className="mt-7 px-6 py-2.5 rounded-lg bg-brass text-white font-semibold text-sm disabled:opacity-40 hover:bg-brass/90 transition-colors"
          >
            {procesando ? 'Procesando…' : 'Marcar check-out'}
          </button>
        )}
      </main>
    </div>
  )
}

function Envoltorio({ children }) {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 font-body text-center">
      <div>{children}</div>
    </div>
  )
}
