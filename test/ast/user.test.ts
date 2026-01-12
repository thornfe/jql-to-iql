import { describe, it } from 'vitest';
import { parseJQL } from '../../src/index';
import { expectBinaryExpression, field, literal, list, func } from '../helpers';

describe('User AST', () => {
  it('解析用户字段使用函数和字面量混合列表的 in 条件', () => {
    const result = parseJQL('assignee in (membersOf(jira-administrators), yep)');
    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('assignee'),
      right: list([
        func('membersOf', [literal('jira-administrators')]),
        literal('yep')
      ])
    });
  });

  it('解析用户字段包含 EMPTY 和 currentUser 函数的 in 条件', () => {
    const result = parseJQL('用户单选 in (EMPTY, meng, currentUser())');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('用户单选'),
      right: list([
        literal('EMPTY'),
        literal('meng'),
        func('currentUser')
      ])
    });
  });

  it('解析用户字段等于字面量值的表达式', () => {
    const result = parseJQL('assignee = meng');

    expectBinaryExpression({
      node: result,
      operator: '=',
      left: field('assignee'),
      right: literal('meng')
    });
  });

  it('解析用户字段的 not in 条件查询', () => {
    const result = parseJQL('用户单选 not in ("user1")');

    expectBinaryExpression({
      node: result,
      operator: 'not in',
      left: field('用户单选'),
      right: list([
        literal('"user1"')
      ])
    });
  });

  it('解析用户字段等于函数返回值的表达式', () => {
    const result = parseJQL('assignee = currentUser()');

    expectBinaryExpression({
      node: result,
      operator: '=',
      left: field('assignee'),
      right: func('currentUser')
    });
  });
});




