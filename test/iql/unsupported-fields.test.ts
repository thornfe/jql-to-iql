import { describe, it, expect } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('不支持的 FieldTypeKey 转换', () => {
  it('Tag 类型字段应返回空字符串', () => {
    const jql = 'customField1 = "test"';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe('');
  });

  it('Checkbox 类型字段应返回空字符串', () => {
    const jql = 'customField2 = "value"';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe('');
  });


  it('File 类型字段应返回空字符串', () => {
    const jql = 'customField4 = "file.pdf"';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe('');
  });

  it('支持的 User 类型字段应正常转换', () => {
    const jql = 'assignee = john';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"负责人" = "john"`);
  });

  it('支持的 Text 类型字段应正常转换', () => {
    const jql = 'summary ~ "test"';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"标题" ~ "test"`);
  });

  it('复杂查询中包含不支持字段时应返回空字符串', () => {
    const jql = 'project = "TEST" AND customField1 = "value"';
    const result = jql2iql(jql, testConstants);
    // 因为 AND 操作符的右侧返回空字符串，整个表达式返回空字符串
    expect(result).toBe('');
  });

  it('OR 查询中的不支持字段应被过滤', () => {
    const jql = 'customField1 = "value1" OR customField2 = "value2"';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe('');
  });
});
