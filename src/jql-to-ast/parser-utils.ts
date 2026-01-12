import { ParseTree } from 'antlr4ts/tree/ParseTree';
import { RuleNode } from 'antlr4ts/tree/RuleNode';
import { TerminalNode } from 'antlr4ts/tree/TerminalNode';
import {
  JQL_CONTEXT,
  COMPARISON_OPERATORS,
  SET_OPERATORS,
  NULL_OPERATORS,
  LOGICAL_OPERATORS,
} from '../constants';

// 操作符常量集合，避免重复创建数组
const OPERATOR_SET = new Set([
  COMPARISON_OPERATORS.EQUAL,
  COMPARISON_OPERATORS.NOT_EQUAL,
  COMPARISON_OPERATORS.GREATER_THAN,
  COMPARISON_OPERATORS.LESS_THAN,
  COMPARISON_OPERATORS.GREATER_THAN_OR_EQUAL,
  COMPARISON_OPERATORS.LESS_THAN_OR_EQUAL,
  COMPARISON_OPERATORS.LIKE,
  COMPARISON_OPERATORS.NOT_LIKE,
  SET_OPERATORS.IN,
  SET_OPERATORS.NOT_IN,
]);
const OPERATOR_KEYWORD_SET = new Set([
  LOGICAL_OPERATORS.AND.toLowerCase(),
  LOGICAL_OPERATORS.OR.toLowerCase(),
  LOGICAL_OPERATORS.NOT.toLowerCase(),
]);

// 操作符映射，避免重复查找
const CLAUSE_OPERATORS: Record<string, string[]> = {
  [JQL_CONTEXT.EQUALS_CLAUSE]: [COMPARISON_OPERATORS.EQUAL, COMPARISON_OPERATORS.NOT_EQUAL],
  [JQL_CONTEXT.COMPARISON_CLAUSE]: [
    COMPARISON_OPERATORS.GREATER_THAN,
    COMPARISON_OPERATORS.LESS_THAN,
    COMPARISON_OPERATORS.GREATER_THAN_OR_EQUAL,
    COMPARISON_OPERATORS.LESS_THAN_OR_EQUAL,
  ],
  [JQL_CONTEXT.IN_CLAUSE]: [SET_OPERATORS.IN, SET_OPERATORS.NOT_IN],
  [JQL_CONTEXT.LIKE_CLAUSE]: [COMPARISON_OPERATORS.LIKE, COMPARISON_OPERATORS.NOT_LIKE],
  [JQL_CONTEXT.IS_CLAUSE]: [NULL_OPERATORS.IS, NULL_OPERATORS.IS_NOT],
};

/**
 * 遍历回调函数类型
 * @param node 当前节点
 * @param depth 当前深度
 * @param parent 父节点
 */
export type TraverseCallback = (node: ParseTree, depth: number, parent?: ParseTree) => void | boolean;

/**
 * 遍历 JQL 解析树
 * @param tree 解析树根节点
 * @param callback 遍历回调函数，返回 false 可以跳过子节点
 * @param depth 当前深度（内部使用）
 * @param parent 父节点（内部使用）
 */
export function traverseJQLTree(
  tree: ParseTree,
  callback: TraverseCallback,
  depth = 0,
  parent?: ParseTree
): void {
  // 调用回调函数
  const shouldContinue = callback(tree, depth, parent);

  // 如果回调返回 false，跳过子节点
  if (shouldContinue === false) {
    return;
  }

  // 遍历子节点
  const childCount = tree.childCount;
  for (let i = 0; i < childCount; i++) {
    const child = tree.getChild(i);
    traverseJQLTree(child, callback, depth + 1, tree);
  }
}

/**
 * 获取节点信息
 */
export function getNodeInfo(node: ParseTree): {
  type: 'rule' | 'terminal';
  text: string;
  ruleName?: string;
  tokenType?: string;
} {
  if (node instanceof TerminalNode) {
    return {
      type: 'terminal',
      text: node.text,
      tokenType: node.symbol.type?.toString(),
    };
  } else if (node instanceof RuleNode) {
    return {
      type: 'rule',
      text: node.text,
      ruleName: (node as any).constructor.name,
    };
  }
  return {
    type: 'rule',
    text: node.text,
  };
}

/**
 * 获取所有子节点
 */
export function getChildren(node: ParseTree): ParseTree[] {
  const children: ParseTree[] = [];
  for (let i = 0; i < node.childCount; i++) {
    children.push(node.getChild(i));
  }
  return children;
}

/**
 * 提取节点的文本值
 */
export function extractValue(node: ParseTree | undefined): string | null {
  if (!node) return null;
  if (node instanceof TerminalNode) return node.text;

  // 递归查找第一个终端节点
  for (let i = 0; i < node.childCount; i++) {
    const value = extractValue(node.getChild(i));
    if (value) return value;
  }

  return null;
}

/**
 * 提取字段名或简单值
 */
export function extractFieldValue(node: ParseTree | undefined): string | null {
  if (!node) return null;
  if (node instanceof TerminalNode) return node.text;

  // 对于字符串或数字节点，直接返回文本
  if (node instanceof RuleNode) {
    const ruleName = (node as any).constructor.name;
    if (ruleName === JQL_CONTEXT.STRING || ruleName === JQL_CONTEXT.NUMBER) {
      return node.text;
    }
  }

  // 递归查找第一个终端节点
  for (let i = 0; i < node.childCount; i++) {
    const value = extractFieldValue(node.getChild(i));
    if (value) return value;
  }

  return null;
}

/**
 * 提取操作符
 */
export function extractOperator(node: ParseTree | undefined): string | null {
  if (!node) return null;

  // 快速处理终端节点
  if (node instanceof TerminalNode) {
    const text = node.text;
    const lowerText = text.toLowerCase();
    return OPERATOR_SET.has(text) || OPERATOR_SET.has(lowerText) ? text : null;
  }

  // 获取规则名并使用映射表
  const ruleName = (node as any).constructor?.name || '';
  const operators = CLAUSE_OPERATORS[ruleName];

  if (operators) {
    return extractOperatorFromClause(node, operators);
  }

  // 递归查找操作符
  for (let i = 0; i < node.childCount; i++) {
    const result = extractOperator(node.getChild(i));
    if (result) return result;
  }

  return null;
}

/**
 * 从特定类型的子句中提取操作符
 */
export function extractOperatorFromClause(node: ParseTree, possibleOperators: string[]): string | null {
  // 分离多词和单词操作符
  let multiWordOps: string[] | null = null;
  const singleWordOps = new Set<string>();

  for (const op of possibleOperators) {
    if (op.includes(' ')) {
      if (!multiWordOps) multiWordOps = [];
      multiWordOps.push(op);
    } else {
      singleWordOps.add(op.toLowerCase());
    }
  }

  // 收集所有tokens用于多词匹配
  const tokens: string[] = [];
  const collectTokens = (n: ParseTree): void => {
    for (let i = 0; i < n.childCount; i++) {
      const child = n.getChild(i);
      if (child instanceof TerminalNode) {
        tokens.push(child.text.toLowerCase());
      } else {
        collectTokens(child);
      }
    }
  };

  // 先检查多词操作符（优先级更高）
  if (multiWordOps) {
    collectTokens(node);

    if (tokens.length > 1) {
      for (const op of multiWordOps) {
        const opTokens = op.toLowerCase().split(' ');
        const opLen = opTokens.length;

        for (let i = 0; i <= tokens.length - opLen; i++) {
          let match = true;
          for (let j = 0; j < opLen; j++) {
            if (tokens[i + j] !== opTokens[j]) {
              match = false;
              break;
            }
          }
          if (match) return op;
        }
      }
    }
  }

  // 然后检查单词操作符
  for (let i = 0; i < node.childCount; i++) {
    const child = node.getChild(i);

    if (child instanceof TerminalNode) {
      const text = child.text;
      const lowerText = text.toLowerCase();

      if (singleWordOps.has(lowerText) || singleWordOps.has(text)) {
        return text;
      }
    } else {
      // 递归查找规则节点
      const result = extractOperatorFromClause(child, possibleOperators);
      if (result) return result;
    }
  }

  return null;
}
