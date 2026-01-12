import { describe, expect, it } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL Sprint 字段转换为 IQL', () => {
  it('应该将 Sprint in (1, 2) 转换为迭代的多值查询', () => {
    const result = jql2iql('Sprint in (1, 2)', testConstants);
    expect(result).toBe(`"迭代" in ["1", "2"]`);
  });

  it('应该将 sprint in (1, 2) 转换为迭代的多值查询', () => {
    const result = jql2iql('sprint in (1, 2)', testConstants);
    expect(result).toBe(`"迭代" in ["1", "2"]`);
  });

  it('应该将 Sprint = 1 转换为迭代的单值查询', () => {
    const result = jql2iql('Sprint = 1', testConstants);
    expect(result).toBe(`"迭代" = "1"`);
  });

  it('应该处理多个 Sprint 值', () => {
    const result = jql2iql('Sprint in (1, 2, 3, 4)', testConstants);
    expect(result).toBe(`"迭代" in ["1", "2", "3", "4"]`);
  });
});
