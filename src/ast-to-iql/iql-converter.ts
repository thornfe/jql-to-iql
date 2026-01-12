import type { ASTNode, ConstantsMap } from '../types';
import {
  SUPPORTED_FIELD_TYPES,
  COMPARISON_OPERATORS,
  SET_OPERATORS,
  NULL_OPERATORS,
  LOGICAL_OPERATORS,
  IQL_LOGICAL_OPERATORS,
  AST_NODE_TYPES,
  SQL_CLAUSES,
} from '../constants';
import {
  convertProjectField,
  convertIssuetypeField,
  convertUserField,
  convertVersionField,
  convertStatusField,
  convertComponentField,
  convertCascadeField,
  convertSprintField,
  convertPriorityField,
  convertEnumField,
  convertTextField,
  convertNumberField,
  convertDateField,
  convertUserGroupField,
  normalizeFieldName
} from './field-converters';

/**
 * 验证运算符是否合法
 * @param operator 运算符
 * @param rightNode 右侧节点
 * @returns 是否合法
 */
function isValidOperator(operator: string, rightNode: any): boolean {
  const normalizedOp = operator.toLowerCase();
  const nodeType = rightNode?.type;
  const nodeValue = rightNode?.value;

  // 检查是否为 NULL/EMPTY 值
  const isNull = nodeType === 'Literal' &&
    /^(null|empty)$/i.test(String(nodeValue));

  // 根据运算符类型快速判断
  switch (normalizedOp) {
    case COMPARISON_OPERATORS.EQUAL:
    case COMPARISON_OPERATORS.NOT_EQUAL:
    case COMPARISON_OPERATORS.GREATER_THAN:
    case COMPARISON_OPERATORS.GREATER_THAN_OR_EQUAL:
    case COMPARISON_OPERATORS.LESS_THAN:
    case COMPARISON_OPERATORS.LESS_THAN_OR_EQUAL:
    case COMPARISON_OPERATORS.LIKE:
    case COMPARISON_OPERATORS.NOT_LIKE:
      return (nodeType === AST_NODE_TYPES.LITERAL && !isNull) || nodeType === AST_NODE_TYPES.FUNCTION;

    case SET_OPERATORS.IN:
    case SET_OPERATORS.NOT_IN:
      return nodeType === AST_NODE_TYPES.LIST || nodeType === AST_NODE_TYPES.FUNCTION;

    case NULL_OPERATORS.IS:
    case NULL_OPERATORS.IS_NOT:
      return isNull;

    default:
      return false;
  }
}

/**
 * 将 AST 节点转换为 IQL 查询字符串
 */
export function astToIQL(ast: ASTNode, constantsMap: ConstantsMap): string {
  // 处理二元表达式 (如: field = value, field in list)
  if (ast.type === AST_NODE_TYPES.BINARY_EXPRESSION) {
    return convertBinaryExpression(ast, constantsMap);
  }

  // 处理逻辑表达式 (如: expr AND expr, expr OR expr)
  if (ast.type === AST_NODE_TYPES.LOGICAL_EXPRESSION) {
    return convertLogicalExpression(ast, constantsMap);
  }

  // 处理完整的 JQL 查询（包含 ORDER BY）
  if (ast.type === AST_NODE_TYPES.JQL_QUERY) {
    let result = '';
    if (ast.where) {
      result = astToIQL(ast.where, constantsMap);
    }

    // 处理 ORDER BY
    if (ast.orderBy) {
      const orderByClause = convertOrderByClause(ast.orderBy, constantsMap);
      if (orderByClause) {
        result = result ? `${result} ${orderByClause}` : orderByClause;
      }
    }

    return result;
  }

  return '';
}

// 字段类型分组常量
const FIELD_TYPE_GROUPS = {
  user: new Set(['createdBy', 'updatedBy', 'Assignee', 'Reporter', 'User']),
  version: new Set(['Version', 'CustomVersion']),
  text: new Set(['Text', 'LongText', 'Editor', 'Name', 'Key']),
  number: new Set(['Number', 'StoryPoint']),
  date: new Set(['Date', 'createdAt', 'updatedAt']),
  enum: new Set(['Checkbox', 'Dropdown', 'Radio'])
};

// 特殊字段处理器映射
const SPECIAL_FIELD_HANDLERS = new Map([
  ['project', convertProjectField],
  ['issuetype', convertIssuetypeField],
  ['status', convertStatusField],
  ['component', convertComponentField],
  ['priority', convertPriorityField]
]);

/**
 * 转换二元表达式
 */
function convertBinaryExpression(expr: any, constantsMap: ConstantsMap): string {
  let field = expr.left?.value;
  const operator = expr.operator;
  const right = expr.right;

  // 清理字段名中的引号
  if (field?.startsWith('"') && field.endsWith('"')) {
    field = field.slice(1, -1);
  }

  // 验证运算符是否合法
  if (!isValidOperator(operator, right)) {
    return '';
  }

  // 处理特殊系统字段（直接映射）
  const handler = SPECIAL_FIELD_HANDLERS.get(field);
  if (handler) {
    return handler(operator, right, constantsMap);
  }

  // 处理其他特殊字段
  if (field === 'labels') {
    return convertTextField('标签', operator, right, constantsMap);
  }
  if (field === 'sprint' || field === 'Sprint') {
    return convertSprintField(operator, right, constantsMap);
  }
  if (field === 'text') {
    return convertTextField('text', operator, right, constantsMap);
  }
  if (field === 'created') {
    return convertDateField('created', operator, right, {
      ...constantsMap,
      fieldMap: {
        ...constantsMap.fieldMap,
        created: { objectId: 'system-created', customFieldKey: '创建时间', fieldTypeKey: 'createdAt' }
      }
    });
  }
  if (field === 'updated') {
    return convertDateField('updated', operator, right, {
      ...constantsMap,
      fieldMap: {
        ...constantsMap.fieldMap,
        updated: { objectId: 'system-updated', customFieldKey: '修改时间', fieldTypeKey: 'updatedAt' }
      }
    });
  }

  // 处理自定义字段
  const normalizedFieldName = normalizeFieldName(field);
  const fieldConfig = constantsMap.fieldMap?.[normalizedFieldName];

  if (!fieldConfig || !(fieldConfig.fieldTypeKey in SUPPORTED_FIELD_TYPES)) {
    return '';
  }

  const fieldType = fieldConfig.fieldTypeKey;

  // 使用 Set 快速查找字段类型组
  if (FIELD_TYPE_GROUPS.user.has(fieldType)) {
    return convertUserField(field, operator, right, constantsMap);
  }
  if (FIELD_TYPE_GROUPS.version.has(fieldType)) {
    return convertVersionField(field, operator, right, constantsMap);
  }
  if (FIELD_TYPE_GROUPS.text.has(fieldType)) {
    return convertTextField(field, operator, right, constantsMap);
  }
  if (FIELD_TYPE_GROUPS.number.has(fieldType)) {
    return convertNumberField(field, operator, right, constantsMap);
  }
  if (FIELD_TYPE_GROUPS.date.has(fieldType)) {
    return convertDateField(field, operator, right, constantsMap);
  }
  if (FIELD_TYPE_GROUPS.enum.has(fieldType)) {
    return convertEnumField(field, operator, right, constantsMap);
  }
  if (fieldType === 'UserGroup') {
    return convertUserGroupField(field, operator, right, constantsMap);
  }
  if (fieldType === 'Cascade') {
    return convertCascadeField(field, operator, right, constantsMap);
  }

  return '';
}

/**
 * 转换 ORDER BY 子句
 */
function convertOrderByClause(orderBy: any, constantsMap: ConstantsMap): string {
  if (!orderBy || orderBy.type !== AST_NODE_TYPES.ORDER_BY_CLAUSE || !orderBy.fields || orderBy.fields.length === 0) {
    return '';
  }

  const fieldMap = constantsMap.fieldMap || {};
  const orderFields: string[] = [];

  for (const orderField of orderBy.fields) {
    const fieldName = orderField.field;
    const direction = orderField.direction.toLowerCase();

    // 处理普通字段（可能有映射）
    const normalizedFieldName = normalizeFieldName(fieldName);
    const fieldConfig = fieldMap[normalizedFieldName];
    const iqlFieldName = fieldConfig?.customFieldKey || fieldName;
    orderFields.push(`${iqlFieldName} ${direction}`);
  }

  if (orderFields.length === 0) {
    return '';
  }

  return `${SQL_CLAUSES.ORDER_BY} ${orderFields.join(',')}`;
}

/**
 * 转换逻辑表达式
 */
function convertLogicalExpression(expr: any, constantsMap: ConstantsMap): string {
  const operator = expr.operator;
  const left = expr.left ? astToIQL(expr.left, constantsMap) : '';
  const right = expr.right ? astToIQL(expr.right, constantsMap) : '';

  if (operator === LOGICAL_OPERATORS.AND) {
    // 如果左侧或右侧转换失败（返回空字符串），则整个表达式无效
    if (!left || !right) return '';
    return `${left} ${IQL_LOGICAL_OPERATORS.AND} ${right}`;
  }

  if (operator === LOGICAL_OPERATORS.OR) {
    // 如果左侧或右侧转换失败（返回空字符串），则整个表达式无效
    if (!left || !right) return '';
    return `${left} ${IQL_LOGICAL_OPERATORS.OR} ${right}`;
  }

  if (operator === LOGICAL_OPERATORS.NOT) {
    if (!left) return '';
    return `${IQL_LOGICAL_OPERATORS.NOT} ${left}`;
  }

  return '';
}
