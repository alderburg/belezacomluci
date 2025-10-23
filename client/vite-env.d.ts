
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEBSOCKET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
