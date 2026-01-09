/**
 * JQL AST 节点类型定义
 */

/**
 * 基础 AST 节点
 */
export interface BaseASTNode {
  type: string;
  [key: string]: any;
}

/**
 * 二元表达式节点 (如: field = value, field in list)
 */
export interface BinaryExpression extends BaseASTNode {
  type: 'BinaryExpression';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

/**
 * 逻辑表达式节点 (如: expr AND expr, expr OR expr)
 */
export interface LogicalExpression extends BaseASTNode {
  type: 'LogicalExpression';
  operator: 'AND' | 'OR';
  left: ASTNode;
  right: ASTNode;
}

/**
 * 字段节点 (如: project, status, issuetype)
 */
export interface Field extends BaseASTNode {
  type: 'Field';
  value: string;
}

/**
 * 字面量节点 (如: "value", 123, Done)
 */
export interface Literal extends BaseASTNode {
  type: 'Literal';
  value: string | number;
}

/**
 * 标识符节点
 */
export interface Identifier extends BaseASTNode {
  type: 'Identifier';
  value: string;
}

/**
 * 列表节点 (如: (value1, value2, value3))
 */
export interface List extends BaseASTNode {
  type: 'List';
  elements: ASTNode[];
}

/**
 * 函数节点 (如: currentUser(), membersOf("group"))
 */
export interface FunctionNode extends BaseASTNode {
  type: 'Function';
  name: string;
  arguments: any[];
}

/**
 * 排序方向
 */
export type OrderDirection = 'ASC' | 'DESC';

/**
 * 排序字段节点 (如: priority DESC, updated ASC)
 */
export interface OrderByField extends BaseASTNode {
  type: 'OrderByField';
  field: string;
  direction: OrderDirection;
}

/**
 * ORDER BY 子句节点
 */
export interface OrderByClause extends BaseASTNode {
  type: 'OrderByClause';
  fields: OrderByField[];
}

/**
 * 完整的 JQL 查询结构
 */
export interface JQLQuery extends BaseASTNode {
  type: 'JQLQuery';
  where: ASTNode | null;
  orderBy: OrderByClause | null;
}

/**
 * 联合类型：所有可能的 AST 节点类型
 */
export type ASTNode =
  | BinaryExpression
  | LogicalExpression
  | Field
  | Literal
  | Identifier
  | List
  | FunctionNode
  | OrderByField
  | OrderByClause
  | JQLQuery;
