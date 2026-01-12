import { describe, expect, it } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL Text/LongText/Name 字段转换为 IQL', () => {
  it('应该将 text ~ "111" 转换为标题的模糊匹配查询', () => {
    const result = jql2iql('text ~ "111"', testConstants);
    expect(result).toBe(`"标题" ~ "111"`);
  });

  it('应该将文本单行 ~ " 111" 转换为文本单行的模糊匹配查询', () => {
    const result = jql2iql('文本单行 ~ " 111"', testConstants);
    expect(result).toBe(`"文本单行" ~ " 111"`);
  });

  it('应该将文本多行 ~ "描述" 转换为文本多行的模糊匹配查询', () => {
    const result = jql2iql('description ~ "描述"', testConstants);
    expect(result).toBe(`"描述" ~ "描述"`);
  });

  it('应该处理不带引号的文本值', () => {
    const result = jql2iql('text ~ test', testConstants);
    expect(result).toBe(`"标题" ~ "test"`);
  });

  it('应该处理带空格的文本值', () => {
    const result = jql2iql('文本单行 ~ "  空格测试  "', testConstants);
    expect(result).toBe(`"文本单行" ~ "  空格测试  "`);
  });

  it('应该将 key = "PROJ-123" 转换为键的等于查询', () => {
    const result = jql2iql('key = "PROJ-123"', testConstants);
    expect(result).toBe('"key" = "PROJ-123"');
  });

  it('应该处理 key 字段的 in 操作符', () => {
    const result = jql2iql('key in ("PROJ-123", "PROJ-456")', testConstants);
    expect(result).toBe('"key" in ["PROJ-123", "PROJ-456"]');
  });
});
