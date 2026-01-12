import { describe, expect, it } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL Status 字段转换为 IQL', () => {
  it('应该将 status in 混合引号的值转换为状态的多值查询', () => {
    const result = jql2iql('status in ("In Progress", "To Do", Done)', testConstants);
    expect(result).toBe(`"状态" in ["In Progress", "To Do", "Done"]`);
  });

  it('应该将 status = 转换为状态的单值查询', () => {
    const result = jql2iql('status = "In Progress"', testConstants);
    expect(result).toBe(`"状态" = "In Progress"`);
  });
});
