import { GlobeMap } from '../map/GlobeMap'
import { TopBar } from './TopBar'
import './app.css'

export function App() {
  return (
    <>
      <TopBar />
      <main className="stage">
        <GlobeMap />
      </main>
    </>
  )
}
