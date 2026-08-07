// Sello estilo "pasaporte estampado" — el momento memorable de la página
// de confirmación. Compartido entre el flujo de check-in con código y el
// de auto check-in.
export default function SelloConfirmacion() {
  return (
    <div className="mx-auto w-24 h-24 relative animate-sello">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#3E5C50" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="#3E5C50" strokeWidth="1" strokeDasharray="2 3" />
        <path id="ruta-superior" d="M 15 50 A 35 35 0 0 1 85 50" fill="none" />
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
