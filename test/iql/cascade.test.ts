import { describe, expect, it } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL Cascade 字段转换为 IQL', () => {
  it('应该将 级联 in cascadeOption(10011) 转换为 IQL', () => {
    const result = jql2iql('级联 in cascadeOption(10011)', testConstants);
    expect(result).toBe(`"级联" in ["广东"]`);
  });

  it('应该将 级联 = cascadeOption(10011) 转换为 IQL', () => {
    const result = jql2iql('级联 = cascadeOption(10011)', testConstants);
    expect(result).toBe(`"级联" = "广东"`);
  });

  it('应该将多个 cascadeOption 转换为 IQL', () => {
    const result = jql2iql('级联 in (cascadeOption(10011), cascadeOption(10012))', testConstants);
    expect(result).toBe(`"级联" in ["广东", "北京"]`);
  });

  it('应该将 cascadeOption 与 EMPTY 混用转换为 IQL', () => {
    const result = jql2iql('级联 in (EMPTY, cascadeOption(10013))', testConstants);
    expect(result).toBe(`("级联" in ["广州"] or "级联" is null)`);
  });

  it('应该将 级联 is EMPTY 转换为 IQL', () => {
    const result = jql2iql('级联 is EMPTY', testConstants);
    expect(result).toBe(`"级联" is null`);
  });

  it('应该将 级联 is not EMPTY 转换为 IQL', () => {
    const result = jql2iql('级联 is not EMPTY', testConstants);
    expect(result).toBe(`"级联" is not null`);
  });

  it('应该将未映射的 cascadeOption 值原样输出', () => {
    const result = jql2iql('级联 = cascadeOption(99999)', testConstants);
    expect(result).toBe(`"级联" = "99999"`);
  });

  it('应该支持不同字段名的 Cascade 字段', () => {
    const result = jql2iql('级联 in cascadeOption(10011, 10014)', testConstants);
    expect(result).toBe(`"级联" in ["广东"]`);
  });

  it('应该支持复杂的 Cascade 查询', () => {
    const result = jql2iql('级联 in (cascadeOption(10011), cascadeOption(10013)) AND 级联 not in cascadeOption(10012)', testConstants);
    expect(result).toBe(`"级联" in ["广东", "广州"] and "级联" not in ["北京"]`);
  });

  it('应该将 级联 not in (cascadeOption(...)) 转换为 IQL', () => {
    const result = jql2iql('级联 not in (cascadeOption(10011), cascadeOption(10012))', testConstants);
    expect(result).toBe(`"级联" not in ["广东", "北京"]`);
  });

  it('应该支持混合 cascadeOption 和 EMPTY 的 not in', () => {
    const result = jql2iql('级联 not in (EMPTY, cascadeOption(10013))', testConstants);
    expect(result).toBe(`("级联" not in ["广州"] and "级联" is not null)`);
  });
});
