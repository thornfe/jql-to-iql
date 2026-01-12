import { describe, it, expect } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL ORDER BY 转换为 IQL', () => {
  it('应该转换单个字段的 ORDER BY（降序）', () => {
    const jql = 'project = SCRU ORDER BY priority DESC';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU" order by 优先级 desc`);
  });

  it('应该转换单个字段的 ORDER BY（升序）', () => {
    const jql = 'project = SCRU ORDER BY priority ASC';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU" order by 优先级 asc`);
  });

  it('应该转换多个字段的 ORDER BY', () => {
    const jql = 'project = SCRU ORDER BY priority DESC, created ASC';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU" order by 优先级 desc,创建时间 asc`);
  });

  it('应该转换自定义字段 cf[objectId] 格式的 ORDER BY', () => {
    const jql = 'project = SCRU ORDER BY cf[10116] DESC';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU" order by 列表多选 desc`);
  });

  it('应该转换多个自定义字段的 ORDER BY', () => {
    const jql = 'project = SCRU ORDER BY cf[10116] DESC, cf[10118] ASC';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU" order by 列表多选 desc,下拉单选 asc`);
  });

  it('应该转换混合普通字段和自定义字段的 ORDER BY', () => {
    const jql = 'project = SCRU ORDER BY priority DESC, cf[10116] ASC, created DESC';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU" order by 优先级 desc,列表多选 asc,创建时间 desc`);
  });

  it('应该正确处理映射后的字段名', () => {
    const jql = 'project = SCRU ORDER BY assignee DESC';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU" order by 负责人 desc`);
  });

  it('应该处理只有 ORDER BY 没有 WHERE 的查询', () => {
    const jql = 'ORDER BY priority DESC';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe('order by 优先级 desc');
  });

  it('不应该影响没有 ORDER BY 的查询', () => {
    const jql = 'project = SCRU';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU"`);
  });
});
