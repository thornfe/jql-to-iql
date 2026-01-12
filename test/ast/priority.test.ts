import { describe, it } from 'vitest';
import { parseJQL } from '../../src/index';
import { expectBinaryExpression, field, literal, list } from '../helpers';

describe('Priority AST', () => {
  it('解析 priority 字段的等于表达式', () => {
    const result = parseJQL('priority = Highest');

    expectBinaryExpression({
      node: result,
      operator: '=',
      left: field('priority'),
      right: literal('Highest')
    });
  });

  it('解析 priority 字段的 in 条件', () => {
    const result = parseJQL('priority in (Highest, High)');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('priority'),
      right: list([
        literal('Highest'),
        literal('High')
      ])
    });
  });

  it('解析 priority 字段的 in 条件（多个值）', () => {
    const result = parseJQL('priority in (Highest, High, Medium, Low, Lowest)');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('priority'),
      right: list([
        literal('Highest'),
        literal('High'),
        literal('Medium'),
        literal('Low'),
        literal('Lowest')
      ])
    });
  });

  it('解析带引号的 priority 值', () => {
    const result = parseJQL('priority = "Highest"');

    expectBinaryExpression({
      node: result,
      operator: '=',
      left: field('priority'),
      right: literal('"Highest"')
    });
  });
});
