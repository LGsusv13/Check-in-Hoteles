import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabaseClient.js'

const BADGE = {
  pendiente: 'badge-pendiente',
  'check-in': 'badge-checkin',
  'check-out': 'badge-checkout',
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
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  const cargar = async () => {
    setCargando(true)
    const { data: r } = await supabase.from('reservas').select('*').eq('id', id).maybeSingle()
    if (!r) {
      setNoEncontrada(true)
      setCargando(false)
      return
    }
    setReserva(r)

    if (r.estado === 'pendiente') {
      const link = `${window.location.origin}/checkin/${r.codigo}`
      try {
        const dataUrl = await QRCode.toDataURL(link, {
          margin: 1,
          width: 320,
          color: { dark: '#1B2430', light: '#F7F5F0' },
        })
        setQrDataUrl(dataUrl)
      } catch {
        // el QR es un plus, no bloquea la vista si falla
      }
    }

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
    await supabase.from('reservas').update({ estado: 'check-out', checkout_at: new Date().toISOString() }).eq('id', id)
    setProcesando(false)
    navigate('/admin')
  }

  const eliminarReserva = async () => {
    setEliminando(true)
    const { error } = await supabase.from('reservas').delete().eq('id', id)
    setEliminando(false)
    if (error) {
      alert('No se pudo eliminar la reserva. Intenta de nuevo.')
      return
    }
    navigate('/admin')
  }

  if (cargando) {
    return <Envoltorio><p className="text-ink/40 text-sm">Cargando reserva…</p></Envoltorio>
  }

  if (noEncontrada) {
    return (
      <Envoltorio>
        <h1 className="font-display text-xl text-ink mb-3">Reserva no encontrada</h1>
        <Link to="/admin" className="text-brass text-sm font-semibold hover:underline">← Volver al panel</Link>
      </Envoltorio>
    )
  }

  const link = `${window.location.origin}/checkin/${reserva.codigo}`

  const descargarQR = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `checkin-${reserva.codigo}.png`
    a.click()
  }

  return (
    <div className="min-h-screen bg-paper font-body">
      <header className="border-b border-ink/10 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link to="/admin" className="text-ink/50 text-sm hover:text-ink transition-colors">← Volver al panel</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-1 gap-4">
          <div>
            <p className="eyebrow mb-1">Reserva · {reserva.codigo}</p>
            <h1 className="font-display text-2xl text-ink font-semibold">{reserva.nombre_titular}</h1>
            <p className="text-ink/50 text-sm mt-1">
              {reserva.habitacion && <>Hab. {reserva.habitacion} · </>}
              {reserva.fecha_entrada} → {reserva.fecha_salida}
            </p>
          </div>
          <span className={`${BADGE[reserva.estado]} shrink-0`}>{reserva.estado}</span>
        </div>

        {/* Reserva pendiente: reenviar link/QR, o eliminarla si nunca llegó */}
        {reserva.estado === 'pendiente' && (
          <div className="card p-6 mt-6">
            <p className="text-ink/60 text-sm mb-4">
              El huésped todavía no ha completado su check-in. Puedes reenviarle el link o el QR:
            </p>
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
              {qrDataUrl && (
                <img src={qrDataUrl} alt={`Código QR para check-in ${reserva.codigo}`} className="w-32 h-32 rounded-lg border border-ink/10 shrink-0" />
              )}
              <div className="flex-1 w-full">
                <div className="bg-paper border border-ink/15 rounded-lg px-3 py-2.5 font-mono text-xs text-ink/80 break-all mb-3">
                  {link}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => navigator.clipboard.writeText(link)} className="btn bg-brass/10 text-brass hover:bg-brass/20 text-xs px-3.5 py-2">
                    Copiar link
                  </button>
                  <button onClick={descargarQR} disabled={!qrDataUrl} className="btn bg-brass/10 text-brass hover:bg-brass/20 text-xs px-3.5 py-2">
                    Descargar QR
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-7 space-y-3">
          {huespedes.length === 0 && (
            <div className="card p-8 text-center text-ink/40 text-sm">Aún no se ha registrado el check-in.</div>
          )}
          {huespedes.map((h) => (
            <div key={h.id} className="card p-5">
              <p className="font-semibold text-ink text-sm mb-2.5">
                {h.nombres} {h.apellidos}
                {h.es_titular && <span className="ml-2 text-[10px] uppercase tracking-wide text-brass font-bold">Titular</span>}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-ink/60">
                <span>Documento: {h.ci_pasaporte}</span>
                <span>Nacionalidad: {h.nacionalidad}</span>
                {h.telefono && <span>Tel: {h.telefono}</span>}
                {h.email && <span>Email: {h.email}</span>}
                {h.ciudad && <span>Ciudad: {h.ciudad}</span>}
              </div>
              {h.documento_path && (
                <a href={urls[h.documento_path]} target="_blank" rel="noreferrer" className="inline-block mt-3 text-xs font-semibold text-brass hover:underline">
                  Ver documento de identidad →
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-7">
          {reserva.estado === 'check-in' && (
            <button onClick={marcarCheckout} disabled={procesando} className="btn-accent">
              {procesando ? 'Procesando…' : 'Marcar check-out'}
            </button>
          )}

          {reserva.estado === 'pendiente' && !confirmandoEliminar && (
            <button onClick={() => setConfirmandoEliminar(true)} className="btn-ghost text-rust hover:bg-rust/5">
              Eliminar reserva
            </button>
          )}

          {confirmandoEliminar && (
            <div className="flex items-center gap-3 bg-rust/5 border border-rust/20 rounded-xl px-4 py-2.5">
              <span className="text-rust text-sm">¿Eliminar esta reserva? No se puede deshacer.</span>
              <button onClick={eliminarReserva} disabled={eliminando} className="btn bg-rust text-white hover:bg-rust/90 text-xs px-3.5 py-2">
                {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
              <button onClick={() => setConfirmandoEliminar(false)} className="btn-ghost text-xs px-3.5 py-2">
                Cancelar
              </button>
            </div>
          )}
        </div>
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
