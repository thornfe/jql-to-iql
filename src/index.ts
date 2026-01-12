import { CharStreams, CommonTokenStream } from 'antlr4ts';
import { JQLLexer, JQLParser } from '@atlaskit/jql-parser';
import type { ASTNode, ConstantsMap } from './types';
import { buildAST } from './jql-to-ast/ast-builder';
import { astToIQL } from './ast-to-iql/iql-converter';

// 重新导出类型供外部使用
export * from './types';

// 重新导出字段转换工具
export { transformFieldsToConstantsMap } from './field-transformer';
export type { RawField, FieldTypeInfo, TransformOptions } from './field-transformer';

// 重新导出工具函数
export { traverseJQLTree, getNodeInfo } from './jql-to-ast/parser-utils';
export { buildAST } from './jql-to-ast/ast-builder';
export { astToIQL } from './ast-to-iql/iql-converter';


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

/**
 * 将 JQL 转换为 IQL
 */
export function jql2iql(jqlText: string, constantsMap: ConstantsMap): string {
  const ast = parseJQL(jqlText);
  if (!ast) {
    return '';
  }
  return astToIQL(ast, constantsMap);
}
