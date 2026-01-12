import { describe, expect, it } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL component 字段转换为 IQL', () => {
  it('应该将 component = "模块1" 转换为 IQL 并映射 ID', () => {
    const result = jql2iql('component = "模块1"', testConstants);
    expect(result).toBe(`"所属模块" = "10000"`);
  });

  it('应该将 component in ("模块1", "模块2") 转换为 IQL', () => {
    const result = jql2iql('component in ("模块1", "模块2")', testConstants);
    expect(result).toBe(`"所属模块" in ["10000", "10001"]`);
  });

  it('应该将 component in (EMPTY, 模块1) 转换为 IQL', () => {
    const result = jql2iql('component in (EMPTY, 模块1)', testConstants);
    expect(result).toBe(`("所属模块" in ["10000"] or "所属模块" is NULL)`);
  });

  it('应该将未映射的 component 值原样输出', () => {
    const result = jql2iql('component = 未知模块', testConstants);
    expect(result).toBe(`"所属模块" = "未知模块"`);
  });

  it('应该将混合映射和未映射的值正确转换', () => {
    const result = jql2iql('component in (模块1, 未知模块)', testConstants);
    expect(result).toBe(`"所属模块" in ["10000", "未知模块"]`);
  });
});
