import { describe, it } from 'vitest';
import { parseJQL } from '../../src/index';
import {
  expectJQLQuery,
  expectBinaryExpression,
  expectOrderByClause,
  field,
  literal
} from '../helpers';

describe('ORDER BY AST', () => {
  it('解析单个字段的 ORDER BY 子句（降序）', () => {
    const result = parseJQL('project = JQL ORDER BY priority DESC');

    const { where, orderBy } = expectJQLQuery({ node: result });

    // 验证 WHERE 子句
    expectBinaryExpression({
      node: where,
      operator: '=',
      left: field('project'),
      right: literal('JQL')
    });

    // 验证 ORDER BY 子句
    expectOrderByClause({
      node: orderBy,
      fields: [
        { field: 'priority', direction: 'DESC' }
      ]
    });
  });

  it('解析单个字段的 ORDER BY 子句（升序）', () => {
    const result = parseJQL('status = Done ORDER BY created ASC');

    const { where, orderBy } = expectJQLQuery({ node: result });

    expectBinaryExpression({
      node: where,
      operator: '=',
      left: field('status'),
      right: literal('Done')
    });

    expectOrderByClause({
      node: orderBy,
      fields: [
        { field: 'created', direction: 'ASC' }
      ]
    });
  });

  it('解析多个字段的 ORDER BY 子句', () => {
    const result = parseJQL('labels = tag1 ORDER BY priority DESC, updated DESC');

    const { where, orderBy } = expectJQLQuery({ node: result });

    expectBinaryExpression({
      node: where,
      operator: '=',
      left: field('labels'),
      right: literal('tag1')
    });

    expectOrderByClause({
      node: orderBy,
      fields: [
        { field: 'priority', direction: 'DESC' },
        { field: 'updated', direction: 'DESC' }
      ]
    });
  });

  it('解析混合升序和降序的 ORDER BY 子句', () => {
    const result = parseJQL('assignee = currentUser() ORDER BY priority DESC, created ASC, updated DESC');

    const { where, orderBy } = expectJQLQuery({ node: result });

    expectOrderByClause({
      node: orderBy,
      fields: [
        { field: 'priority', direction: 'DESC' },
        { field: 'created', direction: 'ASC' },
        { field: 'updated', direction: 'DESC' }
      ]
    });
  });

  it('解析不带 ORDER BY 的查询，返回简单的 WHERE 表达式', () => {
    const result = parseJQL('project = JQL');

    // 不应该返回 JQLQuery 类型
    expectBinaryExpression({
      node: result,
      operator: '=',
      left: field('project'),
      right: literal('JQL')
    });
  });

  it('解析复杂条件配合 ORDER BY 子句', () => {
    const result = parseJQL('project = JQL AND status = Done ORDER BY priority DESC, created ASC');

    const { where, orderBy } = expectJQLQuery({ node: result });

    // WHERE 是一个逻辑表达式
    expectBinaryExpression({
      node: where?.left,
      operator: '=',
      left: field('project'),
      right: literal('JQL')
    });

    expectBinaryExpression({
      node: where?.right,
      operator: '=',
      left: field('status'),
      right: literal('Done')
    });

    expectOrderByClause({
      node: orderBy,
      fields: [
        { field: 'priority', direction: 'DESC' },
        { field: 'created', direction: 'ASC' }
      ]
    });
  });

  it('解析中文字段的 ORDER BY 子句', () => {
    const result = parseJQL('单选 = 选项1 ORDER BY 优先级 DESC, 创建时间 ASC');

    const { where, orderBy } = expectJQLQuery({ node: result });

    expectBinaryExpression({
      node: where,
      operator: '=',
      left: field('单选'),
      right: literal('选项1')
    });

    expectOrderByClause({
      node: orderBy,
      fields: [
        { field: '优先级', direction: 'DESC' },
        { field: '创建时间', direction: 'ASC' }
      ]
    });
  });
});
