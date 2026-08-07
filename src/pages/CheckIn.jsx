import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import GuestFields from '../components/GuestFields.jsx'

const vacio = () => ({
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

export default function CheckIn() {
  const { codigo } = useParams()
  const [estadoCarga, setEstadoCarga] = useState('cargando') // cargando | ok | no-encontrado | ya-hecho | error
  const [reserva, setReserva] = useState(null)
  const [huespedes, setHuespedes] = useState([vacio()])
  const [validez, setValidez] = useState({ 0: false })
  const [subiendoIndex, setSubiendoIndex] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)

  useEffect(() => {
    async function buscar() {
      const { data, error } = await supabase.rpc('buscar_reserva_por_codigo', { p_codigo: codigo })
      if (error || !data || data.length === 0) {
        setEstadoCarga('no-encontrado')
        return
      }
      const r = data[0]
      if (r.estado !== 'pendiente') {
        setEstadoCarga('ya-hecho')
        setReserva(r)
        return
      }
      setReserva(r)
      setHuespedes(Array.from({ length: r.num_personas }, () => vacio()))
      setValidez(Object.fromEntries(Array.from({ length: r.num_personas }, (_, i) => [i, false])))
      setEstadoCarga('ok')
    }
    buscar()
  }, [codigo])

  const actualizarHuesped = useCallback((index, next) => {
    setHuespedes((prev) => prev.map((h, i) => (i === index ? next : h)))
  }, [])

  const actualizarValidez = useCallback((index, ok) => {
    setValidez((prev) => ({ ...prev, [index]: ok }))
  }, [])

  const subirDocumento = async (index, file) => {
    setSubiendoIndex(index)
    try {
      const ext = file.name.split('.').pop()
      const ruta = `${codigo}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('documentos-identidad').upload(ruta, file)
      if (error) throw error
      actualizarHuesped(index, { ...huespedes[index], documento_path: ruta })
    } catch (err) {
      alert('No se pudo subir el documento. Intenta de nuevo.')
      console.error(err)
    } finally {
      setSubiendoIndex(null)
    }
  }

  const titularCompleto =
    validez[0] && !!huespedes[0]?.telefono && !!huespedes[0]?.documento_path
  const acompanantesCompletos = huespedes.slice(1).every((_, i) => validez[i + 1])
  const puedeEnviar = titularCompleto && acompanantesCompletos && aceptaTerminos && !enviando

  const enviar = async () => {
    setEnviando(true)
    setErrorEnvio('')
    try {
      const payload = huespedes.map((h, i) => ({
        ...h,
        es_titular: i === 0,
        acepto_terminos: i === 0 ? aceptaTerminos : true,
      }))
      const { error } = await supabase.rpc('registrar_checkin', {
        p_codigo: codigo,
        p_huespedes: payload,
      })
      if (error) throw error
      setEnviado(true)
    } catch (err) {
      setErrorEnvio(err.message || 'Ocurrió un error al guardar. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  // ---------- estados de carga / error ----------
  if (estadoCarga === 'cargando') {
    return <Envoltorio><p className="text-ink/50 text-sm">Buscando tu reserva…</p></Envoltorio>
  }
  if (estadoCarga === 'no-encontrado') {
    return (
      <Envoltorio>
        <h1 className="font-display text-2xl text-ink mb-2">Código no encontrado</h1>
        <p className="text-ink/60 text-sm">
          El enlace de check-in no es válido. Verifica el link que te compartió el hotel o contacta a recepción.
        </p>
      </Envoltorio>
    )
  }
  if (estadoCarga === 'ya-hecho') {
    return (
      <Envoltorio>
        <h1 className="font-display text-2xl text-ink mb-2">Check-in ya registrado</h1>
        <p className="text-ink/60 text-sm">
          La reserva de <strong>{reserva?.nombre_titular}</strong> ya tiene un check-in completado. Si crees que esto es un error, contacta a recepción.
        </p>
      </Envoltorio>
    )
  }
  if (enviado) {
    const fecha = new Date()
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6 font-body print:bg-white">
        <div className="max-w-sm w-full text-center">
          <SelloConfirmacion />
          <h1 className="font-display text-2xl text-ink mb-2 mt-5">Check-in completado</h1>
          <p className="text-ink/60 text-sm mb-6">
            Gracias, {huespedes[0].nombres}. Tus datos fueron registrados. Puedes acercarte a recepción para recibir tu llave.
          </p>

          <div className="bg-white border border-ink/10 rounded-xl p-5 text-left text-sm mb-6 print:border-ink/30">
            <p className="text-[11px] uppercase tracking-wider text-ink/40 font-semibold mb-2">Comprobante</p>
            <div className="space-y-1 text-ink/70">
              <p><span className="text-ink/40">Titular:</span> {huespedes[0].nombres} {huespedes[0].apellidos}</p>
              <p><span className="text-ink/40">Habitación:</span> {reserva.habitacion || '—'}</p>
              <p><span className="text-ink/40">Código:</span> {codigo}</p>
              <p><span className="text-ink/40">Huéspedes:</span> {huespedes.length}</p>
              <p><span className="text-ink/40">Fecha de registro:</span> {fecha.toLocaleString('es-EC')}</p>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="w-full py-3 rounded-xl border border-ink/15 text-ink/70 font-semibold text-sm uppercase tracking-widest hover:bg-white transition-colors print:hidden"
          >
            Imprimir comprobante
          </button>
        </div>
      </div>
    )
  }

  // ---------- formulario ----------
  return (
    <div className="min-h-screen bg-paper py-8 px-4 font-body">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 text-center">
          <p className="font-mono text-[11px] tracking-[0.2em] text-brass uppercase mb-2">Check-in digital</p>
          <h1 className="font-display text-3xl md:text-4xl text-ink font-semibold">{reserva.nombre_titular}</h1>
          <p className="text-ink/50 text-sm mt-2">
            {reserva.habitacion && <>Habitación {reserva.habitacion} · </>}
            {new Date(reserva.fecha_entrada).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}
            {' → '}
            {new Date(reserva.fecha_salida).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}
            {' · '}{reserva.num_personas} {reserva.num_personas === 1 ? 'persona' : 'personas'}
          </p>
        </header>

        <div className="bg-white rounded-2xl border border-ink/10 shadow-sm shadow-ink/5 overflow-hidden divide-y divide-ink/10">
          {huespedes.map((h, i) => (
            <div key={i} className="p-6">
              <h2 className="font-display text-lg text-ink mb-4">
                {i === 0 ? 'Huésped titular' : `Acompañante ${i}`}
              </h2>
              <GuestFields
                guest={h}
                index={i}
                esTitular={i === 0}
                onChange={actualizarHuesped}
                onValidityChange={actualizarValidez}
                uploading={subiendoIndex === i}
                onUpload={subirDocumento}
              />
            </div>
          ))}
        </div>

        <label className="flex items-start gap-3 mt-6 bg-white rounded-xl border border-ink/10 p-4 cursor-pointer select-none">
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

        <button
          onClick={enviar}
          disabled={!puedeEnviar}
          className="w-full mt-4 py-4 rounded-xl bg-ink text-paper font-semibold text-sm uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ink/90 transition-colors"
        >
          {enviando ? 'Guardando…' : 'Completar check-in'}
        </button>
        {!puedeEnviar && !enviando && (
          <p className="text-center text-xs text-ink/40 mt-3">
            Completa los datos y foto del titular, y acepta el tratamiento de datos para continuar.
          </p>
        )}
      </div>
    </div>
  )
}

function Envoltorio({ children }) {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 font-body">
      <div className="max-w-sm text-center">{children}</div>
    </div>
  )
}

// Sello estilo "pasaporte estampado" — el momento memorable de la página.
function SelloConfirmacion() {
  return (
    <div className="mx-auto w-24 h-24 relative animate-sello">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#3E5C50" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="#3E5C50" strokeWidth="1" strokeDasharray="2 3" />
        <path
          id="ruta-superior"
          d="M 15 50 A 35 35 0 0 1 85 50"
          fill="none"
        />
        <path
          id="ruta-inferior"
          d="M 85 52 A 35 35 0 0 1 15 52"
          fill="none"
        />
        <text fontSize="8.2" fill="#3E5C50" fontFamily="IBM Plex Mono, monospace" letterSpacing="2" fontWeight="500">
          <textPath href="#ruta-superior" startOffset="50%" textAnchor="middle">
            HOSPEDAJE CONFIRMADO
          </textPath>
        </text>
        <path d="M35 51 L46 61 L67 39" fill="none" stroke="#3E5C50" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <style>{`
        @keyframes sello-anim {
          0% { transform: scale(2.2) rotate(-16deg); opacity: 0; }
          55% { transform: scale(0.94) rotate(-7deg); opacity: 1; }
          75% { transform: scale(1.05) rotate(-9deg); }
          100% { transform: scale(1) rotate(-8deg); opacity: 1; }
        }
        .animate-sello { animation: sello-anim 0.5s cubic-bezier(.2,.7,.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .animate-sello { animation: none; transform: rotate(-8deg); }
        }
      `}</style>
    </div>
  )
}
