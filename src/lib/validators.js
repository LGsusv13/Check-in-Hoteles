// Validaciones reutilizables para el formulario de check-in

export function validarEmail(email) {
  if (!email) return true // el email es opcional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validarTelefono(telefono) {
  const limpio = telefono.replace(/[\s-]/g, '')
  return /^\+?\d{7,15}$/.test(limpio)
}

// Valida cédula ecuatoriana con el algoritmo oficial (módulo 10).
// Para pasaportes extranjeros no aplica este chequeo, solo longitud mínima.
export function validarCedulaEcuatoriana(cedula) {
  if (!/^\d{10}$/.test(cedula)) return false

  const provincia = parseInt(cedula.substring(0, 2), 10)
  if (provincia < 1 || provincia > 24) return false

  const tercerDigito = parseInt(cedula[2], 10)
  if (tercerDigito > 6) return false

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2]
  let suma = 0
  for (let i = 0; i < 9; i++) {
    let valor = parseInt(cedula[i], 10) * coeficientes[i]
    if (valor > 9) valor -= 9
    suma += valor
  }
  const verificador = (10 - (suma % 10)) % 10
  return verificador === parseInt(cedula[9], 10)
}

export function validarDocumentoIdentidad(valor, esExtranjero) {
  if (!valor || valor.trim().length < 5) return false
  if (esExtranjero) return true // pasaporte: solo validamos longitud
  return validarCedulaEcuatoriana(valor)
}

export function validarNombre(valor) {
  return valor.trim().length >= 2
}

export const MENSAJES_ERROR = {
  nombres: 'Ingresa un nombre válido',
  apellidos: 'Ingresa un apellido válido',
  ci_pasaporte_cedula: 'Cédula inválida. Revisa el número.',
  ci_pasaporte_generico: 'Ingresa un número de documento válido',
  email: 'Ingresa un correo válido',
  telefono: 'Ingresa un teléfono válido (7 a 15 dígitos)',
}
