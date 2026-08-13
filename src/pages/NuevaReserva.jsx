import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabaseClient.js'

function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin caracteres ambiguos
  let out = ''
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export default function NuevaReserva() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nombre_titular: '',
    habitacion: '',
    fecha_entrada: '',
    fecha_salida: '',
    num_personas: 1,
    notas: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [codigoGenerado, setCodigoGenerado] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const crear = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    const codigo = generarCodigo()
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from('reservas').insert([
      {
        codigo,
        nombre_titular: form.nombre_titular,
        habitacion: form.habitacion || null,
        fecha_entrada: form.fecha_entrada,
        fecha_salida: form.fecha_salida,
        num_personas: Number(form.num_personas),
        notas: form.notas || null,
        creado_por: userData?.user?.id ?? null,
      },
    ])
    if (error) {
      setGuardando(false)
      setError('No se pudo crear la reserva. Intenta de nuevo.')
      return
    }

    const linkGenerado = `${window.location.origin}/checkin/${codigo}`
    try {
      const dataUrl = await QRCode.toDataURL(linkGenerado, {
        margin: 1,
        width: 320,
        color: { dark: '#1B2430', light: '#F7F5F0' },
      })
      setQrDataUrl(dataUrl)
    } catch {
      // el QR es un plus, no bloquea el flujo si falla
    }
    setGuardando(false)
    setCodigoGenerado(codigo)
  }

  const link = codigoGenerado ? `${window.location.origin}/checkin/${codigoGenerado}` : ''

  const descargarQR = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `checkin-${codigoGenerado}.png`
    a.click()
  }

  // ---------- pantalla de éxito ----------
  if (codigoGenerado) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 font-body">
        <div className="max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-moss/10 text-moss flex items-center justify-center text-2xl mx-auto mb-5">✓</div>
          <h1 className="font-display text-2xl text-paper font-semibold mb-2">Reserva creada</h1>
          <p className="text-paper/60 text-sm mb-6">Comparte este link o el código QR con el huésped:</p>

          {qrDataUrl && (
            <img src={qrDataUrl} alt={`Código QR para check-in ${codigoGenerado}`} className="w-40 h-40 mx-auto mb-5 rounded-xl border border-ink/10 shadow-sm" />
          )}

          <div className="bg-white border border-ink/15 rounded-lg px-3 py-2.5 font-mono text-xs text-ink/80 break-all mb-5">
            {link}
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-2.5">
            <button onClick={() => navigator.clipboard.writeText(link)} className="btn bg-brass/10 text-brass hover:bg-brass/20">
              Copiar link
            </button>
            <button onClick={descargarQR} disabled={!qrDataUrl} className="btn bg-brass/10 text-brass hover:bg-brass/20">
              Descargar QR
            </button>
          </div>
          <button onClick={() => navigate('/admin')} className="btn-primary w-full">
            Volver al panel
          </button>
        </div>
      </div>
    )
  }

  // ---------- formulario ----------
  return (
    <div className="min-h-screen font-body">
      <header className="border-b border-ink/10 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-6 py-3 flex items-center gap-3">
          <img src="/logo-hotel-oscuro.png" alt="Casa San Rafael" className="h-8 w-auto" />
          <Link to="/admin" className="text-ink/50 text-sm hover:text-ink transition-colors">← Volver al panel</Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-10">
        <p className="eyebrow mb-2">Nueva reserva</p>
        <h1 className="font-display text-2xl text-ink font-semibold mb-6">Datos del huésped</h1>

        <form onSubmit={crear} className="card p-6 space-y-4">
          <div>
            <label className="field-label">Nombre del titular *</label>
            <input required className="field-input" value={form.nombre_titular} onChange={(e) => set('nombre_titular', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Habitación</label>
              <input className="field-input" value={form.habitacion} onChange={(e) => set('habitacion', e.target.value)} placeholder="204" />
            </div>
            <div>
              <label className="field-label"># Personas *</label>
              <input required type="number" min="1" className="field-input" value={form.num_personas} onChange={(e) => set('num_personas', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Entrada *</label>
              <input required type="date" className="field-input" value={form.fecha_entrada} onChange={(e) => set('fecha_entrada', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Salida *</label>
              <input required type="date" className="field-input" value={form.fecha_salida} onChange={(e) => set('fecha_salida', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="field-label">Notas internas</label>
            <textarea className="field-input" rows={2} value={form.notas} onChange={(e) => set('notas', e.target.value)} />
          </div>

          {error && <p className="text-rust text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Link to="/admin" className="btn-outline flex-1">Cancelar</Link>
            <button type="submit" disabled={guardando} className="btn-primary flex-1">
              {guardando ? 'Creando…' : 'Crear y generar link'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
