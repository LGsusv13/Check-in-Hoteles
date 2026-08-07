import { Link } from 'react-router-dom'

export default function Inicio() {
  return (
    <div className="min-h-screen bg-paper font-body flex items-center justify-center px-6 py-16 relative overflow-hidden">
      {/* anillo decorativo de fondo — ecoa el sello de la pantalla de éxito */}
      <div
        aria-hidden="true"
        className="absolute -right-32 -top-32 w-[420px] h-[420px] rounded-full border-[24px] border-ink/[0.03] pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -left-24 -bottom-24 w-[300px] h-[300px] rounded-full border-[16px] border-brass/[0.06] pointer-events-none"
      />

      <div className="max-w-md w-full text-center relative">
        <div className="w-14 h-14 rounded-full border-2 border-brass/40 flex items-center justify-center mx-auto mb-6">
          <div className="w-8 h-8 rounded-full bg-ink" />
        </div>

        <p className="eyebrow mb-3">Sistema de check-in</p>
        <h1 className="font-display text-4xl text-ink font-semibold mb-4 leading-tight">
          Check-in digital<br />de huéspedes
        </h1>
        <p className="text-ink/55 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
          Registro de huéspedes sin papeleo — el hotel genera el link,
          el huésped completa sus datos desde el celular.
        </p>

        <Link to="/admin" className="btn-primary w-full sm:w-auto px-8">
          Ir al panel administrativo
        </Link>

        <p className="text-ink/35 text-xs mt-6">
          ¿Eres huésped? Escanea el QR en recepción o entra directo a{' '}
          <Link to="/checkin" className="text-brass hover:underline">/checkin</Link>.
        </p>
      </div>
    </div>
  )
}
