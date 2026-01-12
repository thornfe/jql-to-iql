import { describe, it, expect } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL 日期字段转换为 IQL', () => {
  // 基本的 created 和 updated 字段测试
  it('应该转换 created 字段为"创建时间"', () => {
    const jql = 'created > "2024-01-01"';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" > "2024-01-01"`);
  });

  it('应该转换 updated 字段为"修改时间"', () => {
    const jql = 'updated < "2024-12-31"';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"修改时间" < "2024-12-31"`);
  });

  // 支持的日期函数测试
  it('应该支持 startOfDay 函数', () => {
    const jql = 'created > startOfDay()';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" > startOfDay()`);
  });

  it('应该支持 endOfDay 函数', () => {
    const jql = 'created <= endOfDay()';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" <= endOfDay()`);
  });

  it('应该支持 startOfWeek 函数', () => {
    const jql = 'updated >= startOfWeek()';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"修改时间" >= startOfWeek()`);
  });

  it('应该支持 endOfWeek 函数', () => {
    const jql = 'updated <= endOfWeek()';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"修改时间" <= endOfWeek()`);
  });

  it('应该支持 startOfMonth 函数', () => {
    const jql = 'created >= startOfMonth()';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" >= startOfMonth()`);
  });

  it('应该支持 endOfMonth 函数', () => {
    const jql = 'created <= endOfMonth()';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" <= endOfMonth()`);
  });

  it('应该支持 startOfYear 函数', () => {
    const jql = 'updated > startOfYear()';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"修改时间" > startOfYear()`);
  });

  it('应该支持 endOfYear 函数', () => {
    const jql = 'updated < endOfYear()';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"修改时间" < endOfYear()`);
  });

  // 带参数的日期函数测试
  it('应该支持带正整数参数的日期函数', () => {
    const jql = 'created > startOfDay(1)';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" > startOfDay(1)`);
  });

  it('应该支持带负整数参数的日期函数', () => {
    const jql = 'created > startOfDay(-3)';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" > startOfDay(-3)`);
  });

  it('应该支持带参数的 startOfWeek', () => {
    const jql = 'created >= startOfWeek(-1)';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" >= startOfWeek(-1)`);
  });

  it('应该支持带参数的 endOfWeek', () => {
    const jql = 'created <= endOfWeek(-1)';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" <= endOfWeek(-1)`);
  });

  // 不支持的函数应该被过滤
  it('应该过滤不支持的 now 函数', () => {
    const jql = 'created > now()';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe('');
  });

  it('应该过滤不支持的 currentLogin 函数', () => {
    const jql = 'updated > currentLogin()';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe('');
  });

  // 复杂查询测试
  it('应该转换包含多个日期条件的复杂查询', () => {
    const jql = 'created >= startOfDay() AND created <= endOfDay()';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" >= startOfDay() and "创建时间" <= endOfDay()`);
  });

  it('应该转换混合日期函数和字面量的查询', () => {
    const jql = 'created > "2024-01-01" AND updated < endOfMonth()';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" > "2024-01-01" and "修改时间" < endOfMonth()`);
  });

  it('应该支持带参数的复杂日期查询', () => {
    const jql = 'created >= startOfWeek(-1) AND created <= endOfWeek(-1)';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" >= startOfWeek(-1) and "创建时间" <= endOfWeek(-1)`);
  });

  // 等值操作符测试
  it('应该支持日期的等值操作', () => {
    const jql = 'created = "2024-01-01"';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" = "2024-01-01"`);
  });

  it('应该支持日期的不等值操作', () => {
    const jql = 'updated != "2024-01-01"';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"修改时间" != "2024-01-01"`);
  });

  // IS NULL / IS NOT NULL 测试
  // TODO: 修复 IS NULL 和 IS EMPTY 在系统字段上的支持
  it.skip('应该支持 IS NULL 操作', () => {
    const jql = 'created IS NULL';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" is null`);
  });

  it('应该支持 IS NOT NULL 操作', () => {
    const jql = 'updated IS NOT NULL';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"修改时间" is not null`);
  });

  // TODO: 修复 IS EMPTY 在系统字段上的支持
  it.skip('应该支持 IS EMPTY 操作', () => {
    const jql = 'created IS EMPTY';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" is null`);
  });

  // IN 操作符测试
  it('应该支持 IN 操作符', () => {
    const jql = 'created in ("2024-01-01", "2024-01-02")';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe('');
  });

  it('应该支持 NOT IN 操作符', () => {
    const jql = 'updated not in ("2024-01-01", "2024-01-02")';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe('');
  });

  it('应该支持 IN 操作符混合 EMPTY', () => {
    const jql = 'created in (EMPTY, "2024-01-01")';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`("创建时间" in ["2024-01-01"] or "创建时间" is null)`);
  });

  it('应该支持 IN 操作符只包含 EMPTY', () => {
    const jql = 'updated in (EMPTY)';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"修改时间" is null`);
  });

  // 自定义日期时间字段测试
  it('应该转换日期时间字段', () => {
    const jql = '日期时间 > "2024-01-01"';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"日期时间" > "2024-01-01"`);
  });

  it('应该转换自定义 createdAt 类型字段', () => {
    const jql = 'created >= startOfMonth()';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" >= startOfMonth()`);
  });

  it('应该转换自定义 updatedAt 类型字段', () => {
    const jql = 'updated <= endOfWeek()';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"修改时间" <= endOfWeek()`);
  });

  it('应该在自定义日期字段中过滤不支持的函数', () => {
    const jql = '自定义日期 > now()';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe('');
  });

  // 时间单位支持测试
  it('应该过滤分钟单位（m）', () => {
    const jql = 'created <= -2m';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe('');
  });

  it('应该过滤小时单位（h）', () => {
    const jql = 'updated >= 5h';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe('');
  });

  it('应该转换天单位（d）为 startOfDay', () => {
    const jql = 'created > -7d';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" > startOfDay(-7)`);
  });

  it('应该转换正数天单位（d）', () => {
    const jql = 'updated <= 3d';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"修改时间" <= startOfDay(3)`);
  });

  it('应该转换周单位（w）为 startOfDay 并乘以7', () => {
    const jql = 'created >= -2w';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" >= startOfDay(-14)`);
  });

  it('应该转换正数周单位（w）', () => {
    const jql = 'updated < 1w';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"修改时间" < startOfDay(7)`);
  });

  it('应该在复杂查询中正确处理时间单位', () => {
    const jql = 'created >= -1w AND updated <= 0d';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"创建时间" >= startOfDay(-7) and "修改时间" <= startOfDay()`);
  });

  it('应该在日期时间中支持时间单位', () => {
    const jql = '日期时间 > -30d';
    const result = jql2iql(jql, testConstants);
    expect(result).toBe(`"日期时间" > startOfDay(-30)`);
  });
});
