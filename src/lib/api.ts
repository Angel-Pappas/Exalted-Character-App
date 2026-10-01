// Client for the app's own Laravel API (backend/), served from the same origin
// under /api. Replaces the Supabase client.
//
// Calls resolve to `{ data, error }` rather than throwing, the same contract
// the Supabase client had, so callers keep their existing error handling.

export interface ApiResult<T> {
  data: T | null
  error: string | null
  status: number
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** The CSRF token Laravel sets in the readable XSRF-TOKEN cookie. */
export function readXsrfToken(cookie: string): string | null {
  const match = cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * The message to show for a failed request: the first validation error when
 * there is one (Laravel's 422 shape), otherwise the response's own message.
 */
export function errorMessage(status: number, body: unknown): string {
  if (body && typeof body === 'object') {
    const { errors, message } = body as { errors?: Record<string, string[]>; message?: unknown }
    const first = errors ? Object.values(errors).flat()[0] : undefined
    if (typeof first === 'string') return first
    if (typeof message === 'string' && message) return message
  }
  return `Request failed (${status}).`
}

export async function api<T = unknown>(method: Method, path: string, body?: unknown): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const xsrf = readXsrfToken(document.cookie)
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf

  let response: Response
  try {
    response = await fetch(`/api/${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    return { data: null, error: 'Could not reach the server.', status: 0 }
  }

  const text = await response.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = null
    }
  }

  if (!response.ok) return { data: null, error: errorMessage(response.status, parsed), status: response.status }
  return { data: parsed as T, error: null, status: response.status }
}
