import { describe, expect, it } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL 版本字段转换为 IQL', () => {
  const constantsMap = testConstants;

  it('应该过滤掉函数并只保留字面量值，使用版本映射', () => {
    const result = jql2iql(
      '版本单选 in (unreleasedVersions(), releasedVersions(), "Version 2.0", "Version 3.0")',
      constantsMap
    );
    expect(result).toBe(`"版本单选" in ["10001", "10002"]`);
  });

  it('应该过滤掉函数和 EMPTY，只保留字面量值并使用版本映射', () => {
    const result = jql2iql(
      '版本单选 in (EMPTY, unreleasedVersions(), releasedVersions(), "Version 2.0", "Version 3.0")',
      constantsMap
    );
    // EMPTY 单独处理，与字面量值用 or 连接
    expect(result).toBe(`("版本单选" in ["10001", "10002"] or "版本单选" is NULL)`);
  });

  it('应该处理只有函数的情况，返回空结果', () => {
    const result = jql2iql(
      '版本单选 in (unreleasedVersions(), releasedVersions())',
      constantsMap
    );
    // 所有元素都是函数，被过滤后没有剩余元素
    expect(result).toBe('');
  });

  it('应该处理等于操作符并使用版本映射', () => {
    const result = jql2iql('版本单选 = "Version 1.0"', constantsMap);
    expect(result).toBe(`"版本单选" in ["10000", "10100"]`);
  });

  it('应该处理 is EMPTY 判空表达式', () => {
    const result = jql2iql('版本单选 is EMPTY', constantsMap);
    expect(result).toBe(`"版本单选" is NULL`);
  });

  it('应该处理只包含 EMPTY 的 in 表达式', () => {
    const result = jql2iql('版本单选 in (EMPTY)', constantsMap);
    expect(result).toBe(`"版本单选" is NULL`);
  });

  it('应该过滤 latestReleasedVersion 函数', () => {
    const result = jql2iql('版本单选 = latestReleasedVersion()', constantsMap);
    // 函数在等于操作符中被过滤
    expect(result).toBe('');
  });

  it('应该处理没有映射的版本名称，使用原始值', () => {
    const result = jql2iql('版本单选 = "Version 4.0"', constantsMap);
    expect(result).toBe(`"版本单选" in ["Version 4.0"]`);
  });

  it('应该在 in 操作中混合使用有映射和无映射的版本', () => {
    const result = jql2iql('版本单选 in ("Version 1.0", "Version 4.0")', constantsMap);
    expect(result).toBe(`"版本单选" in ["10000", "10100", "Version 4.0"]`);
  });
});
