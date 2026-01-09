import { describe, it } from 'vitest';
import { parseJQL } from '../../src/index';
import { expectBinaryExpression, expectLogicalExpression, expectJQLQuery, expectOrderByClause, field, literal, list, func } from '../helpers';

describe('Mix AST', () => {
  it('解析级联字段使用 cascadeOption 函数的查询并包含 ORDER BY 子句', () => {
    const result = parseJQL('级联 in cascadeOption(10011, 10013) ORDER BY priority DESC, updated DESC');

    const { where, orderBy } = expectJQLQuery({ node: result });

    expectBinaryExpression({
      node: where,
      operator: 'in',
      left: field('级联'),
      right: func('cascadeOption', [literal('10011'), literal('10013')])
    });

    expectOrderByClause({
      node: orderBy,
      fields: [
        { field: 'priority', direction: 'DESC' },
        { field: 'updated', direction: 'DESC' }
      ]
    });
  });

  it('解析单选字段使用选项列表的 in 条件', () => {
    const result = parseJQL('单选 in (选项1, 选项2)');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('单选'),
      right: list([
        literal('选项1'),
        literal('选项2')
      ])
    });
  });


  it('解析优先级字段使用值列表的 in 条件', () => {
    const result = parseJQL('priority in (High, Medium)');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('priority'),
      right: list([
        literal('High'),
        literal('Medium')
      ])
    });
  });


  it('解析包含引号字符串值的 resolution 字段查询', () => {
    const result = parseJQL(`resolution in (Done, "Won't Do")`);

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('resolution'),
      right: list([
        literal('Done'),
        literal('"Won\'t Do"')
      ])
    });
  });


  it('解析文本字段的模糊匹配运算符 (~)', () => {
    const result = parseJQL(`text ~ "描述"`);

    expectBinaryExpression({
      node: result,
      operator: '~',
      left: field('text'),
      right: literal('"描述"')
    });
  });

  it('解析使用 AND 运算符连接的日期范围查询', () => {
    const result = parseJQL('created >= 2026-01-02 AND created <= 2026-01-09');

    const { left, right } = expectLogicalExpression({
      node: result,
      operator: 'AND'
    });

    expectBinaryExpression({
      node: left,
      operator: '>=',
      left: field('created'),
      right: literal('2026-01-02')
    });

    expectBinaryExpression({
      node: right,
      operator: '<=',
      left: field('created'),
      right: literal('2026-01-09')
    });
  });
});
