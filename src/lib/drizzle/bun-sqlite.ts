import type { Database } from 'bun:sqlite'

import { metadataSymbol, type Column, type Table } from './sqlite-core'
import type { ConditionExpression, OrderByExpression } from './index'
import { and, inArray } from './index'

function normalizeValue(column: Column, value: unknown) {
  if (value === undefined) return undefined
  if (value === null) return null

  if (column.dataType === 'integer') {
    if (column.mode === 'boolean') {
      return value ? 1 : 0
    }
    if (column.mode === 'timestamp_ms') {
      if (value instanceof Date) {
        return value.getTime()
      }
      return Number(value)
    }
    if (value instanceof Date) {
      return value.getTime()
    }
    return Number(value)
  }

  return value
}

function parseValue(column: Column, value: unknown) {
  if (value === null || value === undefined) {
    return value as null
  }

  if (column.dataType === 'integer') {
    if (column.mode === 'boolean') {
      return Boolean(value)
    }
    if (column.mode === 'timestamp_ms') {
      return new Date(Number(value))
    }
    return Number(value)
  }

  return value
}

function mapRow(table: Table<any>, row: Record<string, unknown>) {
  const result: Record<string, unknown> = {}
  for (const [key, column] of Object.entries<Column>(table.columns)) {
    result[key] = parseValue(column, row[column.name])
  }
  return result
}

function evaluateWhere(table: Table<any>, where?: ConditionExpression | ((fields: any) => ConditionExpression | undefined)) {
  if (!where) return null
  const expression = typeof where === 'function' ? where(table.columns) : where
  if (!expression) return null
  return buildCondition(expression)
}

function buildCondition(expression: ConditionExpression): { sql: string; params: unknown[] } {
  if (expression.type === 'and') {
    const parts = (expression.conditions ?? [])
      .map((part) => buildCondition(part))
      .filter((part) => part.sql.length > 0)

    if (parts.length === 0) {
      return { sql: '', params: [] }
    }

    const sql = parts.map((part) => `(${part.sql})`).join(' AND ')
    const params = parts.flatMap((part) => part.params)
    return { sql, params }
  }

  if (expression.type === 'eq' && expression.column) {
    const column = expression.column as Column
    const value = normalizeValue(column, expression.value)
    return { sql: `${column.tableName}.${column.name} = ?`, params: [value] }
  }

  if (expression.type === 'like' && expression.column) {
    const column = expression.column as Column
    return { sql: `${column.tableName}.${column.name} LIKE ?`, params: [expression.value] }
  }

  if (expression.type === 'in' && expression.column) {
    const column = expression.column as Column
    const values = Array.isArray(expression.values) ? expression.values : []
    if (values.length === 0) {
      return { sql: '0', params: [] }
    }
    const placeholders = values.map(() => '?').join(', ')
    const params = values.map((value) => normalizeValue(column, value))
    return { sql: `${column.tableName}.${column.name} IN (${placeholders})`, params }
  }

  return { sql: '', params: [] }
}

function buildOrderBy(orderBy?: OrderByExpression | OrderByExpression[]) {
  if (!orderBy) return ''
  const items = Array.isArray(orderBy) ? orderBy : [orderBy]
  const parts = items
    .filter((item) => item?.column)
    .map((item) => {
      const column = item.column as Column
      return `${column.tableName}.${column.name} ${item.direction}`
    })
  if (parts.length === 0) {
    return ''
  }
  return ` ORDER BY ${parts.join(', ')}`
}

function projectRow(table: Table<any>, row: Record<string, unknown>, columns?: Record<string, boolean>) {
  if (!columns) {
    return row
  }
  const allowed = Object.entries(columns)
    .filter(([, include]) => include)
    .map(([key]) => key)
  const result: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in row) {
      result[key] = row[key]
    }
  }
  for (const key of Object.keys(row)) {
    if (!(key in table.columns)) {
      result[key] = row[key]
    }
  }
  return result
}

export class DrizzleDatabase {
  constructor(private readonly sqlite: Database, private readonly schema: Record<string, Table<any>>) {
    this.query = {}
    this.relationMap = new Map()
    this._initializeRelations()
    for (const [key, table] of Object.entries(this.schema)) {
      this.query[key] = {
        findMany: (options: QueryOptions = {}) => this._findMany(table, options),
        findFirst: async (options: QueryOptions = {}) => {
          const rows = await this._findMany(table, { ...options, limit: 1 })
          return rows[0] ?? null
        },
      }
    }
  }

  public readonly query: Record<string, { findMany: (options?: QueryOptions) => Promise<any[]>; findFirst: (options?: QueryOptions) => Promise<any | null> }>
  private readonly relationMap: Map<Table<any>, Record<string, any>>

  private _initializeRelations() {
    for (const table of Object.values(this.schema)) {
      const metadata = table[metadataSymbol]
      if (metadata) {
        this.relationMap.set(table, metadata.relations || {})
      }
    }
  }

  public async findMany(table: Table<any>, options: QueryOptions = {}) {
    return this._findMany(table, options)
  }

  private async _findMany(table: Table<any>, options: QueryOptions = {}) {
    const whereClause = evaluateWhere(table, options.where)
    const orderByClause = buildOrderBy(options.orderBy)
    const limitClause = options.limit ? ` LIMIT ${options.limit}` : ''

    const sqlParts = [`SELECT * FROM ${table.tableName}`]
    const params: unknown[] = []

    if (whereClause && whereClause.sql.length > 0) {
      sqlParts.push(`WHERE ${whereClause.sql}`)
      params.push(...whereClause.params)
    }

    if (orderByClause) {
      sqlParts.push(orderByClause)
    }

    if (limitClause) {
      sqlParts.push(limitClause)
    }

    const statement = this.sqlite.prepare(sqlParts.join(' '))
    const rows = statement.all(...params).map((row: any) => mapRow(table, row))

    if (options.with && rows.length > 0) {
      await this._loadRelations(table, rows, options.with)
    }

    if (options.columns) {
      return rows.map((row) => projectRow(table, row, options.columns))
    }

    return rows
  }

  private async _loadRelations(table: Table<any>, rows: Record<string, unknown>[], config: Record<string, QueryOptions>) {
    const relations = this.relationMap.get(table) || {}
    for (const [name, relationOptions] of Object.entries(config)) {
      const definition = relations[name]
      if (!definition) continue
      if (definition.type === 'one') {
        await this._loadOneRelation(table, rows, name, definition, relationOptions)
      } else if (definition.type === 'many') {
        await this._loadManyRelation(table, rows, name, definition, relationOptions)
      }
    }
  }

  private async _loadOneRelation(
    baseTable: Table<any>,
    baseRows: Record<string, unknown>[],
    relationName: string,
    definition: any,
    options: QueryOptions
  ) {
    const baseColumn: Column | undefined = definition.fields?.[0]
    const referenceColumn: Column | undefined = definition.references?.[0]
    const targetTable: Table<any> = definition.table

    if (!baseColumn || !referenceColumn) {
      return
    }

    const keys = Array.from(
      new Set(
        baseRows
          .map((row) => row[baseColumn.propertyKey])
          .filter((value) => value !== null && value !== undefined)
      )
    )

    if (keys.length === 0) {
      for (const row of baseRows) {
        row[relationName] = null
      }
      return
    }

    const related = await this._findMany(targetTable, {
      where: (fields: any) => inArray(fields[referenceColumn.propertyKey], keys),
      with: options.with,
      orderBy: options.orderBy,
      columns: options.columns,
    })

    const map = new Map()
    for (const item of related) {
      map.set(item[referenceColumn.propertyKey], item)
    }

    for (const row of baseRows) {
      const key = row[baseColumn.propertyKey]
      row[relationName] = map.has(key) ? map.get(key) : null
    }
  }

  private async _loadManyRelation(
    baseTable: Table<any>,
    baseRows: Record<string, unknown>[],
    relationName: string,
    definition: any,
    options: QueryOptions
  ) {
    const targetTable: Table<any> = definition.table
    const targetRelations = this.relationMap.get(targetTable) || {}
    const backlink = Object.values(targetRelations).find((rel: any) => rel.type === 'one' && rel.table === baseTable)
    if (!backlink) {
      for (const row of baseRows) {
        row[relationName] = []
      }
      return
    }

    const foreignColumn: Column | undefined = backlink.fields?.[0]
    if (!foreignColumn) {
      for (const row of baseRows) {
        row[relationName] = []
      }
      return
    }

    const primaryKey = baseTable.primaryKey
    if (!primaryKey) {
      for (const row of baseRows) {
        row[relationName] = []
      }
      return
    }

    const keys = Array.from(
      new Set(
        baseRows
          .map((row) => row[primaryKey.propertyKey])
          .filter((value) => value !== null && value !== undefined)
      )
    )

    if (keys.length === 0) {
      for (const row of baseRows) {
        row[relationName] = []
      }
      return
    }

    const related = await this._findMany(targetTable, {
      where: (fields: any) => inArray(fields[foreignColumn.propertyKey], keys),
      with: options.with,
      orderBy: options.orderBy,
      columns: options.columns,
    })

    const grouped = new Map<any, any[]>()
    for (const item of related) {
      const key = item[foreignColumn.propertyKey]
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(item)
    }

    for (const row of baseRows) {
      const key = row[primaryKey.propertyKey]
      row[relationName] = grouped.get(key) || []
    }
  }

  insert(table: Table<any>) {
    return new InsertBuilder(this.sqlite, table)
  }

  update(table: Table<any>) {
    return new UpdateBuilder(this.sqlite, this, table)
  }

  delete(table: Table<any>) {
    return new DeleteBuilder(this.sqlite, table)
  }

  async transaction<T>(callback: (db: DrizzleDatabase) => Promise<T>) {
    this.sqlite.exec('BEGIN')
    try {
      const result = await callback(this)
      this.sqlite.exec('COMMIT')
      return result
    } catch (error) {
      this.sqlite.exec('ROLLBACK')
      throw error
    }
  }
}

interface QueryOptions {
  where?: ConditionExpression | ((fields: any) => ConditionExpression | undefined)
  orderBy?: OrderByExpression | OrderByExpression[]
  limit?: number
  with?: Record<string, QueryOptions>
  columns?: Record<string, boolean>
}

class InsertBuilder {
  constructor(private readonly sqlite: Database, private readonly table: Table<any>) {}

  private rows: Record<string, unknown>[] = []

  values(data: Record<string, unknown> | Record<string, unknown>[]) {
    this.rows = Array.isArray(data) ? data : [data]
    return this
  }

  async returning() {
    return this.execute(true)
  }

  async run() {
    await this.execute(false)
  }

  private async execute(withReturning: boolean) {
    if (this.rows.length === 0) {
      return withReturning ? [] : undefined
    }

    const columns = Object.values<Column>(this.table.columns)
    const columnNames = columns.map((column) => column.name)
    const placeholders = columnNames.map(() => '?').join(', ')
    const statement = this.sqlite.prepare(
      `INSERT INTO ${this.table.tableName} (${columnNames.join(', ')}) VALUES (${placeholders})`
    )

    const inserted: Record<string, unknown>[] = []

    for (const inputRow of this.rows) {
      const row = { ...inputRow }
      for (const column of columns) {
        if (row[column.propertyKey] === undefined) {
          if (typeof column.defaultFn === 'function') {
            row[column.propertyKey] = column.defaultFn()
          } else if (column.defaultValue !== undefined) {
            row[column.propertyKey] = column.defaultValue
          }
        }
      }
      const values = columns.map((column) => normalizeValue(column, row[column.propertyKey]))
      statement.run(...values)
      inserted.push(row)
    }

    if (!withReturning) {
      return undefined
    }

    const primaryKey = this.table.primaryKey
    if (!primaryKey) {
      return []
    }

    const select = this.sqlite.prepare(
      `SELECT * FROM ${this.table.tableName} WHERE ${primaryKey.name} = ? LIMIT 1`
    )

    return inserted
      .map((row) => {
        const keyValue = normalizeValue(primaryKey, row[primaryKey.propertyKey])
        const fetched = select.get(keyValue as any)
        return fetched ? mapRow(this.table, fetched) : null
      })
      .filter((row): row is Record<string, unknown> => Boolean(row))
  }
}

class UpdateBuilder {
  constructor(private readonly sqlite: Database, private readonly db: DrizzleDatabase, private readonly table: Table<any>) {}

  private valuesToSet: Record<string, unknown> = {}
  private whereClause?: ConditionExpression | ((fields: any) => ConditionExpression | undefined)

  set(values: Record<string, unknown>) {
    this.valuesToSet = values
    return this
  }

  where(condition: ConditionExpression | ((fields: any) => ConditionExpression | undefined)) {
    this.whereClause = condition
    return this
  }

  async returning() {
    await this.execute()
    return this.db.findMany(this.table, { where: this.whereClause })
  }

  async run() {
    await this.execute()
  }

  private async execute() {
    const entries = Object.entries(this.valuesToSet)
    if (entries.length === 0) return

    const sets: string[] = []
    const params: unknown[] = []

    for (const [key, value] of entries) {
      const column = this.table.columns[key]
      if (!column) continue
      sets.push(`${column.name} = ?`)
      params.push(normalizeValue(column, value))
    }

    const where = evaluateWhere(this.table, this.whereClause)
    const sqlParts = [`UPDATE ${this.table.tableName} SET ${sets.join(', ')}`]
    if (where && where.sql.length > 0) {
      sqlParts.push(`WHERE ${where.sql}`)
      params.push(...where.params)
    }

    const statement = this.sqlite.prepare(sqlParts.join(' '))
    statement.run(...params)
  }
}

class DeleteBuilder {
  constructor(private readonly sqlite: Database, private readonly table: Table<any>) {}

  private whereClause?: ConditionExpression | ((fields: any) => ConditionExpression | undefined)

  where(condition: ConditionExpression | ((fields: any) => ConditionExpression | undefined)) {
    this.whereClause = condition
    this.execute()
    return Promise.resolve()
  }

  private execute() {
    const where = evaluateWhere(this.table, this.whereClause)
    const sqlParts = [`DELETE FROM ${this.table.tableName}`]
    const params: unknown[] = []
    if (where && where.sql.length > 0) {
      sqlParts.push(`WHERE ${where.sql}`)
      params.push(...where.params)
    }
    const statement = this.sqlite.prepare(sqlParts.join(' '))
    statement.run(...params)
  }
}

export function drizzle(sqlite: Database, { schema }: { schema: Record<string, Table<any>> }) {
  return new DrizzleDatabase(sqlite, schema)
}
