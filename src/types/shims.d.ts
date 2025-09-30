declare module 'bun:sqlite' {
  export class Database {
    constructor(path: string, options?: { create?: boolean })
    prepare<T extends any[]>(sql: string): {
      get(...params: T): any
      all(...params: T): any[]
      run(...params: T): void
    }
    exec(sql: string): void
    close(): void
  }
}

declare const Bun: {
  file(path: string): {
    exists(): Promise<boolean>
    arrayBuffer(): Promise<ArrayBuffer>
    text(): Promise<string>
    stream(): ReadableStream
  }
  write(path: string, data: any): Promise<void>
  serve(config: { port?: number; fetch: (request: Request) => Response | Promise<Response> }): {
    port: number
  }
}

declare interface ImportMeta {
  env?: Record<string, string | undefined>
}

declare class URLPattern {
  constructor(init: { pathname: string })
  exec(url: URL): { pathname: { groups: Record<string, string> } } | null
}

declare module 'vite' {
  export const defineConfig: (...args: any[]) => any
  export default defineConfig
}

declare module '@vitejs/plugin-react-swc' {
  const plugin: (...args: any[]) => any
  export default plugin
}
