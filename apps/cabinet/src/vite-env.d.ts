/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CABINET_API_URL?: string;
  readonly VITE_MEDIA_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
