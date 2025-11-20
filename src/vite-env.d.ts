/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LINERA_NODE_URL: string;
  readonly VITE_LINERA_GRAPHQL_URL: string;
  readonly VITE_NETWORK_TYPE: string;
  readonly GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
