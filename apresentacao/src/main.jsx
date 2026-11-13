import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import './styles.css'
import { Deck } from './Deck.jsx'
import { Controle } from './Controle.jsx'

function App() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const f = () => setHash(location.hash)
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  // #controle-<código>: celular pareado com o palco daquele computador
  return hash.startsWith('#controle') ? <Controle sala={hash.slice('#controle-'.length) || null} /> : <Deck />
}

createRoot(document.getElementById('root')).render(<App />)
