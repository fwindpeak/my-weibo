import { existsSync } from 'fs'
import { stat, readFile } from 'fs/promises'
import { join, normalize } from 'path'

export interface CookieOptions {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'lax' | 'strict' | 'none'
  path?: string
  maxAge?: number
}

export interface RequestContext {
  request: Request
  params: Record<string, string>
  query: Record<string, string | string[]>
  body: unknown
  cookie: Record<string, string>
  setCookie: (name: string, value: string, options?: CookieOptions) => void
  removeCookie: (name: string) => void
  set: {
    status: number
    headers: Headers
  }
}

export type HandlerResult =
  | Response
  | BodyInit
  | Record<string, unknown>
  | unknown[]
  | null
  | undefined
export type Handler = (context: RequestContext) => Promise<HandlerResult> | HandlerResult

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS'

type Route = {
  method: HttpMethod
  pattern?: URLPattern
  handler: Handler
  matchAll: boolean
}

type Hook = (context: RequestContext) => Promise<void> | void

type StaticConfig = {
  prefix: string
  directory: string
}

export interface CorsOptions {
  origin?: string | boolean
  credentials?: boolean
  allowHeaders?: string[]
  allowMethods?: string[]
}

interface ListenCallbackContext {
  port: number
}

function normalizeRoutePath(path: string) {
  if (!path || path === '') {
    return '/'
  }
  if (path === '*') {
    return '*'
  }
  return path.startsWith('/') ? path : `/${path}`
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) {
    return {}
  }

  const pairs = header.split(';')
  const result: Record<string, string> = {}
  for (const pair of pairs) {
    const index = pair.indexOf('=')
    if (index === -1) continue
    const key = pair.slice(0, index).trim()
    const value = pair.slice(index + 1).trim()
    if (key.length === 0) continue
    result[key] = decodeURIComponent(value)
  }
  return result
}

function formatCookie(name: string, value: string, options: CookieOptions = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`]

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`)
  }

  parts.push(`Path=${options.path ?? '/'}`)

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`)
  }

  if (options.httpOnly ?? true) {
    parts.push('HttpOnly')
  }

  if (options.secure) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

function parseQuery(searchParams: URLSearchParams): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {}
  for (const [key, value] of searchParams.entries()) {
    if (key in result) {
      const current = result[key]
      if (Array.isArray(current)) {
        current.push(value)
      } else {
        result[key] = [current, value]
      }
    } else {
      result[key] = value
    }
  }
  return result
}

async function parseBody(request: Request): Promise<unknown> {
  const method = request.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD') {
    return undefined
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      return await request.json()
    } catch {
      return undefined
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await request.formData()
    const data: Record<string, string> = {}
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') {
        data[key] = value
      }
    }
    return data
  }

  return undefined
}

export class Elysia {
  private routes: Route[] = []
  private beforeHooks: Hook[] = []
  private staticFiles: StaticConfig[] = []
  private corsOptions: CorsOptions | undefined

  use(plugin: (app: Elysia) => Elysia): Elysia {
    return plugin(this)
  }

  before(hook: Hook): this {
    this.beforeHooks.push(hook)
    return this
  }

  setCors(options: CorsOptions): this {
    this.corsOptions = options
    return this
  }

  addStatic(prefix: string, directory: string): this {
    const normalizedPrefix = normalizeRoutePath(prefix)
    this.staticFiles.push({ prefix: normalizedPrefix, directory })
    return this
  }

  private register(method: HttpMethod, path: string, handler: Handler): this {
    const normalized = normalizeRoutePath(path)
    if (normalized === '*') {
      this.routes.push({ method, handler, matchAll: true })
      return this
    }

    const pattern = new URLPattern({ pathname: normalized })
    this.routes.push({ method, pattern, handler, matchAll: false })
    return this
  }

  get(path: string, handler: Handler): this {
    return this.register('GET', path, handler)
  }

  post(path: string, handler: Handler): this {
    return this.register('POST', path, handler)
  }

  put(path: string, handler: Handler): this {
    return this.register('PUT', path, handler)
  }

  delete(path: string, handler: Handler): this {
    return this.register('DELETE', path, handler)
  }

  group(prefix: string, builder: (app: GroupBuilder) => GroupBuilder): this {
    const group = new GroupBuilder(this, normalizeRoutePath(prefix))
    builder(group)
    return this
  }

  listen(port: number, callback?: (context: ListenCallbackContext) => void) {
    const server = Bun.serve({
      port,
      fetch: (request: Request) => this.handle(request),
    })

    callback?.({ port: server.port })
    return server
  }

  private async handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const method = request.method.toUpperCase() as HttpMethod
    const cookies = parseCookies(request.headers.get('cookie'))
    const setCookies: string[] = []
    const setHeaders = new Headers()
    const set = { status: 200, headers: setHeaders }
    const body = await parseBody(request)

    const context: RequestContext = {
      request,
      params: {},
      query: parseQuery(url.searchParams),
      body,
      cookie: cookies,
      setCookie: (name, value, options) => {
        setCookies.push(formatCookie(name, value, options))
      },
      removeCookie: (name) => {
        setCookies.push(formatCookie(name, '', { maxAge: 0 }))
      },
      set,
    }

    const corsHeaders = this.buildCorsHeaders(request)
    if (corsHeaders) {
      for (const [key, value] of corsHeaders.entries()) {
        setHeaders.set(key, value)
      }
      if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: this.mergeHeaders(setHeaders, [], undefined) })
      }
    }

    for (const hook of this.beforeHooks) {
      await hook(context)
    }

    const routeMatch = this.findRoute(method, url)
    if (routeMatch) {
      context.params = routeMatch.params
      const result = await routeMatch.route.handler(context)
      return this.toResponse(result, setHeaders, set.status, setCookies)
    }

    const staticResponse = await this.tryServeStatic(url.pathname)
    if (staticResponse) {
      return staticResponse
    }

    return this.toResponse({ message: 'Not Found' }, setHeaders, 404, setCookies)
  }

  private findRoute(method: HttpMethod, url: URL) {
    for (const route of this.routes) {
      if (route.method !== method) {
        continue
      }

      if (route.matchAll) {
        return { route, params: {} }
      }

      const match = route.pattern?.exec(url)
      if (!match) {
        continue
      }

      return { route, params: match.pathname.groups }
    }

    return undefined
  }

  private async tryServeStatic(pathname: string) {
    if (this.staticFiles.length === 0) {
      return null
    }

    for (const config of this.staticFiles) {
      if (!pathname.startsWith(config.prefix)) {
        continue
      }

      const relative = pathname.slice(config.prefix.length).replace(/^\/+/, '')
      const filePath = join(config.directory, relative)
      try {
        if (!existsSync(filePath)) {
          continue
        }
        const stats = await stat(filePath)
        if (stats.isDirectory()) {
          continue
        }
        const file = await readFile(filePath)
        return new Response(file as any)
      } catch {
        continue
      }
    }

    return null
  }

  private buildCorsHeaders(request: Request) {
    if (!this.corsOptions) {
      return null
    }

    const headers = new Headers()
    const originHeader = request.headers.get('origin')
    let allowOrigin = '*'

    if (this.corsOptions.origin === true) {
      allowOrigin = originHeader ?? '*'
    } else if (typeof this.corsOptions.origin === 'string') {
      allowOrigin = this.corsOptions.origin
    } else if (this.corsOptions.origin === false) {
      allowOrigin = 'null'
    } else if (originHeader) {
      allowOrigin = originHeader
    }

    headers.set('Access-Control-Allow-Origin', allowOrigin)
    if (this.corsOptions.credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true')
    }

    if (this.corsOptions.allowHeaders?.length) {
      headers.set('Access-Control-Allow-Headers', this.corsOptions.allowHeaders.join(', '))
    } else {
      const requestHeaders = request.headers.get('access-control-request-headers')
      if (requestHeaders) {
        headers.set('Access-Control-Allow-Headers', requestHeaders)
      }
    }

    if (this.corsOptions.allowMethods?.length) {
      headers.set('Access-Control-Allow-Methods', this.corsOptions.allowMethods.join(', '))
    } else {
      headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    }

    headers.set('Vary', 'Origin')
    return headers
  }

  private mergeHeaders(base: Headers, setCookies: string[], contentType: string | undefined) {
    const headers = new Headers(base)
    if (contentType && !headers.has('Content-Type')) {
      headers.set('Content-Type', contentType)
    }

    for (const value of setCookies) {
      headers.append('Set-Cookie', value)
    }

    return headers
  }

  private toResponse(
    result: HandlerResult,
    headers: Headers,
    status: number,
    setCookies: string[]
  ): Response {
    if (result instanceof Response) {
      const merged = this.mergeHeaders(result.headers, setCookies, undefined)
      return new Response(result.body, {
        status: result.status,
        headers: merged,
      })
    }

    if (result === undefined || result === null) {
      return new Response(null, {
        status,
        headers: this.mergeHeaders(headers, setCookies, undefined),
      })
    }

    if (typeof result === 'string' || result instanceof Uint8Array || result instanceof ArrayBuffer) {
      return new Response(result as BodyInit, {
        status,
        headers: this.mergeHeaders(headers, setCookies, undefined),
      })
    }

    if (Array.isArray(result)) {
      const jsonHeaders = this.mergeHeaders(headers, setCookies, 'application/json; charset=utf-8')
      return new Response(JSON.stringify(result), {
        status,
        headers: jsonHeaders,
      })
    }

    const jsonHeaders = this.mergeHeaders(headers, setCookies, 'application/json; charset=utf-8')
    return new Response(JSON.stringify(result), {
      status,
      headers: jsonHeaders,
    })
  }
}

export class GroupBuilder {
  constructor(private readonly app: Elysia, private readonly prefix: string) {}

  private createPath(path: string) {
    const normalized = normalizeRoutePath(path)
    if (normalized === '*') {
      return normalized
    }

    if (normalized === '/') {
      return this.prefix
    }

    return normalizeRoutePath(`${this.prefix}/${normalized.replace(/^\//, '')}`)
  }

  get(path: string, handler: Handler): this {
    this.app.get(this.createPath(path), handler)
    return this
  }

  post(path: string, handler: Handler): this {
    this.app.post(this.createPath(path), handler)
    return this
  }

  put(path: string, handler: Handler): this {
    this.app.put(this.createPath(path), handler)
    return this
  }

  delete(path: string, handler: Handler): this {
    this.app.delete(this.createPath(path), handler)
    return this
  }
}

export function cookie() {
  return (app: Elysia) => app
}

export function cors(options: CorsOptions = {}) {
  return (app: Elysia) => app.setCors(options)
}

export function staticPlugin(config: { prefix: string; assets: string }) {
  return (app: Elysia) => app.addStatic(config.prefix, normalize(config.assets))
}
