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
    <div className="min-h-screen bg-ink flex items-center justify-center px-6 font-body">
      <form onSubmit={entrar} className="w-full max-w-sm bg-paper rounded-2xl p-8 shadow-2xl">
        <p className="font-mono text-[11px] tracking-[0.2em] text-brass uppercase mb-1">Panel administrativo</p>
        <h1 className="font-display text-2xl text-ink font-semibold mb-6">Iniciar sesión</h1>

        <label className="block text-[11px] font-semibold text-ink/60 uppercase tracking-wider mb-1.5">Correo</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-ink/15 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brass/50"
          placeholder="admin@tuhotel.com"
        />

        <label className="block text-[11px] font-semibold text-ink/60 uppercase tracking-wider mb-1.5">Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-ink/15 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-brass/50"
          placeholder="••••••••"
        />

        {error && <p className="text-rust text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full py-3 rounded-xl bg-ink text-paper font-semibold text-sm uppercase tracking-widest disabled:opacity-40 hover:bg-ink/90 transition-colors"
        >
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="text-xs text-ink/40 mt-5 text-center">
          Los usuarios admin se crean desde el panel de Supabase (Authentication → Users).
        </p>
      </form>
    </div>
  )
}
