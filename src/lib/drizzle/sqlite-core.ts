export const metadataSymbol = Symbol('drizzle:tableMetadata')

interface ReferenceConfig {
  refFn: () => Column
  options?: { relationName?: string; onDelete?: 'cascade' | 'set null' }
}

interface ColumnBuilderConfig {
  mode?: 'boolean' | 'timestamp_ms'
  onDelete?: 'cascade' | 'set null'
  relationName?: string
}

export class ColumnBuilder {
  public readonly name: string
  private readonly columnName: string
  public readonly dataType: 'text' | 'integer'
  private readonly config: {
    notNull: boolean
    unique: boolean
    primaryKey: boolean
    defaultValue: unknown
    defaultFn?: () => unknown
    references?: ReferenceConfig
    mode?: 'boolean' | 'timestamp_ms'
    onDelete?: 'cascade' | 'set null'
    relationName?: string
  }

  constructor(name: string, dataType: 'text' | 'integer', config: ColumnBuilderConfig = {}) {
    this.name = name
    this.dataType = dataType
    this.columnName = name
    this.config = {
      notNull: false,
      unique: false,
      primaryKey: false,
      defaultValue: undefined,
      defaultFn: undefined,
      references: undefined,
      mode: config.mode,
      onDelete: config.onDelete,
      relationName: config.relationName,
    }
  }

  primaryKey() {
    this.config.primaryKey = true
    return this
  }

  notNull() {
    this.config.notNull = true
    return this
  }

  unique() {
    this.config.unique = true
    return this
  }

  default(value: unknown) {
    this.config.defaultValue = value
    return this
  }

  $defaultFn(fn: () => unknown) {
    this.config.defaultFn = fn
    return this
  }

  references(refFn: () => Column, options: { relationName?: string; onDelete?: 'cascade' | 'set null' } = {}) {
    this.config.references = { refFn, options }
    if (options.onDelete) {
      this.config.onDelete = options.onDelete
    }
    if (options.relationName) {
      this.config.relationName = options.relationName
    }
    return this
  }

  build(table: Table<any>, propertyKey: string) {
    return new Column(table, propertyKey, this.columnName, this.dataType, this.config)
  }
}

export class Column {
  public readonly table: Table<any>
  public readonly propertyKey: string
  public readonly dataType: 'text' | 'integer'
  public readonly name: string
  public readonly notNull: boolean
  public readonly unique: boolean
  public readonly primaryKey: boolean
  public readonly defaultValue: unknown
  public readonly defaultFn?: () => unknown
  public readonly references?: ReferenceConfig
  public readonly mode?: 'boolean' | 'timestamp_ms'
  public readonly onDelete?: 'cascade' | 'set null'

  constructor(
    table: Table<any>,
    propertyKey: string,
    columnName: string,
    dataType: 'text' | 'integer',
    config: ColumnBuilder['config']
  ) {
    this.table = table
    this.propertyKey = propertyKey
    this.dataType = dataType
    this.name = columnName
    this.notNull = config.notNull
    this.unique = config.unique
    this.primaryKey = config.primaryKey
    this.defaultValue = config.defaultValue
    this.defaultFn = config.defaultFn
    this.references = config.references
    this.mode = config.mode
    this.onDelete = config.onDelete
  }

  get tableName() {
    return this.table.tableName
  }

  get fullName() {
    return `${this.tableName}.${this.name}`
  }
}

export type TableColumns = Record<string, Column>

export interface Table<TColumns extends TableColumns> {
  tableName: string
  columns: TColumns
  primaryKey?: Column
  [metadataSymbol]: {
    indexes: Array<{ type: 'unique'; name: string; columns: Column[] }>
    relations: Record<string, RelationDefinition>
  }
  [key: string]: any
}

export interface RelationDefinition {
  type: 'one' | 'many'
  table: Table<any>
  fields?: Column[]
  references?: Column[]
  relationName?: string
}

function createColumnBuilder(dataType: 'text' | 'integer') {
  return (name: string, config?: ColumnBuilderConfig) => new ColumnBuilder(name, dataType, config)
}

export const text = createColumnBuilder('text')
export const integer = createColumnBuilder('integer')

export function sqliteTable<TColumns extends Record<string, ColumnBuilder>>(
  tableName: string,
  columnBuilders: TColumns,
  extras?: (table: Table<{ [K in keyof TColumns]: Column }>) => unknown
): Table<{ [K in keyof TColumns]: Column }> & { [K in keyof TColumns]: Column } {
  const table: Table<{ [K in keyof TColumns]: Column }> & { [K in keyof TColumns]: Column } = {
    tableName,
    columns: {} as any,
    [metadataSymbol]: {
      indexes: [],
      relations: {},
    },
  } as Table<{ [K in keyof TColumns]: Column }> & { [K in keyof TColumns]: Column }

  for (const [propertyKey, builder] of Object.entries(columnBuilders)) {
    const column = builder.build(table, propertyKey)
    table.columns[propertyKey as keyof TColumns] = column as Column
    ;(table as any)[propertyKey] = column
    if (column.primaryKey) {
      table.primaryKey = column
    }
  }

  if (typeof extras === 'function') {
    const extrasResult = extras(table as Table<{ [K in keyof TColumns]: Column }>)
    if (extrasResult && typeof extrasResult === 'object') {
      for (const value of Object.values(extrasResult as Record<string, unknown>)) {
        if (!value || typeof value !== 'object') continue
        const record = value as { type?: string; name?: string; columns?: Column[] }
        if (record.type === 'unique' && record.name && Array.isArray(record.columns)) {
          table[metadataSymbol].indexes.push({
            type: 'unique',
            name: record.name,
            columns: record.columns,
          })
        }
      }
    }
  }

  return table
}

export interface UniqueIndexBuilderResult {
  type: 'unique'
  name: string
  columns: Column[]
}

export function uniqueIndex(name: string) {
  return {
    on(...columns: Column[]): UniqueIndexBuilderResult {
      return { type: 'unique', name, columns }
    },
  }
}
