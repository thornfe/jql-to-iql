/**
 * JQL 解析树节点类型常量
 */
export const JQL_CONTEXT = {
  TERMINAL_CLAUSE: 'JqlTerminalClauseContext',
  NOT_CLAUSE: 'JqlNotClauseContext',
  OR_CLAUSE: 'JqlOrClauseContext',
  AND_CLAUSE: 'JqlAndClauseContext',
  LIST: 'JqlListContext',
  FUNCTION: 'JqlFunctionContext',
  EMPTY: 'JqlEmptyContext',
  VALUE: 'JqlValueContext',
  OPERAND: 'JqlOperandContext',
  QUERY: 'JqlQueryContext',
  WHERE: 'JqlWhereContext',
  ORDER_BY: 'JqlOrderByContext',
  SEARCH_SORT: 'JqlSearchSortContext',
  FUNCTION_NAME: 'JqlFunctionNameContext',
  ARGUMENT_LIST: 'JqlArgumentListContext',
  ARGUMENT: 'JqlArgumentContext',
  // 操作符子句类型
  EQUALS_CLAUSE: 'JqlEqualsClauseContext',
  COMPARISON_CLAUSE: 'JqlComparisonClauseContext',
  IN_CLAUSE: 'JqlInClauseContext',
  LIKE_CLAUSE: 'JqlLikeClauseContext',
  IS_CLAUSE: 'JqlIsClauseContext',
  // 其他类型
  STRING: 'JqlStringContext',
  NUMBER: 'JqlNumberContext',
} as const;

/**
 * 包装节点类型（透明传递给子节点）
 */
export const WRAPPER_CONTEXTS = [
  'JqlStringContext',
  'JqlNumberContext',
  'JqlNonNumberFieldContext',
  'JqlListStartContext',
  'JqlListEndContext',
  'JqlEqualsOperatorContext',
  'JqlComparisonOperatorContext',
  'JqlInOperatorContext',
  'JqlLikeOperatorContext',
  'JqlFunctionNameContext',
  'JqlArgumentContext',
] as const;

/**
 * 逻辑操作符常量
 */
export const LOGICAL_OPERATORS = {
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',
} as const;

/**
 * IQL 逻辑操作符（小写）
 */
export const IQL_LOGICAL_OPERATORS = {
  AND: 'and',
  OR: 'or',
  NOT: 'not',
} as const;

/**
 * 比较操作符常量
 */
export const COMPARISON_OPERATORS = {
  EQUAL: '=',
  NOT_EQUAL: '!=',
  GREATER_THAN: '>',
  GREATER_THAN_OR_EQUAL: '>=',
  LESS_THAN: '<',
  LESS_THAN_OR_EQUAL: '<=',
  LIKE: '~',
  NOT_LIKE: '!~',
} as const;

/**
 * 集合操作符常量
 */
export const SET_OPERATORS = {
  IN: 'in',
  NOT_IN: 'not in',
} as const;

/**
 * 空值操作符常量
 */
export const NULL_OPERATORS = {
  IS: 'is',
  IS_NOT: 'is not',
} as const;

/**
 * 空值关键字
 */
export const NULL_KEYWORDS = {
  NULL: 'null',
  NULL_UPPER: 'NULL',
  EMPTY: 'EMPTY',
  EMPTY_LOWER: 'empty',
} as const;

/**
 * 特殊函数名称
 */
export const FUNCTION_NAMES = {
  CURRENT_USER: 'currentUser',
  MEMBERS_OF: 'membersOf',
  CASCADE_OPTION: 'cascadeOption',
} as const;

/**
 * SQL 子句关键字
 */
export const SQL_CLAUSES = {
  ORDER_BY: 'order by',
  ASC: 'asc',
  DESC: 'desc',
} as const;

/**
 * AST 节点类型
 */
export const AST_NODE_TYPES = {
  BINARY_EXPRESSION: 'BinaryExpression',
  LOGICAL_EXPRESSION: 'LogicalExpression',
  JQL_QUERY: 'JQLQuery',
  ORDER_BY_CLAUSE: 'OrderByClause',
  LITERAL: 'Literal',
  FUNCTION: 'Function',
  LIST: 'List',
} as const;

/**
 * 支持的字段类型列表
 */
export const SUPPORTED_FIELD_TYPES = {
  createdBy: 'createdBy',
  updatedBy: 'updatedBy',
  Assignee: 'Assignee',
  Reporter: 'Reporter',
  User: 'User',
  Status: 'Status',
  Version: 'Version',
  CustomVersion: 'CustomVersion',
  Sprint: 'Sprint',
  Priority: 'Priority',
  Workspace: 'Workspace',
  ItemType: 'ItemType',
  Name: 'Name',
  Text: 'Text',
  LongText: 'LongText',
  Editor: 'Editor',
  Key: 'Key',
  Number: 'Number',
  Integer: 'Integer',
  Float: 'Float',
  StoryPoint: 'StoryPoint',
  Date: 'Date',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  UserGroup: 'UserGroup',
  Tree: 'Tree',
  Tag: 'Tag',
  Cascade: 'Cascade',
  Checkbox: 'Checkbox',
  Dropdown: 'Dropdown',
  Radio: 'Radio'
} as const;
