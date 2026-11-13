/** Cuenta fotogramas por ventanas de un segundo; `now` en milisegundos. */
export function createFpsCounter(onFps: (fps: number) => void) {
  let start = -1
  let frames = 0
  return (now: number) => {
    if (start < 0) {
      start = now
      return
    }
    frames++
    const elapsed = now - start
    if (elapsed >= 1000) {
      onFps(Math.round((frames * 1000) / elapsed))
      start = now
      frames = 0
    }
  }
}
