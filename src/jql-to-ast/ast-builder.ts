import { ParseTree } from 'antlr4ts/tree/ParseTree';
import { TerminalNode } from 'antlr4ts/tree/TerminalNode';
import type { ASTNode, OrderByClause, OrderByField } from '../types';
import {
  getNodeInfo,
  getChildren,
  extractFieldValue,
  extractOperator,
} from './parser-utils';
import {
  JQL_CONTEXT,
  WRAPPER_CONTEXTS,
  LOGICAL_OPERATORS,
  COMPARISON_OPERATORS,
  SET_OPERATORS,
  NULL_OPERATORS,
} from '../constants';

// 常量优化：使用 Set 提高查找性能
const KEYWORDS = new Set([LOGICAL_OPERATORS.AND, LOGICAL_OPERATORS.OR, LOGICAL_OPERATORS.NOT]);
const OPERATORS = new Set([
  COMPARISON_OPERATORS.EQUAL,
  COMPARISON_OPERATORS.NOT_EQUAL,
  COMPARISON_OPERATORS.GREATER_THAN,
  COMPARISON_OPERATORS.LESS_THAN,
  COMPARISON_OPERATORS.GREATER_THAN_OR_EQUAL,
  COMPARISON_OPERATORS.LESS_THAN_OR_EQUAL,
  COMPARISON_OPERATORS.LIKE,
  COMPARISON_OPERATORS.NOT_LIKE,
]);
const SKIP_TERMINALS = new Set(['(', ')', ',']);

/**
 * 将 JQL 解析树转换为精简的 AST
 */
export function buildAST(node: ParseTree | undefined): ASTNode | null {
  if (!node) {
    return null;
  }

  const info = getNodeInfo(node);

  // 处理终端节点
  if (node instanceof TerminalNode) {
    const text = node.text;
    // 跳过操作符和关键字（它们会在父节点中处理）
    if (KEYWORDS.has(text.toUpperCase()) || OPERATORS.has(text)) {
      return null;
    }
    return { type: 'Literal', value: text };
  }

  // 处理规则节点
  const ruleName = info.ruleName || '';

  // 首先处理最具体的节点类型（terminal clauses）
  // JqlTerminalClause - 比较表达式 (field operator value)
  if (ruleName === JQL_CONTEXT.TERMINAL_CLAUSE) {
    return buildTerminalClauseAST(node);
  }

  // JqlNotClauseContext - 处理 NOT 子句（包括没有 NOT 的情况）
  if (ruleName === JQL_CONTEXT.NOT_CLAUSE) {
    return buildNotClauseAST(node);
  }

  // JqlOrClause - OR 逻辑表达式
  if (ruleName === JQL_CONTEXT.OR_CLAUSE) {
    return buildOrClauseAST(node);
  }

  // JqlAndClause - AND 逻辑表达式
  if (ruleName === JQL_CONTEXT.AND_CLAUSE) {
    return buildAndClauseAST(node);
  }

  // JqlListContext - 处理列表
  if (ruleName === JQL_CONTEXT.LIST) {
    return buildListAST(node);
  }

  // JqlFunctionContext - 处理函数
  if (ruleName === JQL_CONTEXT.FUNCTION) {
    return buildFunctionAST(node);
  }

  // JqlEmptyContext - 处理 EMPTY 关键字
  if (ruleName === JQL_CONTEXT.EMPTY) {
    return {
      type: 'Literal',
      value: 'EMPTY',
    };
  }

  // JqlValueContext - 处理值
  if (ruleName === JQL_CONTEXT.VALUE) {
    const value = extractFieldValue(node);
    return value ? { type: 'Literal', value } : null;
  }

  // JqlOperandContext - 处理操作数
  if (ruleName === JQL_CONTEXT.OPERAND) {
    // 递归处理子节点，可能是函数、值或空值
    const children = getChildren(node);
    for (let i = 0; i < children.length; i++) {
      const result = buildAST(children[i]);
      if (result) return result;
    }
    return null;
  }

  // JqlQueryContext - 处理整个查询（包含 WHERE 和 ORDER BY）
  if (ruleName === JQL_CONTEXT.QUERY) {
    return buildQueryAST(node);
  }

  // 这些是包装节点和WHERE节点，应该透明地传递给子节点
  if (ruleName === JQL_CONTEXT.WHERE || WRAPPER_CONTEXTS.includes(ruleName as any)) {
    const children = getChildren(node);
    for (let i = 0; i < children.length; i++) {
      const result = buildAST(children[i]);
      if (result) return result;
    }
    return null;
  }

  // 对于其他未明确处理的节点，也递归处理
  const children = getChildren(node);
  for (let i = 0; i < children.length; i++) {
    const result = buildAST(children[i]);
    if (result) return result;
  }

  return null;
}

/**
 * 构建终端子句 AST (field operator value)
 */
function buildTerminalClauseAST(node: ParseTree): ASTNode | null {
  const children = getChildren(node);

  if (children.length >= 2) {
    // children[0] 是字段，children[1] 是包含操作符和值的子树
    const field = extractFieldValue(children[0]);
    const operator = extractOperator(children[1]);

    // 从 children[1] 中提取值
    const value = extractComplexValue(children[1], operator);

    if (field && operator && value) {
      return {
        type: 'BinaryExpression',
        operator,
        left: { type: 'Field', value: field },
        right: value,
      };
    }
  }

  return null;
}

/**
 * 构建 NOT 子句 AST
 */
function buildNotClauseAST(node: ParseTree): ASTNode | null {
  const children = getChildren(node);

  // 查找 NOT 关键字位置
  for (let i = 0; i < children.length; i++) {
    if (children[i] instanceof TerminalNode && children[i].text.toUpperCase() === LOGICAL_OPERATORS.NOT) {
      // 有 NOT 的情况，需要包装表达式
      const innerExpr = i + 1 < children.length ? buildAST(children[i + 1]) : null;
      return innerExpr ? {
        type: 'LogicalExpression',
        operator: LOGICAL_OPERATORS.NOT,
        left: innerExpr,
        right: undefined,
      } : null;
    }
  }

  // 没有 NOT，直接处理子节点
  for (let i = 0; i < children.length; i++) {
    const result = buildAST(children[i]);
    if (result) return result;
  }

  return null;
}

/**
 * 构建逻辑表达式 AST（OR/AND 通用）
 */
function buildLogicalClauseAST(node: ParseTree, operator: 'OR' | 'AND'): ASTNode | null {
  const children = getChildren(node);
  if (children.length === 1) {
    return buildAST(children[0]);
  }

  if (children.length < 3) {
    return null;
  }

  // 找到所有的逻辑操作符位置
  const opIndices: number[] = [];
  for (let i = 0; i < children.length; i++) {
    if (children[i] instanceof TerminalNode && children[i].text.toUpperCase() === operator) {
      opIndices.push(i);
    }
  }

  // 如果没有操作符，处理单个子表达式
  if (opIndices.length === 0) {
    return buildAST(children[0]);
  }

  // 从右向左构建链，保持左结合性
  const lastOpIndex = opIndices[opIndices.length - 1];
  let result = buildAST(children[lastOpIndex + 1]);

  for (let i = opIndices.length - 1; i >= 0; i--) {
    const leftIndex = i === 0 ? 0 : opIndices[i - 1] + 1;
    const leftNode = buildAST(children[leftIndex]);

    if (leftNode && result) {
      result = {
        type: 'LogicalExpression',
        operator,
        left: leftNode,
        right: result,
      };
    }
  }

  return result;
}

/**
 * 构建 OR 子句 AST
 */
function buildOrClauseAST(node: ParseTree): ASTNode | null {
  return buildLogicalClauseAST(node, LOGICAL_OPERATORS.OR);
}

/**
 * 构建 AND 子句 AST
 */
function buildAndClauseAST(node: ParseTree): ASTNode | null {
  return buildLogicalClauseAST(node, LOGICAL_OPERATORS.AND);
}

/**
 * 构建列表 AST
 */
function buildListAST(node: ParseTree): ASTNode | null {
  const children = getChildren(node);
  const elements: ASTNode[] = [];

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    // 跳过 '(', ')', ','
    if (child instanceof TerminalNode && SKIP_TERMINALS.has(child.text)) {
      continue;
    }
    // 处理 JqlOperandContext
    const info = getNodeInfo(child);
    if (info.ruleName === JQL_CONTEXT.OPERAND) {
      const operandValue = buildAST(child);
      if (operandValue) {
        elements.push(operandValue);
      }
    }
  }

  return { type: 'List', elements };
}

/**
 * 构建函数 AST
 */
function buildFunctionAST(node: ParseTree): ASTNode | null {
  const children = getChildren(node);
  let functionName: string | null = null;
  const args: ASTNode[] = [];

  for (let i = 0; i < children.length; i++) {
    const info = getNodeInfo(children[i]);

    // 提取函数名
    if (info.ruleName === JQL_CONTEXT.FUNCTION_NAME) {
      functionName = extractFieldValue(children[i]);
    }
    // 提取参数
    else if (info.ruleName === JQL_CONTEXT.ARGUMENT_LIST) {
      const argChildren = getChildren(children[i]);
      for (let j = 0; j < argChildren.length; j++) {
        const argInfo = getNodeInfo(argChildren[j]);
        if (argInfo.ruleName === JQL_CONTEXT.ARGUMENT) {
          const argValue = extractFieldValue(argChildren[j]);
          if (argValue) {
            args.push({ type: 'Literal', value: argValue });
          }
        }
      }
    }
  }

  return functionName ? { type: 'Function', name: functionName, arguments: args } : null;
}

/**
 * 构建查询 AST（包含 WHERE 和 ORDER BY）
 */
function buildQueryAST(node: ParseTree): ASTNode | null {
  const children = getChildren(node);
  let whereClause: ASTNode | null = null;
  let orderByClause: ASTNode | null = null;

  for (const child of children) {
    const childInfo = getNodeInfo(child);
    if (childInfo.ruleName === JQL_CONTEXT.WHERE) {
      whereClause = buildAST(child);
    } else if (childInfo.ruleName === JQL_CONTEXT.ORDER_BY) {
      orderByClause = buildOrderByAST(child);
    }
  }

  // 如果没有 ORDER BY，直接返回 WHERE 子句
  if (!orderByClause) {
    return whereClause;
  }

  // 如果有 ORDER BY，返回完整的查询结构
  return {
    type: 'JQLQuery',
    where: whereClause,
    orderBy: orderByClause as OrderByClause,
  };
}

/**
 * 构建 ORDER BY 子句的 AST
 */
function buildOrderByAST(node: ParseTree): ASTNode | null {
  const info = getNodeInfo(node);
  if (info.ruleName !== JQL_CONTEXT.ORDER_BY) {
    return null;
  }

  const children = getChildren(node);
  const fields: OrderByField[] = [];

  for (let i = 0; i < children.length; i++) {
    const childInfo = getNodeInfo(children[i]);

    // 处理每个排序字段
    if (childInfo.ruleName === JQL_CONTEXT.SEARCH_SORT) {
      const sortChildren = getChildren(children[i]);
      let direction: 'ASC' | 'DESC' = 'ASC';
      let fieldText = '';

      // 在 ASC/DESC 之前的所有文本就是字段名
      for (let j = 0; j < sortChildren.length; j++) {
        const sortChild = sortChildren[j];
        if (sortChild instanceof TerminalNode) {
          const text = sortChild.text.toUpperCase();
          if (text === 'ASC' || text === 'DESC') {
            direction = text;
            break;
          }
          fieldText += sortChild.text;
        } else {
          fieldText += sortChild.text;
        }
      }

      const fieldName = fieldText.trim();
      if (fieldName) {
        fields.push({ type: 'OrderByField', field: fieldName, direction });
      }
    }
  }

  return fields.length > 0 ? { type: 'OrderByClause', fields } : null;
}

/**
 * 提取复杂值（可能是列表、函数或简单值）
 */
function extractComplexValue(node: ParseTree | undefined, operator: string | null): ASTNode | null {
  if (!node) return null;

  // 根据操作符优先查找的上下文类型
  const priorityContexts: string[] = [];
  if (operator === NULL_OPERATORS.IS || operator === NULL_OPERATORS.IS_NOT) {
    priorityContexts.push(JQL_CONTEXT.EMPTY);
  } else if (operator === SET_OPERATORS.IN || operator === SET_OPERATORS.NOT_IN) {
    priorityContexts.push(JQL_CONTEXT.LIST, JQL_CONTEXT.FUNCTION);
  } else {
    // 其他操作符优先查找函数，然后是值
    priorityContexts.push(JQL_CONTEXT.FUNCTION, JQL_CONTEXT.VALUE);
  }

  // 一次遍历，按优先级查找
  for (let i = 0; i < node.childCount; i++) {
    const child = node.getChild(i);
    const childInfo = getNodeInfo(child);

    if (priorityContexts.includes(childInfo.ruleName || '')) {
      const result = buildAST(child);
      if (result) return result;
    }
  }

  // 如果没找到，递归查找
  for (let i = 0; i < node.childCount; i++) {
    const result = extractComplexValue(node.getChild(i), operator);
    if (result) return result;
  }

  return null;
}
