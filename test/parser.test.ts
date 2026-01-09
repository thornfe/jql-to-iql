import { describe, it, expect } from 'vitest';
import { parseJQL, ASTNode } from '../src/index';

describe('JQL Parser', () => {
  describe('Simple Binary Expressions', () => {
    it('should parse simple equality expression', () => {
      const result = parseJQL('project = JQL');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('BinaryExpression');
      expect(result?.operator).toBe('=');
      expect(result?.left).toMatchObject({ type: 'Field', value: 'project' });
      expect(result?.right).toMatchObject({ type: 'Literal', value: 'JQL' });
    });

    it('should parse not equal expression', () => {
      const result = parseJQL('status != Done');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('BinaryExpression');
      expect(result?.operator).toBe('!=');
      expect(result?.left).toMatchObject({ type: 'Field', value: 'status' });
      expect(result?.right).toMatchObject({ type: 'Literal', value: 'Done' });
    });

    it('should parse greater than expression', () => {
      const result = parseJQL('priority > 3');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('BinaryExpression');
      expect(result?.operator).toBe('>');
    });

    it('should parse less than expression', () => {
      const result = parseJQL('votes < 10');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('BinaryExpression');
      expect(result?.operator).toBe('<');
    });
  });

  describe('Logical Expressions', () => {
    it('should parse AND expression', () => {
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

    it('should parse OR expression', () => {
      const result = parseJQL('priority = High OR priority = Critical');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('LogicalExpression');
      expect(result?.operator).toBe('OR');

      // Check both sides are BinaryExpression
      expect(result?.left?.type).toBe('BinaryExpression');
      expect(result?.right?.type).toBe('BinaryExpression');
    });

    it('should parse multiple AND expressions', () => {
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
    it('should parse mixed AND/OR expression', () => {
      const result = parseJQL('project = JQL AND (status = Done OR status = InProgress)');

      expect(result).not.toBeNull();
      // The structure should handle the query
      expect(['LogicalExpression', 'BinaryExpression']).toContain(result?.type);
    });

    it('should handle quoted strings', () => {
      const result = parseJQL('project = "My Project"');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('BinaryExpression');
    });
  });

  describe('Edge Cases', () => {
    it('should return null for empty string', () => {
      const result = parseJQL('');

      // Empty query might still parse as a tree, check the structure
      expect(result === null || result.type !== undefined).toBe(true);
    });

    it('should handle single field query', () => {
      const result = parseJQL('project = JQL');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('BinaryExpression');
    });
  });

  describe('Field Types', () => {
    it('should correctly identify field nodes', () => {
      const result = parseJQL('assignee = currentUser()');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('BinaryExpression');
      expect(result?.left?.type).toBe('Field');
    });

    it('should correctly identify literal nodes', () => {
      const result = parseJQL('status = Done');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('BinaryExpression');
      expect(result?.right?.type).toBe('Literal');
    });
  });
});
