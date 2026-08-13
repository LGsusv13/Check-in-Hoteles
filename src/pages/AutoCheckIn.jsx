import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import GuestFields from '../components/GuestFields.jsx'
import SelloConfirmacion from '../components/SelloConfirmacion.jsx'

const vacio = () => ({
  _cid: crypto.randomUUID(),
  nombres: '',
  apellidos: '',
  ci_pasaporte: '',
  nacionalidad: 'Ecuatoriana',
  email: '',
  telefono: '',
  direccion: '',
  ciudad: '',
  documento_path: '',
})

const hoy = () => new Date().toISOString().slice(0, 10)

export default function AutoCheckIn() {
  const [sessionId] = useState(() => crypto.randomUUID())
  const [habitacion, setHabitacion] = useState('')
  const [fechaSalida, setFechaSalida] = useState('')
  const [huespedes, setHuespedes] = useState([vacio()])
  const [validez, setValidez] = useState({})
  const [subiendoCid, setSubiendoCid] = useState(null)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')
  const [resultado, setResultado] = useState(null) // { codigo }

  const actualizarHuesped = (cid, next) => {
    setHuespedes((prev) => prev.map((h) => (h._cid === cid ? { ...next, _cid: cid } : h)))
  }

  const actualizarValidez = (cid, ok) => {
    setValidez((prev) => ({ ...prev, [cid]: ok }))
  }

  const subirDocumento = async (cid, file) => {
    setSubiendoCid(cid)
    try {
      const ext = file.name.split('.').pop()
      const ruta = `auto/${sessionId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('documentos-identidad').upload(ruta, file)
      if (error) throw error
      const actual = huespedes.find((h) => h._cid === cid)
      actualizarHuesped(cid, { ...actual, documento_path: ruta })
    } catch (err) {
      alert('No se pudo subir el documento. Intenta de nuevo.')
      console.error(err)
    } finally {
      setSubiendoCid(null)
    }
  }

  const agregarAcompanante = () => setHuespedes((prev) => [...prev, vacio()])
  const quitarAcompanante = (cid) => {
    setHuespedes((prev) => prev.filter((h) => h._cid !== cid))
    setValidez((prev) => {
      const next = { ...prev }
      delete next[cid]
      return next
    })
  }

  const titular = huespedes[0]
  const titularCompleto = validez[titular?._cid] && !!titular?.telefono && !!titular?.documento_path
  const acompanantesCompletos = huespedes.slice(1).every((h) => validez[h._cid])
  const puedeEnviar = titularCompleto && acompanantesCompletos && !!fechaSalida && aceptaTerminos && !enviando

  const fechaSalidaInvalida = useMemo(() => {
    if (!fechaSalida) return false
    return fechaSalida < hoy()
  }, [fechaSalida])

  const enviar = async () => {
    setEnviando(true)
    setErrorEnvio('')
    try {
      const payload = huespedes.map((h, i) => {
        const { _cid, ...resto } = h
        void _cid
        return { ...resto, es_titular: i === 0, acepto_terminos: i === 0 ? aceptaTerminos : true }
      })
      const { data, error } = await supabase.rpc('autoregistrar_checkin', {
        p_reserva: { habitacion: habitacion || null, fecha_salida: fechaSalida },
        p_huespedes: payload,
      })
      if (error) throw error
      setResultado({ codigo: data })
    } catch (err) {
      setErrorEnvio(err.message || 'Ocurrió un error al guardar. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  // ---------- pantalla de éxito ----------
  if (resultado) {
    const fecha = new Date()
    return (
      <div className="min-h-screen flex items-center justify-center px-6 font-body print:bg-white">
        <div className="max-w-sm w-full text-center">
          <SelloConfirmacion />
          <h1 className="font-display text-2xl text-paper font-semibold mb-2 mt-5">Check-in completado</h1>
          <p className="text-paper/60 text-sm mb-6">
            Gracias, {huespedes[0].nombres}. Tus datos fueron registrados. Puedes acercarte a recepción para recibir tu llave.
          </p>

          <div className="card p-5 text-left text-sm mb-6 print:border-ink/30">
            <p className="text-[11px] uppercase tracking-wider text-ink/40 font-semibold mb-2">Comprobante</p>
            <div className="space-y-1 text-ink/70">
              <p><span className="text-ink/40">Titular:</span> {huespedes[0].nombres} {huespedes[0].apellidos}</p>
              {habitacion && <p><span className="text-ink/40">Habitación:</span> {habitacion}</p>}
              <p><span className="text-ink/40">Código de reserva:</span> {resultado.codigo}</p>
              <p><span className="text-ink/40">Huéspedes:</span> {huespedes.length}</p>
              <p><span className="text-ink/40">Fecha de registro:</span> {fecha.toLocaleString('es-EC')}</p>
            </div>
          </div>

          <button onClick={() => window.print()} className="btn-outline w-full uppercase tracking-widest print:hidden">
            Imprimir comprobante
          </button>
        </div>
      </div>
    )
  }

  // ---------- formulario ----------
  return (
    <div className="min-h-screen py-8 px-4 font-body">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 text-center">
          <img src="/logo-hotel.png" alt="Casa San Rafael" className="h-16 mx-auto mb-4" />
          <p className="eyebrow mb-2">Check-in digital</p>
          <h1 className="font-display text-3xl md:text-4xl text-paper font-semibold">Bienvenido</h1>
          <p className="text-paper/55 text-sm mt-3 max-w-sm mx-auto">
            Completa tus datos y los de tus acompañantes. Recepción ya te indicó tu número de habitación.
          </p>
        </header>

        <div className="card p-6 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Habitación</label>
              <input className="field-input" value={habitacion} onChange={(e) => setHabitacion(e.target.value)} placeholder="204" />
            </div>
            <div>
              <label className="field-label">Fecha de salida *</label>
              <input
                type="date"
                min={hoy()}
                required
                className="field-input"
                value={fechaSalida}
                onChange={(e) => setFechaSalida(e.target.value)}
              />
              {fechaSalidaInvalida && <p className="text-rust text-xs mt-1">La fecha de salida no puede ser en el pasado</p>}
            </div>
          </div>
        </div>

        <div className="card overflow-hidden divide-y divide-ink/10">
          {huespedes.map((h, i) => (
            <div key={h._cid} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg text-ink">
                  {i === 0 ? 'Huésped titular' : `Acompañante ${i}`}
                </h2>
                {i > 0 && (
                  <button onClick={() => quitarAcompanante(h._cid)} className="text-xs text-rust/70 hover:text-rust font-semibold">
                    Quitar
                  </button>
                )}
              </div>
              <GuestFields
                guest={h}
                index={h._cid}
                esTitular={i === 0}
                onChange={actualizarHuesped}
                onValidityChange={actualizarValidez}
                uploading={subiendoCid === h._cid}
                onUpload={subirDocumento}
              />
            </div>
          ))}
        </div>

        <button onClick={agregarAcompanante} className="btn-outline w-full mt-4 text-sm">
          + Agregar acompañante
        </button>

        <label className="flex items-start gap-3 mt-6 card p-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={aceptaTerminos}
            onChange={(e) => setAceptaTerminos(e.target.checked)}
            className="mt-0.5 accent-brass w-4 h-4 shrink-0"
          />
          <span className="text-xs text-ink/60 leading-relaxed">
            Autorizo al hotel a tratar mis datos personales y los de mis acompañantes
            (incluyendo la foto del documento de identidad) únicamente con fines de
            registro de huéspedes y cumplimiento de normativa de alojamiento turístico.
          </span>
        </label>

        {errorEnvio && (
          <div className="mt-4 p-3 rounded-lg bg-rust/10 text-rust text-sm text-center">{errorEnvio}</div>
        )}

        <button onClick={enviar} disabled={!puedeEnviar} className="btn-primary w-full mt-4 py-4 uppercase tracking-widest">
          {enviando ? 'Guardando…' : 'Completar check-in'}
        </button>
        {!puedeEnviar && !enviando && (
          <p className="text-center text-xs text-paper/40 mt-3">
            Completa los datos y foto del titular, la fecha de salida, y acepta el tratamiento de datos para continuar.
          </p>
        )}
      </div>
    </div>
  )
}
