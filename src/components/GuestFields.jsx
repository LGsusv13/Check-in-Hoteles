import { useState } from 'react'
import {
  validarNombre,
  validarDocumentoIdentidad,
  validarEmail,
  validarTelefono,
  MENSAJES_ERROR,
} from '../lib/validators.js'

const INPUT = 'field-input'
const LABEL = 'field-label'

function Campo({ label, error, children, required }) {
  return (
    <div>
      <label className={LABEL}>
        {label} {required && <span className="text-rust">*</span>}
      </label>
      {children}
      {error && <p className="text-rust text-xs mt-1">{error}</p>}
    </div>
  )
}

export default function GuestFields({ guest, index, onChange, onValidityChange, esTitular, uploading, onUpload }) {
  const [errors, setErrors] = useState({})
  const [esExtranjero, setEsExtranjero] = useState(false)

  const set = (field, value) => {
    const next = { ...guest, [field]: value }
    onChange(index, next)
  }

  const validar = (field, value) => {
    let err = ''
    if (field === 'nombres' && !validarNombre(value)) err = MENSAJES_ERROR.nombres
    if (field === 'apellidos' && !validarNombre(value)) err = MENSAJES_ERROR.apellidos
    if (field === 'ci_pasaporte' && !validarDocumentoIdentidad(value, esExtranjero)) {
      err = esExtranjero ? MENSAJES_ERROR.ci_pasaporte_generico : MENSAJES_ERROR.ci_pasaporte_cedula
    }
    if (field === 'email' && !validarEmail(value)) err = MENSAJES_ERROR.email
    if (field === 'telefono' && value && !validarTelefono(value)) err = MENSAJES_ERROR.telefono

    const nextErrors = { ...errors, [field]: err }
    setErrors(nextErrors)
    const requiredFields = ['nombres', 'apellidos', 'ci_pasaporte']
    const allOk = requiredFields.every((f) => {
      const val = f === field ? value : guest[f]
      if (f === 'ci_pasaporte') return validarDocumentoIdentidad(val || '', esExtranjero)
      return validarNombre(val || '')
    })
    onValidityChange(index, allOk)
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      alert('La imagen es muy pesada (máx. 8MB)')
      return
    }
    await onUpload(index, file)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Campo label="Nombres" required error={errors.nombres}>
          <input
            className={INPUT}
            value={guest.nombres}
            onChange={(e) => set('nombres', e.target.value)}
            onBlur={(e) => validar('nombres', e.target.value)}
            placeholder="Ej: María José"
          />
        </Campo>
        <Campo label="Apellidos" required error={errors.apellidos}>
          <input
            className={INPUT}
            value={guest.apellidos}
            onChange={(e) => set('apellidos', e.target.value)}
            onBlur={(e) => validar('apellidos', e.target.value)}
            placeholder="Ej: Andrade Vera"
          />
        </Campo>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className={LABEL + ' mb-0'}>
              Documento <span className="text-rust">*</span>
            </span>
            <label className="flex items-center gap-1.5 text-xs text-ink/60 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={esExtranjero}
                onChange={(e) => setEsExtranjero(e.target.checked)}
                className="accent-brass"
              />
              Pasaporte extranjero
            </label>
          </div>
          <input
            className={INPUT}
            value={guest.ci_pasaporte}
            onChange={(e) => set('ci_pasaporte', e.target.value)}
            onBlur={(e) => validar('ci_pasaporte', e.target.value)}
            placeholder={esExtranjero ? 'Número de pasaporte' : '10 dígitos'}
          />
          {errors.ci_pasaporte && <p className="text-rust text-xs mt-1">{errors.ci_pasaporte}</p>}
        </div>
        <Campo label="Nacionalidad" required>
          <input
            className={INPUT}
            value={guest.nacionalidad}
            onChange={(e) => set('nacionalidad', e.target.value)}
            placeholder="Ecuatoriana"
          />
        </Campo>
      </div>

      {esTitular && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo label="Correo electrónico" error={errors.email}>
            <input
              className={INPUT}
              value={guest.email}
              onChange={(e) => set('email', e.target.value)}
              onBlur={(e) => validar('email', e.target.value)}
              placeholder="ejemplo@correo.com"
            />
          </Campo>
          <Campo label="Teléfono" required error={errors.telefono}>
            <input
              className={INPUT}
              value={guest.telefono}
              onChange={(e) => set('telefono', e.target.value)}
              onBlur={(e) => validar('telefono', e.target.value)}
              placeholder="0991234567"
            />
          </Campo>
        </div>
      )}

      {esTitular && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo label="Dirección">
            <input
              className={INPUT}
              value={guest.direccion}
              onChange={(e) => set('direccion', e.target.value)}
              placeholder="Av. Principal N-12"
            />
          </Campo>
          <Campo label="Ciudad">
            <input
              className={INPUT}
              value={guest.ciudad}
              onChange={(e) => set('ciudad', e.target.value)}
              placeholder="Cuenca"
            />
          </Campo>
        </div>
      )}

      <div>
        <span className={LABEL}>
          Foto de documento (cédula / pasaporte) {esTitular && <span className="text-rust">*</span>}
        </span>
        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-ink/20 rounded-lg py-3.5 cursor-pointer hover:border-brass/60 hover:bg-brass/5 transition-colors text-sm text-ink/60">
          {uploading ? (
            <span>Subiendo…</span>
          ) : guest.documento_path ? (
            <span className="text-moss font-medium">✓ Documento cargado — toca para cambiar</span>
          ) : (
            <span>Toca para tomar foto o subir imagen</span>
          )}
          <input type="file" accept="image/*,.pdf" capture="environment" className="hidden" onChange={handleFile} />
        </label>
      </div>
    </div>
  )
}
