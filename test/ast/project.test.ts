import { describe, it } from 'vitest';
import { parseJQL } from '../../src/index';
import { expectBinaryExpression, field, literal, list } from '../helpers';

describe('Project AST', () => {
  it('解析 project 字段的相等比较表达式', () => {
    const result = parseJQL('project = SCRU');

    expectBinaryExpression({
      node: result,
      operator: '=',
      left: field('project'),
      right: literal('SCRU')
    });
  });

  it('解析 project 字段使用多个项目键的 in 条件', () => {
    const result = parseJQL('project in (SCRU, AA)');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('project'),
      right: list([
        literal('SCRU'),
        literal('AA')
      ])
    });
  });
});
