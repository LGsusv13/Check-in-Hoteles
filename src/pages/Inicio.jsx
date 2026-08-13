import { Link } from 'react-router-dom'

export default function Inicio() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center">
        <img src="/logo-hotel.png" alt="Casa San Rafael" className="w-44 mx-auto mb-6 drop-shadow-lg" />

        <p className="eyebrow mb-3">Sistema de check-in</p>
        <h1 className="font-display text-4xl text-paper font-semibold mb-4 leading-tight">
          Check-in digital<br />de huéspedes
        </h1>
        <p className="text-paper/60 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
          Registro de huéspedes sin papeleo — el hotel genera el link,
          el huésped completa sus datos desde el celular.
        </p>

        <Link to="/admin" className="btn-primary w-full sm:w-auto px-8">
          Ir al panel administrativo
        </Link>

        <p className="text-paper/40 text-xs mt-6">
          ¿Eres huésped? Escanea el QR en recepción o entra directo a{' '}
          <Link to="/checkin" className="text-brass hover:underline">/checkin</Link>.
        </p>
      </div>
    </div>
  )
}
