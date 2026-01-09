import { describe, it } from 'vitest';
import { parseJQL } from '../../src/index';
import { expectBinaryExpression, field, list, func, literal } from '../helpers';

describe('Issuetype AST', () => {
  it('解析 issuetype 字段使用多个函数列表的 in 条件', () => {
    const result = parseJQL('issuetype in (standardIssueTypes(), subTaskIssueTypes())');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('issuetype'),
      right: list([
        func('standardIssueTypes'),
        func('subTaskIssueTypes')
      ])
    });
  });

  it('解析 issuetype 字段使用单个函数的 in 条件', () => {
    const result = parseJQL('issuetype in standardIssueTypes()');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('issuetype'),
      right: func('standardIssueTypes')
    });
  });

  it('解析 issuetype 字段的相等比较表达式', () => {
    const result = parseJQL('issuetype = Epic');

    expectBinaryExpression({
      node: result,
      operator: '=',
      left: field('issuetype'),
      right: literal('Epic')
    });
  });

  it('解析 issuetype 字段使用字面量列表的 in 条件', () => {
    const result = parseJQL('issuetype in (Epic, Story)');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('issuetype'),
      right: list([
        literal('Epic'),
        literal('Story')
      ])
    });
  });
});
