/// <reference types="vite/client" />

export {}; // keep file a module

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;

    readonly VITE_TEXT_API_BASE_URL?: string;
    readonly VITE_TEXT_API_KEY?: string;

    readonly VITE_IMAGE_API_BASE_URL?: string;
    readonly VITE_IMAGE_API_KEY?: string;

    // add other VITE_* vars here as readonly strings
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}