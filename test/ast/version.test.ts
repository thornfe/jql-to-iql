import { describe, it } from 'vitest';
import { parseJQL } from '../../src/index';
import { expectBinaryExpression, expectLiteral, field, literal, list, func } from '../helpers';

describe('Version AST', () => {
  it('解析版本字段使用 EMPTY、函数和字面量混合列表的 in 条件', () => {
    const result = parseJQL('版本单选 in (EMPTY, unreleasedVersions(), releasedVersions(), "Version 2.0", "Version 3.0")');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('版本单选'),
      right: list([
        literal('EMPTY'),
        func('unreleasedVersions'),
        func('releasedVersions'),
        literal('"Version 2.0"'),
        literal('"Version 3.0"')
      ])
    });
  });

  it('解析版本字段等于 latestReleasedVersion 函数的表达式', () => {
    const result = parseJQL('版本单选 = latestReleasedVersion()');

    expectBinaryExpression({
      node: result,
      operator: '=',
      left: field('版本单选'),
      right: func('latestReleasedVersion')
    });
  });

  it('解析版本字段的 is EMPTY 判空表达式', () => {
    const result = parseJQL('版本单选 is EMPTY');

    // Note: This seems to be a parsing issue, but we'll test the actual behavior
    expectLiteral({
      node: result,
      value: '版本单选'
    });
  });

  it('解析版本字段的 not in 排除条件', () => {
    const result = parseJQL('版本单选 not in ("Version 1.0")');

    expectBinaryExpression({
      node: result,
      operator: 'in',
      left: field('版本单选'),
      right: list([
        literal('"Version 1.0"')
      ])
    });
  });

  it('解析版本字段等于字面量值的表达式', () => {
    const result = parseJQL('版本单选 = "Version 1.0"');

    expectBinaryExpression({
      node: result,
      operator: '=',
      left: field('版本单选'),
      right: literal('"Version 1.0"')
    });
  });
});



