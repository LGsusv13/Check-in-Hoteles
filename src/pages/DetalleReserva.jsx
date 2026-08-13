import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabaseClient.js'

const BADGE = {
  pendiente: 'badge-pendiente',
  'check-in': 'badge-checkin',
  'check-out': 'badge-checkout',
}

const huespedVacio = () => ({
  id: null,
  _tempId: crypto.randomUUID(),
  es_titular: false,
  nombres: '',
  apellidos: '',
  ci_pasaporte: '',
  nacionalidad: '',
  email: '',
  telefono: '',
  direccion: '',
  ciudad: '',
})

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

  // ---------- edición ----------
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')
  const [formReserva, setFormReserva] = useState(null)
  const [formHuespedes, setFormHuespedes] = useState([])
  const [idsAEliminar, setIdsAEliminar] = useState([])

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

  const iniciarEdicion = () => {
    setFormReserva({
      habitacion: reserva.habitacion || '',
      fecha_entrada: reserva.fecha_entrada || '',
      fecha_salida: reserva.fecha_salida || '',
      num_personas: reserva.num_personas || 1,
      notas: reserva.notas || '',
    })
    setFormHuespedes(
      huespedes.map((h) => ({
        id: h.id,
        _tempId: crypto.randomUUID(),
        es_titular: h.es_titular,
        nombres: h.nombres || '',
        apellidos: h.apellidos || '',
        ci_pasaporte: h.ci_pasaporte || '',
        nacionalidad: h.nacionalidad || '',
        email: h.email || '',
        telefono: h.telefono || '',
        direccion: h.direccion || '',
        ciudad: h.ciudad || '',
      }))
    )
    setIdsAEliminar([])
    setErrorGuardado('')
    setEditando(true)
  }

  const cancelarEdicion = () => {
    setEditando(false)
    setErrorGuardado('')
  }

  const setCampoReserva = (campo, valor) => setFormReserva((prev) => ({ ...prev, [campo]: valor }))

  const setCampoHuesped = (tempId, campo, valor) => {
    setFormHuespedes((prev) => prev.map((h) => (h._tempId === tempId ? { ...h, [campo]: valor } : h)))
  }

  const agregarHuespedManual = () => setFormHuespedes((prev) => [...prev, huespedVacio()])

  const quitarHuespedForm = (tempId, huespedId) => {
    if (huespedId) setIdsAEliminar((prev) => [...prev, huespedId])
    setFormHuespedes((prev) => prev.filter((h) => h._tempId !== tempId))
  }

  const guardarCambios = async () => {
    setGuardando(true)
    setErrorGuardado('')
    try {
      const titularForm = formHuespedes.find((h) => h.es_titular)
      const nombreTitular = titularForm
        ? `${titularForm.nombres} ${titularForm.apellidos}`.trim()
        : reserva.nombre_titular

      const { error: errorReserva } = await supabase
        .from('reservas')
        .update({
          habitacion: formReserva.habitacion || null,
          fecha_entrada: formReserva.fecha_entrada,
          fecha_salida: formReserva.fecha_salida,
          num_personas: Number(formReserva.num_personas) || 1,
          notas: formReserva.notas || null,
          nombre_titular: nombreTitular,
        })
        .eq('id', id)
      if (errorReserva) throw errorReserva

      for (const huespedId of idsAEliminar) {
        const { error } = await supabase.from('huespedes').delete().eq('id', huespedId)
        if (error) throw error
      }

      for (const h of formHuespedes) {
        const datos = {
          es_titular: h.es_titular,
          nombres: h.nombres,
          apellidos: h.apellidos,
          ci_pasaporte: h.ci_pasaporte || null,
          nacionalidad: h.nacionalidad || null,
          email: h.email || null,
          telefono: h.telefono || null,
          direccion: h.direccion || null,
          ciudad: h.ciudad || null,
        }
        if (h.id) {
          const { error } = await supabase.from('huespedes').update(datos).eq('id', h.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('huespedes').insert([{ ...datos, reserva_id: id }])
          if (error) throw error
        }
      }

      await cargar()
      setEditando(false)
    } catch (err) {
      setErrorGuardado(err.message || 'No se pudieron guardar los cambios. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return <Envoltorio><p className="text-paper/60 text-sm">Cargando reserva…</p></Envoltorio>
  }

  if (noEncontrada) {
    return (
      <Envoltorio>
        <h1 className="font-display text-xl text-paper mb-3">Reserva no encontrada</h1>
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
    <div className="min-h-screen font-body">
      <header className="border-b border-ink/10 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo-hotel-oscuro.png" alt="Hotel San Miguel" className="h-8 w-auto" />
            <Link to="/admin" className="text-ink/50 text-sm hover:text-ink transition-colors">← Volver al panel</Link>
          </div>
          {!editando && (
            <button onClick={iniciarEdicion} className="btn-outline text-xs px-3.5 py-2">
              Editar
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-1 gap-4">
          <div>
            <p className="eyebrow mb-1">Reserva · {reserva.codigo}</p>
            <h1 className="font-display text-2xl text-paper font-semibold">{reserva.nombre_titular}</h1>
            {!editando && (
              <p className="text-paper/60 text-sm mt-1">
                {reserva.habitacion && <>Hab. {reserva.habitacion} · </>}
                {reserva.fecha_entrada} → {reserva.fecha_salida} · {reserva.num_personas}{' '}
                {reserva.num_personas === 1 ? 'persona' : 'personas'}
              </p>
            )}
          </div>
          <span className={`${BADGE[reserva.estado]} shrink-0`}>{reserva.estado}</span>
        </div>

        {/* Reserva pendiente: reenviar link/QR, o eliminarla si nunca llegó */}
        {!editando && reserva.estado === 'pendiente' && (
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

        {/* ---------- Modo edición: datos de la reserva ---------- */}
        {editando && (
          <div className="card p-6 mt-6 space-y-4">
            <p className="text-[11px] uppercase tracking-wider text-ink/40 font-semibold">Datos de la reserva</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Habitación</label>
                <input className="field-input" value={formReserva.habitacion} onChange={(e) => setCampoReserva('habitacion', e.target.value)} />
              </div>
              <div>
                <label className="field-label">Número de personas</label>
                <input
                  type="number"
                  min="1"
                  className="field-input"
                  value={formReserva.num_personas}
                  onChange={(e) => setCampoReserva('num_personas', e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Entrada</label>
                <input type="date" className="field-input" value={formReserva.fecha_entrada} onChange={(e) => setCampoReserva('fecha_entrada', e.target.value)} />
              </div>
              <div>
                <label className="field-label">Salida</label>
                <input type="date" className="field-input" value={formReserva.fecha_salida} onChange={(e) => setCampoReserva('fecha_salida', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="field-label">Notas internas</label>
              <textarea className="field-input" rows={2} value={formReserva.notas} onChange={(e) => setCampoReserva('notas', e.target.value)} />
            </div>
          </div>
        )}

        <div className="mt-7 space-y-3">
          {!editando && huespedes.length === 0 && (
            <div className="card p-8 text-center text-ink/40 text-sm">Aún no se ha registrado ningún huésped.</div>
          )}

          {!editando &&
            huespedes.map((h) => (
              <div key={h.id} className="card p-5">
                <p className="font-semibold text-ink text-sm mb-2.5">
                  {h.nombres} {h.apellidos}
                  {h.es_titular && <span className="ml-2 text-[10px] uppercase tracking-wide text-brass font-bold">Titular</span>}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-ink/60">
                  {h.ci_pasaporte && <span>Documento: {h.ci_pasaporte}</span>}
                  {h.nacionalidad && <span>Nacionalidad: {h.nacionalidad}</span>}
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

          {/* ---------- Modo edición: huéspedes ---------- */}
          {editando &&
            formHuespedes.map((h) => (
              <div key={h._tempId} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] uppercase tracking-wider text-ink/40 font-semibold">
                    {h.es_titular ? 'Titular' : 'Huésped'}
                  </p>
                  <button onClick={() => quitarHuespedForm(h._tempId, h.id)} className="text-xs text-rust/70 hover:text-rust font-semibold">
                    Quitar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Nombres</label>
                    <input className="field-input" value={h.nombres} onChange={(e) => setCampoHuesped(h._tempId, 'nombres', e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Apellidos</label>
                    <input className="field-input" value={h.apellidos} onChange={(e) => setCampoHuesped(h._tempId, 'apellidos', e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Documento</label>
                    <input className="field-input" value={h.ci_pasaporte} onChange={(e) => setCampoHuesped(h._tempId, 'ci_pasaporte', e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Nacionalidad</label>
                    <input className="field-input" value={h.nacionalidad} onChange={(e) => setCampoHuesped(h._tempId, 'nacionalidad', e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Teléfono</label>
                    <input className="field-input" value={h.telefono} onChange={(e) => setCampoHuesped(h._tempId, 'telefono', e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Correo</label>
                    <input className="field-input" value={h.email} onChange={(e) => setCampoHuesped(h._tempId, 'email', e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Dirección</label>
                    <input className="field-input" value={h.direccion} onChange={(e) => setCampoHuesped(h._tempId, 'direccion', e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Ciudad</label>
                    <input className="field-input" value={h.ciudad} onChange={(e) => setCampoHuesped(h._tempId, 'ciudad', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}

          {editando && (
            <button onClick={agregarHuespedManual} className="btn-outline w-full text-sm">
              + Agregar huésped
            </button>
          )}
        </div>

        {editando && errorGuardado && (
          <div className="mt-4 p-3 rounded-lg bg-rust/10 text-rust text-sm text-center">{errorGuardado}</div>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-7">
          {editando ? (
            <>
              <button onClick={guardarCambios} disabled={guardando} className="btn-primary">
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button onClick={cancelarEdicion} disabled={guardando} className="btn-outline">
                Cancelar
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function Envoltorio({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 font-body text-center">
      <div>{children}</div>
    </div>
  )
}
