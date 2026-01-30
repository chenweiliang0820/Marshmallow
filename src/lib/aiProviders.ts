type ProviderConfig = {
  baseUrl: string
  apiKey?: string
}

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

export function getImageProviderConfig(): ProviderConfig {
  const baseUrl = required('VITE_IMAGE_API_BASE_URL', import.meta.env.VITE_IMAGE_API_BASE_URL)
  const apiKey = import.meta.env.VITE_IMAGE_API_KEY
  return { baseUrl, apiKey }
}

export function getTextProviderConfig(): ProviderConfig {
  const baseUrl = required('VITE_TEXT_API_BASE_URL', import.meta.env.VITE_TEXT_API_BASE_URL)
  const apiKey = import.meta.env.VITE_TEXT_API_KEY
  return { baseUrl, apiKey }
}

export async function callTextApi<T>(path: string, payload: unknown): Promise<T> {
  const { baseUrl, apiKey } = getTextProviderConfig()
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Text API error: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`)
  }

  return (await res.json()) as T
}

export async function callImageApi<T>(path: string, payload: unknown): Promise<T> {
  const { baseUrl, apiKey } = getImageProviderConfig()
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Image API error: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`)
  }

  return (await res.json()) as T
}
