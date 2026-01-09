import { CharStreams, CommonTokenStream } from 'antlr4ts';
import { JQLLexer, JQLParser } from '@atlaskit/jql-parser';
import { ParseTree } from 'antlr4ts/tree/ParseTree.js';
import { RuleNode } from 'antlr4ts/tree/RuleNode.js';
import { TerminalNode } from 'antlr4ts/tree/TerminalNode.js';
import type { ASTNode } from './types.js';

// 重新导出类型供外部使用
export * from './types.js';

/**
 * 遍历回调函数类型
 * @param node 当前节点
 * @param depth 当前深度
 * @param parent 父节点
 */
type TraverseCallback = (node: ParseTree, depth: number, parent?: ParseTree) => void | boolean;

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
    const textUpper = text.toUpperCase();

    // 跳过操作符和关键字（它们会在父节点中处理）
    const keywords = ['AND', 'OR', 'NOT'];
    const operators = ['=', '!=', '>', '<', '>=', '<=', '~', '!~'];

    if (keywords.includes(textUpper) || operators.includes(text)) {
      return null;
    }

    return {
      type: 'Literal',
      value: text,
    };
  }

  // 处理规则节点
  const ruleName = info.ruleName || '';

  // 首先处理最具体的节点类型（terminal clauses）
  // JqlTerminalClause - 比较表达式 (field operator value)
  if (ruleName === 'JqlTerminalClauseContext') {
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
  }

  // JqlNotClauseContext - 处理 NOT 子句（包括没有 NOT 的情况）
  if (ruleName === 'JqlNotClauseContext') {
    const children = getChildren(node);

    // 检查是否有 NOT 关键字
    let hasNot = false;
    let terminalClauseIndex = 0;

    for (let i = 0; i < children.length; i++) {
      if (children[i] instanceof TerminalNode && children[i].text.toUpperCase() === 'NOT') {
        hasNot = true;
        terminalClauseIndex = i + 1;
        break;
      }
    }

    // 如果没有 NOT，直接处理第一个子节点
    if (!hasNot) {
      for (const child of children) {
        const result = buildAST(child);
        if (result) {
          return result;
        }
      }
    } else {
      // 有 NOT 的情况，需要包装表达式
      const innerExpr = buildAST(children[terminalClauseIndex]);
      if (innerExpr) {
        return {
          type: 'LogicalExpression',
          operator: 'NOT',
          left: innerExpr,
          right: undefined,
        };
      }
    }
  }

  // JqlOrClause - OR 逻辑表达式
  if (ruleName === 'JqlOrClauseContext') {
    const children = getChildren(node);
    if (children.length === 1) {
      return buildAST(children[0]);
    }

    // 处理多个子表达式，通常是 left OR right 的结构
    if (children.length >= 3) {
      // 找到所有的 OR 关键字位置
      const orIndices: number[] = [];
      children.forEach((child, index) => {
        if (child instanceof TerminalNode && child.text.toUpperCase() === 'OR') {
          orIndices.push(index);
        }
      });

      // 如果没有 OR 关键字，处理单个子表达式
      if (orIndices.length === 0) {
        const left = buildAST(children[0]);
        return left;
      }

      // 从右向左构建 OR 链，这样可以保持左结合性
      let result: ASTNode | null = null;

      // 处理最后一个 OR 之后的表达式
      const lastOrIndex = orIndices[orIndices.length - 1];
      result = buildAST(children[lastOrIndex + 1]);

      // 从右向左遍历所有 OR 表达式
      for (let i = orIndices.length - 1; i >= 0; i--) {
        const orIndex = orIndices[i];
        const leftIndex = i === 0 ? 0 : orIndices[i - 1] + 1;
        const leftNode = buildAST(children[leftIndex]);

        if (leftNode && result) {
          result = {
            type: 'LogicalExpression',
            operator: 'OR',
            left: leftNode,
            right: result,
          };
        }
      }

      return result;
    }
  }

  // JqlAndClause - AND 逻辑表达式
  if (ruleName === 'JqlAndClauseContext') {
    const children = getChildren(node);
    if (children.length === 1) {
      return buildAST(children[0]);
    }

    if (children.length >= 3) {
      // 找到所有的 AND 关键字位置
      const andIndices: number[] = [];
      children.forEach((child, index) => {
        if (child instanceof TerminalNode && child.text.toUpperCase() === 'AND') {
          andIndices.push(index);
        }
      });

      // 如果没有 AND 关键字，处理单个子表达式
      if (andIndices.length === 0) {
        const left = buildAST(children[0]);
        return left;
      }

      // 从右向左构建 AND 链，这样可以保持左结合性
      // 例如：A AND B AND C 应该解析为 ((A AND B) AND C)
      let result: ASTNode | null = null;

      // 处理最后一个 AND 之后的表达式
      const lastAndIndex = andIndices[andIndices.length - 1];
      result = buildAST(children[lastAndIndex + 1]);

      // 从右向左遍历所有 AND 表达式
      for (let i = andIndices.length - 1; i >= 0; i--) {
        const andIndex = andIndices[i];
        const leftIndex = i === 0 ? 0 : andIndices[i - 1] + 1;
        const leftNode = buildAST(children[leftIndex]);

        if (leftNode && result) {
          result = {
            type: 'LogicalExpression',
            operator: 'AND',
            left: leftNode,
            right: result,
          };
        }
      }

      return result;
    }
  }

  // JqlListContext - 处理列表
  if (ruleName === 'JqlListContext') {
    const children = getChildren(node);
    const elements: ASTNode[] = [];

    for (const child of children) {
      const info = getNodeInfo(child);
      // 跳过 '(', ')', ','
      if (child instanceof TerminalNode && ['(', ')', ','].includes(child.text)) {
        continue;
      }
      // 处理 JqlOperandContext
      if (info.ruleName === 'JqlOperandContext') {
        const operandValue = buildAST(child);
        if (operandValue) {
          elements.push(operandValue);
        }
      }
    }

    return {
      type: 'List',
      elements,
    };
  }

  // JqlFunctionContext - 处理函数
  if (ruleName === 'JqlFunctionContext') {
    const children = getChildren(node);
    let functionName: string | null = null;
    const args: ASTNode[] = [];

    for (const child of children) {
      const info = getNodeInfo(child);

      // 提取函数名
      if (info.ruleName === 'JqlFunctionNameContext') {
        functionName = extractFieldValue(child);
      }

      // 提取参数
      if (info.ruleName === 'JqlArgumentListContext') {
        for (let i = 0; i < child.childCount; i++) {
          const argChild = child.getChild(i);
          const argInfo = getNodeInfo(argChild);

          if (argInfo.ruleName === 'JqlArgumentContext') {
            const argValue = extractFieldValue(argChild);
            if (argValue) {
              args.push({ type: 'Literal', value: argValue });
            }
          }
        }
      }
    }

    if (functionName) {
      return {
        type: 'Function',
        name: functionName,
        arguments: args,
      };
    }
  }

  // JqlEmptyContext - 处理 EMPTY 关键字
  if (ruleName === 'JqlEmptyContext') {
    return {
      type: 'Literal',
      value: 'EMPTY',
    };
  }

  // JqlValueContext - 处理值
  if (ruleName === 'JqlValueContext') {
    const value = extractFieldValue(node);
    if (value) {
      return {
        type: 'Literal',
        value,
      };
    }
  }

  // JqlOperandContext - 处理操作数
  if (ruleName === 'JqlOperandContext') {
    // 递归处理子节点，可能是函数、值或空值
    for (const child of getChildren(node)) {
      const result = buildAST(child);
      if (result) {
        return result;
      }
    }
  }

  // JqlQueryContext - 处理整个查询（包含 WHERE 和 ORDER BY）
  if (ruleName === 'JqlQueryContext') {
    const children = getChildren(node);
    let whereClause: ASTNode | null = null;
    let orderByClause: ASTNode | null = null;

    for (const child of children) {
      const childInfo = getNodeInfo(child);
      if (childInfo.ruleName === 'JqlWhereContext') {
        whereClause = buildAST(child);
      } else if (childInfo.ruleName === 'JqlOrderByContext') {
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
      orderBy: orderByClause,
    };
  }

  // JqlWhereContext - 处理 WHERE 子句，直接透传给子节点
  if (ruleName === 'JqlWhereContext') {
    for (const child of getChildren(node)) {
      const result = buildAST(child);
      if (result) {
        return result;
      }
    }
    return null;
  }

  // 这些是包装节点，应该透明地传递给子节点
  const wrapperContexts = [
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
  ];

  if (wrapperContexts.includes(ruleName)) {
    // 递归处理子节点，不做任何处理
    for (const child of getChildren(node)) {
      const result = buildAST(child);
      if (result) {
        return result;
      }
    }
    return null;
  }

  // 对于其他未明确处理的节点，也递归处理
  // 但要小心不要返回不完整的结果
  const children = getChildren(node);
  for (const child of children) {
    const result = buildAST(child);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * 获取所有子节点
 */
function getChildren(node: ParseTree): ParseTree[] {
  const children: ParseTree[] = [];
  for (let i = 0; i < node.childCount; i++) {
    children.push(node.getChild(i));
  }
  return children;
}

/**
 * 提取节点的文本值
 */
function extractValue(node: ParseTree | undefined): string | null {
  if (!node) {
    return null;
  }

  if (node instanceof TerminalNode) {
    return node.text;
  }

  // 递归查找终端节点
  for (let i = 0; i < node.childCount; i++) {
    const child = node.getChild(i);
    const value = extractValue(child);
    if (value) {
      return value;
    }
  }

  return null;
}

/**
 * 提取字段名或简单值
 */
function extractFieldValue(node: ParseTree | undefined): string | null {
  if (!node) {
    return null;
  }

  if (node instanceof TerminalNode) {
    return node.text;
  }

  // 对于字符串节点，提取实际的字符串值
  const info = getNodeInfo(node);
  if (info.ruleName === 'JqlStringContext' || info.ruleName === 'JqlNumberContext') {
    return node.text;
  }

  // 递归查找终端节点
  for (let i = 0; i < node.childCount; i++) {
    const child = node.getChild(i);
    const value = extractFieldValue(child);
    if (value) {
      return value;
    }
  }

  return null;
}

/**
 * 提取复杂值（可能是列表、函数或简单值）
 */
function extractComplexValue(node: ParseTree | undefined, operator: string | null): ASTNode | null {
  if (!node) {
    return null;
  }

  const info = getNodeInfo(node);
  const ruleName = info.ruleName || '';

  // 对于 in 操作符，需要提取列表或函数
  if (operator === 'in' || operator === 'not in') {
    // 查找 JqlListContext 或 JqlFunctionContext
    for (let i = 0; i < node.childCount; i++) {
      const child = node.getChild(i);
      const childInfo = getNodeInfo(child);

      if (childInfo.ruleName === 'JqlListContext' || childInfo.ruleName === 'JqlFunctionContext') {
        return buildAST(child);
      }
    }
  }

  // 对于所有操作符，先尝试查找 JqlFunctionContext（函数可以在任何比较中使用）
  for (let i = 0; i < node.childCount; i++) {
    const child = node.getChild(i);
    const childInfo = getNodeInfo(child);

    if (childInfo.ruleName === 'JqlFunctionContext') {
      return buildAST(child);
    }
  }

  // 对于其他操作符，查找 JqlValueContext
  for (let i = 0; i < node.childCount; i++) {
    const child = node.getChild(i);
    const childInfo = getNodeInfo(child);

    if (childInfo.ruleName === 'JqlValueContext') {
      return buildAST(child);
    }
  }

  // 递归查找
  for (let i = 0; i < node.childCount; i++) {
    const child = node.getChild(i);
    const result = extractComplexValue(child, operator);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * 提取操作符
 */
function extractOperator(node: ParseTree | undefined): string | null {
  if (!node) {
    return null;
  }

  const info = getNodeInfo(node);
  const ruleName = info.ruleName || '';

  // 处理各种操作符节点
  if (ruleName === 'JqlEqualsClauseContext') {
    return extractOperatorFromClause(node, ['=', '!=']);
  }
  if (ruleName === 'JqlComparisonClauseContext') {
    return extractOperatorFromClause(node, ['>', '<', '>=', '<=']);
  }
  if (ruleName === 'JqlInClauseContext') {
    return extractOperatorFromClause(node, ['in', 'not in']);
  }
  if (ruleName === 'JqlLikeClauseContext') {
    return extractOperatorFromClause(node, ['~', '!~']);
  }

  if (node instanceof TerminalNode) {
    const text = node.text;
    const operators = ['=', '!=', '>', '<', '>=', '<=', '~', '!~', 'in', 'not in'];
    const lowerText = text.toLowerCase();
    if (operators.includes(text) || operators.includes(lowerText)) {
      return text;
    }
  }

  // 递归在子节点中查找操作符
  for (let i = 0; i < node.childCount; i++) {
    const child = node.getChild(i);
    const result = extractOperator(child);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * 构建 ORDER BY 子句的 AST
 */
function buildOrderByAST(node: ParseTree): ASTNode | null {
  const info = getNodeInfo(node);

  if (info.ruleName !== 'JqlOrderByContext') {
    return null;
  }

  const children = getChildren(node);
  const fields: ASTNode[] = [];

  for (const child of children) {
    const childInfo = getNodeInfo(child);

    // 处理每个排序字段
    if (childInfo.ruleName === 'JqlSearchSortContext') {
      const sortChildren = getChildren(child);
      let fieldName: string | null = null;
      let direction: 'ASC' | 'DESC' = 'ASC'; // 默认升序

      for (const sortChild of sortChildren) {
        if (sortChild instanceof TerminalNode) {
          const text = sortChild.text.toUpperCase();
          if (text === 'ASC' || text === 'DESC') {
            direction = text as 'ASC' | 'DESC';
          }
        } else {
          // 提取字段名
          const fieldValue = extractFieldValue(sortChild);
          if (fieldValue) {
            fieldName = fieldValue;
          }
        }
      }

      if (fieldName) {
        fields.push({
          type: 'OrderByField',
          field: fieldName,
          direction,
        });
      }
    }
  }

  if (fields.length === 0) {
    return null;
  }

  return {
    type: 'OrderByClause',
    fields,
  };
}

/**
 * 从特定类型的子句中提取操作符
 */
function extractOperatorFromClause(node: ParseTree, possibleOperators: string[]): string | null {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.getChild(i);

    // 直接检查是否是终端节点
    if (child instanceof TerminalNode) {
      const text = child.text;
      const lowerText = text.toLowerCase();
      if (possibleOperators.includes(text) || possibleOperators.includes(lowerText)) {
        return text;
      }
    } else {
      // 如果是规则节点，递归查找
      const result = extractOperatorFromClause(child, possibleOperators);
      if (result) {
        return result;
      }
    }
  }
  return null;
}

/**
 * 解析 JQL 查询字符串为 AST
 */
export function parseJQL(jqlText: string): ASTNode | null {
  const charStream = CharStreams.fromString(jqlText);
  const lexer = new JQLLexer(charStream);
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new JQLParser(tokenStream);
  const parsedJQLTree = parser.jqlQuery();

  return buildAST(parsedJQLTree);
}

let jql = `project = SCRU AND issuetype in (standardIssueTypes(), subTaskIssueTypes()) AND priority in (High, Medium) AND resolution in (Done, "Won't Do") AND labels in (tag1, tag2) AND Sprint = 1 AND 单选 in (选项1, 选项2) AND 数值 = "123456" AND 版本单选 in (EMPTY, unreleasedVersions(), releasedVersions(), "Version 2.0", "Version 3.0") AND 级联 in cascadeOption(10011, 10013) AND 项目单选 = SCRU AND created >= 2026-01-02 AND created <= 2026-01-09 AND resolved <= -24m AND assignee in (membersOf(jira-administrators), yep) AND 用户单选 in (EMPTY, meng, currentUser()) AND 用户多选 in (meng, wu, yep, currentUser()) AND text ~ "描述"`

// 仅在直接运行文件时执行示例代码
// 在 ES 模块中使用 import.meta.url 来检测
if (import.meta.url === `file://${process.argv[1]}`) {
  const jqlText = jql;
  const charStream = CharStreams.fromString(jqlText);
  const lexer = new JQLLexer(charStream);
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new JQLParser(tokenStream);
  const parsedJQLTree = parser.jqlQuery();

  // 先查看解析树结构
  console.log('=== 解析树结构 ===\n');
  traverseJQLTree(parsedJQLTree, (node, depth) => {
    const indent = '  '.repeat(depth);
    const info = getNodeInfo(node);

    if (info.type === 'terminal') {
      console.log(`${indent}[Terminal] "${info.text}"`);
    } else {
      console.log(`${indent}[${info.ruleName}]`);
    }

    return true;
  });

  // 构建精简的 AST
  const ast = buildAST(parsedJQLTree);
  console.log('\n=== 精简的 AST 结构 ===\n');
  console.log(JSON.stringify(ast, null, 2));
}
