import { GlobeMap } from '../map/GlobeMap'
import { CatalogPanel } from './CatalogPanel'
import { Dock } from './Dock'
import { Ranking } from './Ranking'
import { SourceCard } from './SourceCard'
import { TopBar } from './TopBar'
import { Tooltip } from './Tooltip'
import './app.css'

// Disposición (app.css): columna izquierda con catálogo y ficha de fuente; leyenda y año abajo en el centro (Dock).
// Clasificación a la derecha (Ranking) y botón de tabla en la barra superior.
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
        <Ranking />
        <Tooltip />
        <Dock />
      </main>
    </>
  )
}
