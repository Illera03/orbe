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

/** Mide los fps de la página con requestAnimationFrame hasta que se llama a la función devuelta. */
export function watchFps(onFps: (fps: number) => void): () => void {
  const tick = createFpsCounter(onFps)
  let id = 0
  const frame = (now: number) => {
    tick(now)
    id = requestAnimationFrame(frame)
  }
  id = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(id)
}
