import { describe, it, expect } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL 数值字段转换为 IQL', () => {
  it('应该转换 Story Points 等于操作', () => {
    const jql = 'issuetype = Story AND "Story Points" = "5"';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"类型" = "Story" and "故事点" = 5`);
  });

  it('应该转换 Story Points 大于操作', () => {
    const jql = 'issuetype = Story AND "Story Points" > 1';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"类型" = "Story" and "故事点" > 1`);
  });

  it('应该转换数值字段大于操作', () => {
    const jql = '数值 > 1';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"数值" > 1`);
  });

  it('应该转换数值字段等于操作', () => {
    const jql = '数值 = 10';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"数值" = 10`);
  });

  it('应该转换数值字段不等于操作', () => {
    const jql = '数值 != 5';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"数值" != 5`);
  });

  it('应该转换数值字段大于等于操作', () => {
    const jql = '数值 >= 100';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"数值" >= 100`);
  });

  it('应该转换数值字段小于操作', () => {
    const jql = '数值 < 50';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"数值" < 50`);
  });

  it('应该转换数值字段小于等于操作', () => {
    const jql = '数值 <= 200';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"数值" <= 200`);
  });

  it('应该转换数值字段 in 操作', () => {
    const jql = '数值 in (1, 2, 3)';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"数值" in [1, 2, 3]`);
  });

  it('应该转换数值字段 not in 操作', () => {
    const jql = '数值 not in (10, 20, 30)';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"数值" not in [10, 20, 30]`);
  });

  it('应该转换整数字段', () => {
    const jql = '数值 = 42';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"数值" = 42`);
  });

  it('应该转换浮点数字段', () => {
    const jql = '数值 > 3.14';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"数值" > 3.14`);
  });

  it('应该转换数值字段 is null', () => {
    const jql = '数值 is null';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"数值" is null`);
  });

  it('应该转换数值字段 is not null', () => {
    const jql = '数值 is not null';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"数值" is not null`);
  });

  it('应该过滤负数（仅支持非负数）', () => {
    const jql = '数值 = -5';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe('');
  });

  it('应该转换复杂查询中的数值字段', () => {
    const jql = 'project = SCRU AND "Story Points" >= 3 AND 数值 < 100';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU" and "故事点" >= 3 and "数值" < 100`);
  });
});
