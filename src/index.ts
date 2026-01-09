import { CharStreams, CommonTokenStream } from 'antlr4ts';
import { JQLLexer, JQLParser } from '@atlaskit/jql-parser';
import { ParseTree } from 'antlr4ts/tree/ParseTree';
import { RuleNode } from 'antlr4ts/tree/RuleNode';
import { TerminalNode } from 'antlr4ts/tree/TerminalNode';

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
 * AST 节点类型
 */
export interface ASTNode {
  type: 'BinaryExpression' | 'LogicalExpression' | 'Field' | 'Literal' | 'Identifier';
  operator?: string;
  left?: ASTNode;
  right?: ASTNode;
  value?: string;
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

  // JqlOrClause - OR 逻辑表达式
  if (ruleName === 'JqlOrClauseContext') {
    const children = getChildren(node);
    if (children.length === 1) {
      return buildAST(children[0]);
    }

    // 处理多个子表达式，通常是 left OR right 的结构
    if (children.length >= 3) {
      const left = buildAST(children[0]);
      const right = buildAST(children[2]); // children[1] 是 OR 关键字

      if (left && right) {
        return {
          type: 'LogicalExpression',
          operator: 'OR',
          left,
          right,
        };
      }
    }
  }

  // JqlAndClause - AND 逻辑表达式
  if (ruleName === 'JqlAndClauseContext') {
    const children = getChildren(node);
    if (children.length === 1) {
      return buildAST(children[0]);
    }

    if (children.length >= 3) {
      const left = buildAST(children[0]);
      const right = buildAST(children[2]); // children[1] 是 AND 关键字

      if (left && right) {
        return {
          type: 'LogicalExpression',
          operator: 'AND',
          left,
          right,
        };
      }
    }
  }

  // JqlTerminalClause - 比较表达式 (field operator value)
  if (ruleName === 'JqlTerminalClauseContext') {
    const children = getChildren(node);

    if (children.length >= 2) {
      // children[0] 是字段，children[1] 是包含操作符和值的子树
      const field = extractValue(children[0]);
      const operator = extractOperator(children[1]);

      // 从 children[1] 中提取值，需要排除操作符
      const value = extractValueExcludingOperator(children[1], operator);

      if (field && operator && value) {
        return {
          type: 'BinaryExpression',
          operator,
          left: { type: 'Field', value: field },
          right: { type: 'Literal', value },
        };
      }
    }
  }

  // 递归处理子节点
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
 * 提取操作符
 */
function extractOperator(node: ParseTree | undefined): string | null {
  if (!node) {
    return null;
  }

  if (node instanceof TerminalNode) {
    return node.text;
  }

  // 递归在子节点中查找操作符
  for (let i = 0; i < node.childCount; i++) {
    const child = node.getChild(i);
    if (child instanceof TerminalNode) {
      const text = child.text;
      const operators = ['=', '!=', '>', '<', '>=', '<=', '~', '!~'];
      if (operators.includes(text)) {
        return text;
      }
    }
    // 递归查找
    const result = extractOperator(child);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * 提取值，排除操作符
 */
function extractValueExcludingOperator(node: ParseTree | undefined, excludeOperator: string | null): string | null {
  if (!node) {
    return null;
  }

  if (node instanceof TerminalNode) {
    // 跳过操作符
    if (excludeOperator && node.text === excludeOperator) {
      return null;
    }
    return node.text;
  }

  // 递归查找终端节点
  for (let i = 0; i < node.childCount; i++) {
    const child = node.getChild(i);
    const value = extractValueExcludingOperator(child, excludeOperator);
    if (value) {
      return value;
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

// 仅在直接运行文件时执行示例代码
// 在 ES 模块中使用 import.meta.url 来检测
if (import.meta.url === `file://${process.argv[1]}`) {
  const jqlText = "project = JQL AND status = Done";
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
