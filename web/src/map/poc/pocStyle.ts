import type { CSSProperties } from 'react'

// shortcut: colores provisionales solo para las PoC porque web/src/theme/ aún no tiene tokens;
// sustituir por los tokens del agente diseno en cuanto existan.
export const POC_COLORS = {
  bubble: [255, 140, 60, 180] as [number, number, number, number],
  arcFrom: [80, 200, 255] as [number, number, number],
  arcTo: [255, 90, 160] as [number, number, number],
  countryFill: '#3b82f6',
  countryLine: '#bfdbfe',
}

export const fullScreen: CSSProperties = { position: 'fixed', inset: 0 }

export const panel: CSSProperties = {
  position: 'fixed',
  top: 12,
  left: 12,
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  padding: '8px 12px',
  borderRadius: 8,
  background: 'rgba(0, 0, 0, 0.7)',
  color: '#fff',
  font: '14px system-ui, sans-serif',
}
