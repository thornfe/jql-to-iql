import { describe, it, expect } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL ORDER BY 字段映射与过滤（统一策略）', () => {
  it('应该在 ORDER BY 中过滤掉 Rank 字段（无 IQL 映射）', () => {
    const jql = 'project = SCRU ORDER BY Rank ASC';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU"`);
  });

  it('应该在 ORDER BY 中过滤掉 rank 字段（小写）', () => {
    const jql = 'project = SCRU ORDER BY rank DESC';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU"`);
  });

  it('应该在多字段 ORDER BY 中过滤掉 Rank 字段', () => {
    const jql = 'project = SCRU ORDER BY Rank ASC, priority DESC';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU" order by 优先级 desc`);
  });

  it('应该在混合 ORDER BY 中过滤掉 Rank 字段', () => {
    const jql = 'project = SCRU ORDER BY priority ASC, Rank DESC, created DESC';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU" order by 优先级 asc,创建时间 desc`);
  });

  it('应该处理只有 Rank 的 ORDER BY（返回无 order by 部分）', () => {
    const jql = 'project = SCRU ORDER BY Rank ASC';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU"`);
  });

  it('Rank 字段在 WHERE 子句中应返回空字符串（不支持）', () => {
    const jql = 'Rank = 100';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe('');
  });

  it('包含 Rank WHERE 条件的复杂查询应返回空字符串', () => {
    const jql = 'project = SCRU AND Rank = 100';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe('');
  });

  it('应该正确处理 JQL 文档中的示例：project = BDR and issuetype in (Epic, Story) ORDER BY Rank ASC', () => {
    // 假设 BDR 项目存在，需要先添加到 projectMap
    const constantsWithBDR = {
      ...testConstants,
      projectMap: {
        ...testConstants.projectMap,
        BDR: "BDR"
      }
    };
    const jql = 'project = BDR and issuetype in (Epic, Story) ORDER BY Rank ASC';
    const result = jql2iql(jql, constantsWithBDR);
    expect(result).toBe(`"所属空间" = "BDR" and "类型" in ["Epic","Story"]`);
  });

  it('应该过滤掉任何没有 IQL 映射的字段（统一策略）', () => {
    const jql = 'project = SCRU ORDER BY unknownField ASC';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU"`);
  });

  it('应该在混合排序中过滤掉所有未映射的字段', () => {
    const jql = 'project = SCRU ORDER BY priority ASC, unknownField1 DESC, created ASC, unknownField2 DESC';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU" order by 优先级 asc,创建时间 asc`);
  });

  it('如果所有排序字段都未映射，应该返回无 order by 部分', () => {
    const jql = 'project = SCRU ORDER BY unknownField1 ASC, unknownField2 DESC';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"所属空间" = "SCRU"`);
  });
});
