import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useMembranaStore } from '@membrana/agenda'
import './index.css'
import App from './App'
import { registerClientModules } from './modules/registerClientModules'
import { initMediaLibraryHubBridge } from './lib/mediaLibraryHubBridge'
import { initJournalHubBridge } from './lib/journalHubBridge'
import { initMicLiveRealtimeBridge } from './lib/micLiveRealtimeBridge'
import { initUserTemplatesStore } from './plugins/trends-fft-analyzer/userTemplatesStore'

/**
 * Cold-boot order (CRDC R2 / MP4):
 * 1. registerClientModules() — MembranaRegistry + finalizeRegistration()
 * 2. initMediaLibraryHubBridge() — media-library svc.init() / quota fetch
 * 3. other hub bridges (journal, mic-live, templates)
 *
 * Do not call initMediaLibraryHubBridge() before finalizeRegistration().
 * @see apps/client/src/bootstrap-order.test.ts
 */
registerClientModules()
initMediaLibraryHubBridge()
initJournalHubBridge()
initMicLiveRealtimeBridge()
void initUserTemplatesStore()
useMembranaStore.persist.onFinishHydration(() => {
  registerClientModules()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
