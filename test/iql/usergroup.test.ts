import { describe, it, expect } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL 用户组字段转换为 IQL', () => {
  // 基本等值操作
  it('应该转换用户组等值操作（值使用单引号）', () => {
    const jql = '用户组单选 = jira-administrators';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"用户组单选" = 'jira-administrators'`);
  });

  it('应该转换用户组不等值操作', () => {
    const jql = '用户组单选 != jira-developers';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"用户组单选" != 'jira-developers'`);
  });

  // IN 操作符
  it('应该转换用户组 IN 操作', () => {
    const jql = '用户组单选 in (jira-administrators, jira-developers)';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"用户组单选" in ['jira-administrators', 'jira-developers']`);
  });

  it('应该转换用户组 NOT IN 操作', () => {
    const jql = '用户组多选 not in (group1, group2)';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"用户组多选" not in ['group1', 'group2']`);
  });

  // IS NULL / IS NOT NULL
  it('应该转换用户组 IS NULL 操作', () => {
    const jql = '用户组单选 is null';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"用户组单选" is null`);
  });

  it('应该转换用户组 IS NOT NULL 操作', () => {
    const jql = '用户组单选 is not null';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"用户组单选" is not null`);
  });

  it('应该转换用户组 IS EMPTY 操作', () => {
    const jql = '用户组多选 is empty';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"用户组多选" is null`);
  });

  // IN 操作符混合 EMPTY
  it('应该转换 IN 操作符混合 EMPTY', () => {
    const jql = '用户组单选 in (EMPTY, jira-administrators)';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`("用户组单选" in ['jira-administrators'] or "用户组单选" is null)`);
  });

  it('应该转换只包含 EMPTY 的 IN 操作', () => {
    const jql = '用户组单选 in (EMPTY)';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"用户组单选" is null`);
  });

  it('应该转换 NOT IN 操作符混合 EMPTY', () => {
    const jql = '用户组多选 not in (EMPTY, group1)';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`("用户组多选" not in ['group1'] and "用户组多选" is not null)`);
  });

  // 带引号的值
  it('应该正确处理带引号的用户组名称', () => {
    const jql = '用户组单选 = "jira-administrators"';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"用户组单选" = 'jira-administrators'`);
  });

  // 复杂查询
  it('应该转换包含用户组字段的复杂查询', () => {
    const jql = '用户组单选 = jira-administrators AND 用户组多选 != group1';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"用户组单选" = 'jira-administrators' and "用户组多选" != 'group1'`);
  });

  it('应该转换包含用户组和 EMPTY 的复杂查询', () => {
    const jql = '用户组单选 in (jira-administrators, EMPTY) OR 用户组多选 = group1';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`("用户组单选" in ['jira-administrators'] or "用户组单选" is null) or "用户组多选" = 'group1'`);
  });

  // 特殊字符的用户组名称
  it('应该处理包含特殊字符的用户组名称', () => {
    const jql = '用户组单选 = "jira-admin-users-2024"';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"用户组单选" = 'jira-admin-users-2024'`);
  });

  it('应该处理包含空格的用户组名称', () => {
    const jql = '用户组单选 = "Admin Users"';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"用户组单选" = 'Admin Users'`);
  });
});
