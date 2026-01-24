const IS_NETLIFY = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app')

export function getApiUrl(path: string): string {
  // Production (Netlify): use same-origin /api/* which is rewritten to functions.
  // Dev (Vite): still use /api/* and let Vite proxy handle it.
  if (IS_NETLIFY) return path
  return path
}

export function getMusicUrl(url: string): string {
  // Netlify functions returns a full Supabase public URL; keep as-is.
  // In dev, if a relative URL is ever returned, keep it relative.
  return url
}
