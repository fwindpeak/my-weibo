const rawBaseUrl = import.meta?.env?.VITE_API_BASE_URL ?? ''
const normalizedBaseUrl = rawBaseUrl?.replace(/\/$/, '') || ''

function resolveUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBaseUrl}${normalizedPath}`
}

export function apiFetch(input: string, init?: RequestInit) {
  const url = resolveUrl(input)
  const mergedInit: RequestInit = {
    credentials: 'include',
    ...init,
  }

  if (init?.headers) {
    mergedInit.headers = init.headers
  }

  return fetch(url, mergedInit)
}

export function getApiBaseUrl() {
  return normalizedBaseUrl
}
