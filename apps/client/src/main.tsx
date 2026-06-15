import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useMembranaStore } from '@membrana/agenda'
import './index.css'
import App from './App'
import { registerClientModules } from './modules/registerClientModules'
import { initMediaLibraryHubBridge } from './lib/mediaLibraryHubBridge'
import { initJournalHubBridge } from './lib/journalHubBridge'
import { initUserTemplatesStore } from './plugins/trends-fft-analyzer/userTemplatesStore'

registerClientModules()
initMediaLibraryHubBridge()
initJournalHubBridge()
void initUserTemplatesStore()
useMembranaStore.persist.onFinishHydration(() => {
  registerClientModules()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
