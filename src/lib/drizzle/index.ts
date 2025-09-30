import type { RelationDefinition, Table } from './sqlite-core'
import { metadataSymbol } from './sqlite-core'

export interface OrderByExpression {
  column: any
  direction: 'ASC' | 'DESC'
}

export interface ConditionExpression {
  type: 'and' | 'eq' | 'like' | 'in'
  column?: any
  value?: unknown
  values?: unknown[]
  conditions?: ConditionExpression[]
}

export function relations<TTable extends Table<any>>(
  table: TTable,
  builder: (helpers: {
    one: (target: Table<any>, config?: { fields?: any[]; references?: any[]; relationName?: string }) => RelationDefinition
    many: (target: Table<any>, config?: { relationName?: string }) => RelationDefinition
  }) => Record<string, RelationDefinition>
) {
  const relationDefs = builder({
    one(target, config = {}) {
      return {
        type: 'one',
        table: target,
        fields: config.fields,
        references: config.references,
        relationName: config.relationName,
      }
    },
    many(target, config = {}) {
      return {
        type: 'many',
        table: target,
        relationName: config.relationName,
      }
    },
  })

  const metadata = table[metadataSymbol]
  if (metadata) {
    metadata.relations = metadata.relations || {}
    for (const [key, value] of Object.entries(relationDefs)) {
      metadata.relations[key] = value
    }
  }

  return relationDefs
}

export function asc(column: any): OrderByExpression {
  return { column, direction: 'ASC' }
}

export function desc(column: any): OrderByExpression {
  return { column, direction: 'DESC' }
}

export function eq(column: any, value: unknown): ConditionExpression {
  return { type: 'eq', column, value }
}

export function like(column: any, value: unknown): ConditionExpression {
  return { type: 'like', column, value }
}

export function and(...conditions: ConditionExpression[]): ConditionExpression {
  return { type: 'and', conditions }
}

export function inArray(column: any, values: unknown[]): ConditionExpression {
  return { type: 'in', column, values }
}
