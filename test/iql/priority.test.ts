import { describe, expect, it } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL Priority 字段转换为 IQL', () => {
  it('应该将 priority = Highest 转换为优先级的单值查询', () => {
    const result = jql2iql('priority = Highest', testConstants);
    expect(result).toBe(`"优先级" = "Highest"`);
  });

  it('应该将 priority in 多个值转换为优先级的多值查询', () => {
    const result = jql2iql('priority in (Highest, High)', testConstants);
    expect(result).toBe(`"优先级" in ["Highest", "High"]`);
  });
});
