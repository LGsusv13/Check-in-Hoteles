import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function EnlaceAutoCheckin() {
  const [abierto, setAbierto] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const link = `${window.location.origin}/checkin`

  useEffect(() => {
    if (abierto && !qrDataUrl) {
      QRCode.toDataURL(link, { margin: 1, width: 320, color: { dark: '#1B2430', light: '#F7F5F0' } })
        .then(setQrDataUrl)
        .catch(() => {})
    }
  }, [abierto, qrDataUrl, link])

  const descargarQR = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = 'auto-checkin-qr.png'
    a.click()
  }

  return (
    <div className="card mb-6">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-ink">Enlace de auto check-in</p>
          <p className="text-xs text-ink/45 mt-0.5">El QR fijo que imprimes una sola vez en recepción</p>
        </div>
        <span className="text-ink/40 text-sm">{abierto ? '−' : '+'}</span>
      </button>

      {abierto && (
        <div className="px-5 pb-5 border-t border-ink/10 pt-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          {qrDataUrl && (
            <img src={qrDataUrl} alt="QR de auto check-in" className="w-32 h-32 rounded-lg border border-ink/10 shrink-0" />
          )}
          <div className="flex-1 w-full">
            <p className="text-xs text-ink/55 mb-3">
              Este link nunca cambia — imprímelo una vez y pégalo en recepción. Cualquier huésped puede
              escanearlo para hacer su propio check-in sin que tengas que crear nada primero.
            </p>
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
      )}
    </div>
  )
}
