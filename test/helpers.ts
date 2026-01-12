import { expect } from 'vitest';
import type {
  ASTNode,
  Field,
  Literal,
  List,
  FunctionNode,
  OrderByClause,
  OrderByField,
  OrderDirection
} from '../src/types';
import { transformFieldsToConstantsMap } from '../src/field-transformer';
import { fields } from './fields';
import { fieldTypes } from './fieldTypes';

/**
 * 验证二元表达式 (如: field = value, field in list)
 */
export function expectBinaryExpression(options: {
  node: ASTNode | null;
  operator: string;
  left: Partial<ASTNode>;
  right: Partial<ASTNode>;
}) {
  const { node, operator, left, right } = options;
  expect(node).not.toBeNull();
  expect(node?.type).toBe('BinaryExpression');
  expect(node?.operator).toBe(operator);
  expect(node?.left).toMatchObject(left);
  expect(node?.right).toMatchObject(right);
}

/**
 * 验证逻辑表达式 (如: expr AND expr, expr OR expr)
 */
export function expectLogicalExpression(options: {
  node: ASTNode | null;
  operator: 'AND' | 'OR';
}) {
  const { node, operator } = options;
  expect(node).not.toBeNull();
  expect(node?.type).toBe('LogicalExpression');
  expect(node?.operator).toBe(operator);
  return {
    left: node?.left,
    right: node?.right
  };
}

/**
 * 验证字段节点
 */
export function expectField(options: {
  node: ASTNode | null;
  fieldName: string;
}) {
  const { node, fieldName } = options;
  expect(node).not.toBeNull();
  expect(node?.type).toBe('Field');
  expect(node?.value).toBe(fieldName);
}

/**
 * 验证列表节点
 */
export function expectList(options: {
  node: ASTNode | null;
  elements: Partial<ASTNode>[];
}) {
  const { node, elements } = options;
  expect(node).not.toBeNull();
  expect(node?.type).toBe('List');
  expect(node?.elements).toMatchObject(elements);
}

/**
 * 验证函数节点
 */
export function expectFunction(options: {
  node: ASTNode | null;
  name: string;
  args?: any[];
}) {
  const { node, name, args = [] } = options;
  expect(node).not.toBeNull();
  expect(node?.type).toBe('Function');
  expect(node?.name).toBe(name);
  expect(node?.arguments).toEqual(args);
}

/**
 * 验证完整的 JQL 查询节点（包含 where 和 orderBy）
 */
export function expectJQLQuery(options: {
  node: ASTNode | null;
}) {
  const { node } = options;
  expect(node).not.toBeNull();
  expect(node?.type).toBe('JQLQuery');
  return {
    where: (node as any)?.where,
    orderBy: (node as any)?.orderBy
  };
}

/**
 * 验证 ORDER BY 子句
 */
export function expectOrderByClause(options: {
  node: ASTNode | null;
  fields: Array<{ field: string; direction: OrderDirection }>;
}) {
  const { node, fields } = options;
  expect(node).not.toBeNull();
  expect(node?.type).toBe('OrderByClause');
  expect(node?.fields).toHaveLength(fields.length);

  fields.forEach((expectedField, index) => {
    const actualField = (node as any)?.fields[index];
    expect(actualField?.type).toBe('OrderByField');
    expect(actualField?.field).toBe(expectedField.field);
    expect(actualField?.direction).toBe(expectedField.direction);
  });
}

/**
 * 验证单个 ORDER BY 字段
 */
export function expectOrderByField(options: {
  node: ASTNode | null;
  field: string;
  direction: OrderDirection;
}) {
  const { node, field: fieldName, direction } = options;
  expect(node).not.toBeNull();
  expect(node?.type).toBe('OrderByField');
  expect((node as any)?.field).toBe(fieldName);
  expect((node as any)?.direction).toBe(direction);
}

/**
 * 创建字段对象（用于断言）
 */
export const field = (value: string): Partial<Field> => ({
  type: 'Field',
  value
});

/**
 * 创建字面量对象（用于断言）
 */
export const literal = (value: string | number): Partial<Literal> => ({
  type: 'Literal',
  value
});

/**
 * 创建函数对象（用于断言）
 */
export const func = (name: string, args: any[] = []): Partial<FunctionNode> => ({
  type: 'Function',
  name,
  arguments: args
});

/**
 * 创建列表对象（用于断言）
 */
export const list = (elements: Partial<ASTNode>[]): Partial<List> => ({
  type: 'List',
  elements: elements as ASTNode[]
});

/**
 * 创建 ORDER BY 字段对象（用于断言）
 */
export const orderByField = (field: string, direction: OrderDirection = 'ASC'): Partial<OrderByField> => ({
  type: 'OrderByField',
  field,
  direction
});

/**
 * 创建 ORDER BY 子句对象（用于断言）
 */
export const orderByClause = (fields: Array<{ field: string; direction: OrderDirection }>): Partial<OrderByClause> => ({
  type: 'OrderByClause',
  fields: fields.map(f => orderByField(f.field, f.direction)) as OrderByField[]
});

/**
 * 公共测试数据配置
 * 通过 transformFieldsToConstantsMap 从 fields 数组转换而来
 */
export const testConstants = transformFieldsToConstantsMap({
  fields: fields as any,
  fieldTypes: fieldTypes as any,
  projectMap: {
    BBB: "BBB",
    SCRU: "SCRU",
    AA: "项目 A",
  },
  versionMap: {
    "Version 1.0": ["10000", "10100"],
    "Version 2.0": ["10001"],
    "Version 3.0": ["10002"],
  }
});
