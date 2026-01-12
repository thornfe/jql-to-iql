import { describe, it } from 'vitest';
import { parseJQL } from '../../src/index';
import { expectBinaryExpression, field, literal } from '../helpers';

describe('Text/LongText/Name AST', () => {
  it('解析 text 字段的模糊匹配表达式', () => {
    const result = parseJQL('text ~ "111"');

    expectBinaryExpression({
      node: result,
      operator: '~',
      left: field('text'),
      right: literal('"111"')
    });
  });

  it('解析文本单行字段的模糊匹配表达式', () => {
    const result = parseJQL('文本单行 ~ " 111"');

    expectBinaryExpression({
      node: result,
      operator: '~',
      left: field('文本单行'),
      right: literal('" 111"')
    });
  });

  it('解析 text 字段的等于表达式', () => {
    const result = parseJQL('text = "标题内容"');

    expectBinaryExpression({
      node: result,
      operator: '=',
      left: field('text'),
      right: literal('"标题内容"')
    });
  });

  it('解析文本多行字段的模糊匹配表达式', () => {
    const result = parseJQL('文本多行 ~ "描述"');

    expectBinaryExpression({
      node: result,
      operator: '~',
      left: field('文本多行'),
      right: literal('"描述"')
    });
  });

  it('解析不带引号的文本值', () => {
    const result = parseJQL('text ~ test');

    expectBinaryExpression({
      node: result,
      operator: '~',
      left: field('text'),
      right: literal('test')
    });
  });

  it('解析 key 字段的等于表达式', () => {
    const result = parseJQL('key = "PROJ-123"');

    expectBinaryExpression({
      node: result,
      operator: '=',
      left: field('key'),
      right: literal('"PROJ-123"')
    });
  });

  it('解析 key 字段的模糊匹配表达式', () => {
    const result = parseJQL('key ~ "PROJ"');

    expectBinaryExpression({
      node: result,
      operator: '~',
      left: field('key'),
      right: literal('"PROJ"')
    });
  });
});
