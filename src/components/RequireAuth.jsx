import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'

export default function RequireAuth({ children }) {
  const [estado, setEstado] = useState('verificando') // verificando | ok | no-auth

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEstado(data.session ? 'ok' : 'no-auth')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEstado(session ? 'ok' : 'no-auth')
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (estado === 'verificando') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-paper/50 text-sm font-body">Verificando sesión…</p>
      </div>
    )
  }
  if (estado === 'no-auth') return <Navigate to="/admin/login" replace />
  return children
}
