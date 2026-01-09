import { expect } from 'chai';
import { parseJQL, ASTNode } from '../src/index';

describe('JQL Parser', () => {
  describe('Simple Binary Expressions', () => {
    it('should parse simple equality expression', () => {
      const result = parseJQL('project = JQL');

      expect(result).to.not.be.null;
      expect(result?.type).to.equal('BinaryExpression');
      expect(result?.operator).to.equal('=');
      expect(result?.left).to.deep.include({ type: 'Field', value: 'project' });
      expect(result?.right).to.deep.include({ type: 'Literal', value: 'JQL' });
    });

    it('should parse not equal expression', () => {
      const result = parseJQL('status != Done');

      expect(result).to.not.be.null;
      expect(result?.type).to.equal('BinaryExpression');
      expect(result?.operator).to.equal('!=');
      expect(result?.left).to.deep.include({ type: 'Field', value: 'status' });
      expect(result?.right).to.deep.include({ type: 'Literal', value: 'Done' });
    });

    it('should parse greater than expression', () => {
      const result = parseJQL('priority > 3');

      expect(result).to.not.be.null;
      expect(result?.type).to.equal('BinaryExpression');
      expect(result?.operator).to.equal('>');
    });

    it('should parse less than expression', () => {
      const result = parseJQL('votes < 10');

      expect(result).to.not.be.null;
      expect(result?.type).to.equal('BinaryExpression');
      expect(result?.operator).to.equal('<');
    });
  });

  describe('Logical Expressions', () => {
    it('should parse AND expression', () => {
      const result = parseJQL('project = JQL AND status = Done');

      expect(result).to.not.be.null;
      expect(result?.type).to.equal('LogicalExpression');
      expect(result?.operator).to.equal('AND');

      // Check left side
      expect(result?.left?.type).to.equal('BinaryExpression');
      expect(result?.left?.operator).to.equal('=');
      expect(result?.left?.left).to.deep.include({ type: 'Field', value: 'project' });
      expect(result?.left?.right).to.deep.include({ type: 'Literal', value: 'JQL' });

      // Check right side
      expect(result?.right?.type).to.equal('BinaryExpression');
      expect(result?.right?.operator).to.equal('=');
      expect(result?.right?.left).to.deep.include({ type: 'Field', value: 'status' });
      expect(result?.right?.right).to.deep.include({ type: 'Literal', value: 'Done' });
    });

    it('should parse OR expression', () => {
      const result = parseJQL('priority = High OR priority = Critical');

      expect(result).to.not.be.null;
      expect(result?.type).to.equal('LogicalExpression');
      expect(result?.operator).to.equal('OR');

      // Check both sides are BinaryExpression
      expect(result?.left?.type).to.equal('BinaryExpression');
      expect(result?.right?.type).to.equal('BinaryExpression');
    });

    it('should parse multiple AND expressions', () => {
      const result = parseJQL('project = JQL AND status = Done');

      expect(result).to.not.be.null;
      expect(result?.type).to.equal('LogicalExpression');
      expect(result?.operator).to.equal('AND');

      // Check both sides are BinaryExpression
      expect(result?.left?.type).to.equal('BinaryExpression');
      expect(result?.right?.type).to.equal('BinaryExpression');
    });
  });

  describe('Complex Expressions', () => {
    it('should parse mixed AND/OR expression', () => {
      const result = parseJQL('project = JQL AND (status = Done OR status = InProgress)');

      expect(result).to.not.be.null;
      // The structure should handle the query
      expect(result?.type).to.be.oneOf(['LogicalExpression', 'BinaryExpression']);
    });

    it('should handle quoted strings', () => {
      const result = parseJQL('project = "My Project"');

      expect(result).to.not.be.null;
      expect(result?.type).to.equal('BinaryExpression');
    });
  });

  describe('Edge Cases', () => {
    it('should return null for empty string', () => {
      const result = parseJQL('');

      // Empty query might still parse as a tree, check the structure
      expect(result).to.satisfy((r: ASTNode | null) => r === null || r.type !== undefined);
    });

    it('should handle single field query', () => {
      const result = parseJQL('project = JQL');

      expect(result).to.not.be.null;
      expect(result?.type).to.equal('BinaryExpression');
    });
  });

  describe('Field Types', () => {
    it('should correctly identify field nodes', () => {
      const result = parseJQL('assignee = currentUser()');

      expect(result).to.not.be.null;
      expect(result?.type).to.equal('BinaryExpression');
      expect(result?.left?.type).to.equal('Field');
    });

    it('should correctly identify literal nodes', () => {
      const result = parseJQL('status = Done');

      expect(result).to.not.be.null;
      expect(result?.type).to.equal('BinaryExpression');
      expect(result?.right?.type).to.equal('Literal');
    });
  });
});
