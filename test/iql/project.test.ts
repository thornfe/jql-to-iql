import { describe, expect, it } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL Project 字段转换为 IQL', () => {
  it('应该将 project = KEY 转换为所属空间的单值查询', () => {
    const result = jql2iql('project = SCRU', testConstants);
    expect(result).toBe(`"所属空间" = "SCRU"`);
  });

  it('应该将 project in (KEY1, KEY2) 转换为所属空间的多值查询', () => {
    const result = jql2iql('project in (SCRU, TEST)', testConstants);
    expect(result).toBe(`"所属空间" in ["SCRU", "TEST"]`);
  });

  it('应该将存在于 projectMap 中的 key 转换为对应的 value', () => {
    const result = jql2iql('project = AA', testConstants);
    expect(result).toBe(`"所属空间" = "项目 A"`);
  });

  it('应该支持使用中文项目名直接查询（BBB 存在于 map，但映射为自己）', () => {
    const result = jql2iql('project = BBB', testConstants);
    expect(result).toBe(`"所属空间" = "BBB"`);
  });

  it('应该处理不在 projectMap 中的项目 key（直接使用原值）', () => {
    const result = jql2iql('project = UNKNOWN', testConstants);
    expect(result).toBe(`"所属空间" = "UNKNOWN"`);
  });

  it('应该在 in 条件中正确处理混合存在和不存在的项目 key', () => {
    const result = jql2iql('project in (AA, BBB, UNKNOWN)', testConstants);
    expect(result).toBe(`"所属空间" in ["项目 A", "BBB", "UNKNOWN"]`);
  });
});
