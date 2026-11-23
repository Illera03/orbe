import { GlobeMap } from '../map/GlobeMap'
import { CatalogPanel } from './CatalogPanel'
import { Dock } from './Dock'
import { SourceCard } from './SourceCard'
import { TopBar } from './TopBar'
import './app.css'

// Disposición (app.css): columna izquierda con catálogo y ficha de fuente; leyenda y año abajo en el centro (Dock).
// Huecos para la ola 2 de M2: ranking a la derecha y el botón de tabla en la barra superior.
export function App() {
  return (
    <>
      <TopBar />
      <main className="stage">
        <GlobeMap />
        <div className="sidebar">
          <CatalogPanel />
          <SourceCard />
        </div>
        <Dock />
      </main>
    </>
  )
}
