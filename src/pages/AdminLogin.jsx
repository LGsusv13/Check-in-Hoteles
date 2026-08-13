import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  const entrar = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setCargando(false)
    if (error) {
      setError('Correo o contraseña incorrectos.')
      return
    }
    navigate('/admin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 font-body">
      <form onSubmit={entrar} className="w-full max-w-sm bg-paper rounded-2xl p-8 shadow-2xl">
        <img src="/logo-hotel-oscuro.png" alt="Casa San Rafael" className="h-16 w-auto mx-auto mb-5" />

        <p className="eyebrow mb-1 text-center">Panel administrativo</p>
        <h1 className="font-display text-2xl text-ink font-semibold mb-6 text-center">Iniciar sesión</h1>

        <label className="field-label">Correo</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field-input mb-4"
          placeholder="admin@tuhotel.com"
        />

        <label className="field-label">Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field-input mb-5"
          placeholder="••••••••"
        />

        {error && <p className="text-rust text-sm mb-4">{error}</p>}

        <button type="submit" disabled={cargando} className="btn-primary w-full">
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="text-xs text-ink/40 mt-5 text-center">
          Los usuarios admin se crean desde el panel de Supabase (Authentication → Users).
        </p>
      </form>
    </div>
  )
}
