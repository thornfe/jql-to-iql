import { describe, expect, it } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('非法运算符拦截', () => {
  it('应该支持 IS NULL（JQL 解析器将 null 转为 EMPTY）', () => {
    const result = jql2iql('assignee is null', testConstants);
    expect(result).not.toBe('');
    expect(result).toContain('is null');
  });

  it('应该拦截 WAS 运算符（不支持）', () => {
    const result = jql2iql('status was "In Progress"', testConstants);
    expect(result).toBe('');
  });

  it('应该拦截 CHANGED 运算符（不支持）', () => {
    const result = jql2iql('status changed', testConstants);
    expect(result).toBe('');
  });

  it('应该支持合法的比较运算符 =', () => {
    const result = jql2iql('priority = High', testConstants);
    expect(result).toBe(`"优先级" = "High"`);
  });

  it('应该支持合法的比较运算符 !=', () => {
    const result = jql2iql('priority != Low', testConstants);
    expect(result).toBe(`"优先级" != "Low"`);
  });

  it('应该支持合法的比较运算符 ~', () => {
    const result = jql2iql('text ~ "search"', testConstants);
    expect(result).toBe(`"标题" ~ "search"`);
  });

  it('应该支持合法的比较运算符 !~', () => {
    const result = jql2iql('text !~ "exclude"', testConstants);
    expect(result).toBe(`"标题" !~ "exclude"`);
  });

  it('应该支持合法的 IN 运算符', () => {
    const result = jql2iql('priority in (High, Low)', testConstants);
    expect(result).toBe(`"优先级" in ["High", "Low"]`);
  });

  it('应该支持 AND 逻辑运算符', () => {
    const result = jql2iql('priority = High AND text ~ "test"', testConstants);
    expect(result).toBe(`"优先级" = "High" and "标题" ~ "test"`);
  });

  it('应该支持 OR 逻辑运算符', () => {
    const result = jql2iql('priority = High OR text ~ "test"', testConstants);
    expect(result).toBe(`"优先级" = "High" or "标题" ~ "test"`);
  });
});
