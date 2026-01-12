import { describe, expect, it } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

/**
 * 通用枚举字段测试函数
 * @param fieldName 字段名
 * @param testCases 测试用例数组，每个用例包含 label 和 value
 */
function testEnumField(
  fieldName: string,
  testCases: Array<{ label: string; value: string }>
) {
  describe(`JQL ${fieldName} 字段转换为 IQL`, () => {
    const [case1, case2, case3] = testCases;

    it(`应该将 ${fieldName} = ${case1.label} 转换为字段的单值查询`, () => {
      const result = jql2iql(`${fieldName} = ${case1.label}`, testConstants);
      expect(result).toBe(`"${fieldName}" = "${case1.value}"`);
    });

    it(`应该将 ${fieldName} in (${case1.label}, ${case2.label}) 转换为字段的多值查询`, () => {
      const result = jql2iql(`${fieldName} in (${case1.label}, ${case2.label})`, testConstants);
      expect(result).toBe(`"${fieldName}" in ["${case1.value}", "${case2.value}"]`);
    });

    it(`应该将 ${fieldName} != ${case1.label} 转换为字段的不等查询`, () => {
      const result = jql2iql(`${fieldName} != ${case1.label}`, testConstants);
      expect(result).toBe(`"${fieldName}" != "${case1.value}"`);
    });

    if (case3) {
      it(`应该将 ${fieldName} in (${case1.label}, ${case2.label}, ${case3.label}) 转换为字段的多值查询`, () => {
        const result = jql2iql(`${fieldName} in (${case1.label}, ${case2.label}, ${case3.label})`, testConstants);
        expect(result).toBe(`"${fieldName}" in ["${case1.value}", "${case2.value}", "${case3.value}"]`);
      });
    }

    it(`应该将 ${fieldName} not in (${case1.label}, ${case2.label}) 转换为字段的排除查询`, () => {
      const result = jql2iql(`${fieldName} not in (${case1.label}, ${case2.label})`, testConstants);
      expect(result).toBe(`"${fieldName}" not in ["${case1.value}", "${case2.value}"]`);
    });
  });
}

// Dropdown 字段测试
testEnumField('下拉单选', [
  { label: '下拉单选1', value: '10015' },
  { label: '下拉单选2', value: '10016' },
]);

// Radio 字段测试
testEnumField('单选', [
  { label: '选项1', value: '10003' },
  { label: '选项2', value: '10004' },
]);

// Checkbox 字段测试
testEnumField('复选', [
  { label: '复选1', value: '10005' },
  { label: '复选2', value: '10006' },
  { label: '复选3', value: '10007' },
]);
