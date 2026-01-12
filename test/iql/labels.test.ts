import { describe, expect, it } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL labels 字段（Tag 类型）转换为 IQL', () => {
  it('应该将 labels = tag1 转换为 IQL', () => {
    const result = jql2iql('labels = tag1', testConstants);
    expect(result).toBe(`"标签" = "tag1"`);
  });

  it('应该将 labels in (tag1, tag2) 转换为 IQL', () => {
    const result = jql2iql('labels in (tag1, tag2)', testConstants);
    expect(result).toBe(`"标签" in ["tag1", "tag2"]`);
  });

  it('应该将 labels not in (tag1, tag2) 转换为 IQL', () => {
    const result = jql2iql('labels not in (tag1, tag2)', testConstants);
    expect(result).toBe(`"标签" not in ["tag1", "tag2"]`);
  });

  it('应该将 labels ~ "bug" 转换为 IQL（模糊匹配）', () => {
    const result = jql2iql('labels ~ "bug"', testConstants);
    expect(result).toBe(`"标签" ~ "bug"`);
  });

  it('应该支持带中文的标签', () => {
    const result = jql2iql('labels = 前端开发', testConstants);
    expect(result).toBe(`"标签" = "前端开发"`);
  });
});
