import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useMembranaStore } from '@membrana/agenda'
import './index.css'
import App from './App'
import { registerClientModules } from './modules/registerClientModules'

registerClientModules()
useMembranaStore.persist.onFinishHydration(() => {
  registerClientModules()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
