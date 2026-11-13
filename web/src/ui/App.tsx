import { TopBar } from './TopBar'
import './app.css'

export function App() {
  return (
    <>
      <TopBar />
      <main className="stage">
        {/* Punto de montaje del mapa a pantalla completa (MAPA-1). */}
        <div id="map" className="map" />
      </main>
    </>
  )
}
