import { describe, expect, it } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL 用户字段转换为 IQL', () => {
  it('应该将用户字段 in (EMPTY, ...) 转换为 or 条件', () => {
    const result = jql2iql('用户单选 in (EMPTY, meng, currentUser())', testConstants);
    expect(result).toBe(`("用户单选" in ["meng", "currentUser()"] or "用户单选" is null)`);
  });

  it('应该将系统字段 creator 映射为创建人', () => {
    const result = jql2iql('creator in (EMPTY, user1)', testConstants);
    expect(result).toBe(`("创建人" in ["user1"] or "创建人" is null)`);
  });
});
