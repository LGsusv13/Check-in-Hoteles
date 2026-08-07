// Marca de pertenencia — aparece en una esquina en TODAS las páginas.
// Se monta una sola vez en App.jsx, fuera de las rutas, para no repetirla
// en cada página.
export default function MarcaTogo() {
  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 bg-ink rounded-full pl-2 pr-3 py-1.5 shadow-lg shadow-ink/20 print:hidden pointer-events-none select-none"
      title="Hecho por TO GO"
    >
      <img src="/logo-togo.png" alt="TO GO" className="h-4 w-auto" />
      <span className="text-paper/60 text-[10px] font-medium tracking-wide font-mono">by TO GO</span>
    </div>
  )
}
