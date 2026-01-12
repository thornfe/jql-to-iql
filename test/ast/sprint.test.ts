import { describe, it } from 'vitest';
import { parseJQL } from '../../src/index';
import { expectBinaryExpression, field, literal, list } from '../helpers';

describe('Sprint AST', () => {
  it('解析 Sprint 字段的 in 条件', () => {
    const result = parseJQL('Sprint in (1, 2)');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('Sprint'),
      right: list([
        literal('1'),
        literal('2')
      ])
    });
  });

  it('解析 Sprint 字段的等于表达式', () => {
    const result = parseJQL('Sprint = 1');

    expectBinaryExpression({
      node: result,
      operator: '=',
      left: field('Sprint'),
      right: literal('1')
    });
  });

  it('解析 Sprint 字段的 in 条件（多个值）', () => {
    const result = parseJQL('Sprint in (1, 2, 3, 4)');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('Sprint'),
      right: list([
        literal('1'),
        literal('2'),
        literal('3'),
        literal('4')
      ])
    });
  });

  it('解析小写 sprint 字段', () => {
    const result = parseJQL('sprint in (1, 2)');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('sprint'),
      right: list([
        literal('1'),
        literal('2')
      ])
    });
  });
});
