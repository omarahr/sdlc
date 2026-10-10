export const FOLD_SAMPLES = [
  { id: 'kelvin', text: 'S-00K', char: 'K', codepoint: 'U+212A', asciiTwin: 'K', pyLower: 's-00k', pyCasefold: 's-00k', asciiLower: 's-00K', note: 'Kelvin sign: str.lower() maps it to ASCII k' },
  { id: 'long-s', text: 'ſAMPLE', char: 'ſ', codepoint: 'U+017F', asciiTwin: 'S', pyLower: 'ſample', pyCasefold: 'sample', asciiLower: 'ſample', note: 'Long s: lower() keeps it, casefold() and upper() map it to ASCII s and S' },
  { id: 'dotted-i', text: 'İD', char: 'İ', codepoint: 'U+0130', asciiTwin: 'I', pyLower: 'i̇d', pyCasefold: 'i̇d', asciiLower: 'İd', note: 'Dotted capital I: lower() gives i plus U+0307, two code points' },
  { id: 'dotless-i', text: 'FıLE', char: 'ı', codepoint: 'U+0131', asciiTwin: 'i', pyLower: 'fıle', pyCasefold: 'fıle', asciiLower: 'fıle', note: 'Dotless small i: upper() maps it to ASCII I' },
  { id: 'sharp-s', text: 'STRAßE', char: 'ß', codepoint: 'U+00DF', asciiTwin: 'ss', pyLower: 'straße', pyCasefold: 'strasse', asciiLower: 'straße', note: 'Sharp s: casefold() gives ss, upper() gives SS, so lengths change' },
  { id: 'capital-sharp-s', text: 'ẞ', char: 'ẞ', codepoint: 'U+1E9E', asciiTwin: 'SS', pyLower: 'ß', pyCasefold: 'ss', asciiLower: 'ẞ', note: 'Capital sharp s: lower() gives sharp s, casefold() gives ss' },
  { id: 'accented-capital', text: 'É', char: 'É', codepoint: 'U+00C9', asciiTwin: null, pyLower: 'é', pyCasefold: 'é', asciiLower: 'É', note: 'No ASCII twin: separates ASCII lowering from str.lower()' },
]

export const sample = (id) => {
  const s = FOLD_SAMPLES.find((x) => x.id === id)
  if (!s) throw new Error(`unknown i18n-kit sample ${id}; known: ${FOLD_SAMPLES.map((x) => x.id).join(', ')}`)
  return s
}

export const asciiLower = (text) => text.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32))

export const asciiUpper = (text) => text.replace(/[a-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 32))

export const isAscii = (text) => /^[\x00-\x7f]*$/.test(text)

export const lookalikes = () => FOLD_SAMPLES.filter((s) => s.asciiTwin !== null)

export function withIdPrefix(prefix, id) {
  const s = sample(id)
  return { ...s, text: prefix + s.text }
}
