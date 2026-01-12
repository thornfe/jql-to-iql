import { describe, it } from 'vitest';
import { parseJQL } from '../../src/index';
import { expectBinaryExpression, field, literal, list } from '../helpers';

describe('Status AST', () => {
  it('解析状态字段使用混合引号的 in 条件', () => {
    const result = parseJQL('status in ("In Progress", "To Do", Done)');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('status'),
      right: list([
        literal('"In Progress"'),
        literal('"To Do"'),
        literal('Done')
      ])
    });
  });

  it('解析状态字段的等于表达式', () => {
    const result = parseJQL('status = "In Progress"');

    expectBinaryExpression({
      node: result,
      operator: '=',
      left: field('status'),
      right: literal('"In Progress"')
    });
  });

  it('解析状态字段不带引号的等于表达式', () => {
    const result = parseJQL('status = Done');

    expectBinaryExpression({
      node: result,
      operator: '=',
      left: field('status'),
      right: literal('Done')
    });
  });

  it('解析状态字段的 in 条件（全部带引号）', () => {
    const result = parseJQL('status in ("Open", "Closed")');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('status'),
      right: list([
        literal('"Open"'),
        literal('"Closed"')
      ])
    });
  });

  it('解析状态字段的 in 条件（全部不带引号）', () => {
    const result = parseJQL('status in (Open, Closed, Done)');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('status'),
      right: list([
        literal('Open'),
        literal('Closed'),
        literal('Done')
      ])
    });
  });
});
