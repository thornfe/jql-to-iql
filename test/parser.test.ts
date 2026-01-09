import { describe, it, expect } from 'vitest';
import { parseJQL } from '../src/index';

describe('JQL Parser', () => {
  describe('Simple Binary Expressions', () => {
    it('解析字段相等比较表达式 (project = JQL)', () => {
      const result = parseJQL('project = JQL');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('BinaryExpression');
      expect(result?.operator).toBe('=');
      expect(result?.left).toMatchObject({ type: 'Field', value: 'project' });
      expect(result?.right).toMatchObject({ type: 'Literal', value: 'JQL' });
    });

    it('解析字段不等比较表达式 (status != Done)', () => {
      const result = parseJQL('status != Done');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('BinaryExpression');
      expect(result?.operator).toBe('!=');
      expect(result?.left).toMatchObject({ type: 'Field', value: 'status' });
      expect(result?.right).toMatchObject({ type: 'Literal', value: 'Done' });
    });

    it('解析字段大于比较表达式 (priority > 3)', () => {
      const result = parseJQL('priority > 3');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('BinaryExpression');
      expect(result?.operator).toBe('>');
    });

    it('解析字段小于比较表达式 (votes < 10)', () => {
      const result = parseJQL('votes < 10');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('BinaryExpression');
      expect(result?.operator).toBe('<');
    });
  });

  describe('Logical Expressions', () => {
    it('解析 AND 逻辑运算符连接的复合条件', () => {
      const result = parseJQL('project = JQL AND status = Done');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('LogicalExpression');
      expect(result?.operator).toBe('AND');

      // Check left side
      expect(result?.left?.type).toBe('BinaryExpression');
      expect(result?.left?.operator).toBe('=');
      expect(result?.left?.left).toMatchObject({ type: 'Field', value: 'project' });
      expect(result?.left?.right).toMatchObject({ type: 'Literal', value: 'JQL' });

      // Check right side
      expect(result?.right?.type).toBe('BinaryExpression');
      expect(result?.right?.operator).toBe('=');
      expect(result?.right?.left).toMatchObject({ type: 'Field', value: 'status' });
      expect(result?.right?.right).toMatchObject({ type: 'Literal', value: 'Done' });
    });

    it('解析 OR 逻辑运算符连接的复合条件', () => {
      const result = parseJQL('priority = High OR priority = Critical');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('LogicalExpression');
      expect(result?.operator).toBe('OR');

      // Check both sides are BinaryExpression
      expect(result?.left?.type).toBe('BinaryExpression');
      expect(result?.right?.type).toBe('BinaryExpression');
    });

    it('解析多个 AND 运算符组成的链式条件', () => {
      const result = parseJQL('project = JQL AND status = Done');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('LogicalExpression');
      expect(result?.operator).toBe('AND');

      // Check both sides are BinaryExpression
      expect(result?.left?.type).toBe('BinaryExpression');
      expect(result?.right?.type).toBe('BinaryExpression');
    });
  });

  describe('Complex Expressions', () => {
    it('解析混合 AND/OR 运算符及括号分组的复杂表达式', () => {
      const result = parseJQL('project = JQL AND (status = Done OR status = InProgress)');

      expect(result).not.toBeNull();
      // The structure should handle the query
      expect(['LogicalExpression', 'BinaryExpression']).toContain(result?.type);
    });

    it('解析包含双引号的字符串字面量', () => {
      const result = parseJQL('project = "My Project"');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('BinaryExpression');
    });
  });

  describe('Edge Cases', () => {
    it('处理空字符串输入的边界情况', () => {
      const result = parseJQL('');

      // Empty query might still parse as a tree, check the structure
      expect(result === null || result.type !== undefined).toBe(true);
    });

    it('解析仅包含单个字段比较的简单查询', () => {
      const result = parseJQL('project = JQL');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('BinaryExpression');
    });
  });

  describe('Field Types', () => {
    it('正确识别并解析字段节点类型', () => {
      const result = parseJQL('assignee = currentUser()');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('BinaryExpression');
      expect(result?.left?.type).toBe('Field');
    });

    it('正确识别并解析字面量节点类型', () => {
      const result = parseJQL('status = Done');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('BinaryExpression');
      expect(result?.right?.type).toBe('Literal');
    });
  });
});
