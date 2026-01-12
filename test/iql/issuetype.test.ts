import { describe, expect, it } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL Issuetype 字段转换为 IQL', () => {
  it('应该将 issuetype = TYPE 转换为类型的单值查询', () => {
    const result = jql2iql('issuetype = Epic', testConstants);
    expect(result).toBe(`"类型" = "Epic"`);
  });

  it('应该将 issuetype in (TYPE1, TYPE2) 转换为类型的多值查询', () => {
    const result = jql2iql('issuetype in (Epic, Bug)', testConstants);
    expect(result).toBe(`"类型" in ["Epic","Bug"]`);
  });
});
