import { describe, expect, it } from 'vitest';
import { jql2iql } from '../../src/index';
import { testConstants } from '../helpers';

describe('JQL 用户字段 membersOf 函数转换为 IQL', () => {
  it('应该将 assignee in membersOf("group") 转换为 IQL', () => {
    const result = jql2iql('assignee in membersOf("jira-administrators")', testConstants);
    expect(result).toBe(`"负责人" in [membersOf(jira-administrators)]`);
  });

  it('应该将 reporter in membersOf("group") 转换为 IQL', () => {
    const result = jql2iql('reporter in membersOf("developers")', testConstants);
    expect(result).toBe(`"报告人" in [membersOf(developers)]`);
  });

  it('应该将 creator in membersOf("group") 转换为 IQL', () => {
    const result = jql2iql('creator in membersOf("testers")', testConstants);
    expect(result).toBe(`"创建人" in [membersOf(testers)]`);
  });

  it('应该将自定义用户字段 in membersOf("group") 转换为 IQL', () => {
    const result = jql2iql('用户单选 in membersOf("admins")', testConstants);
    expect(result).toBe(`"用户单选" in [membersOf(admins)]`);
  });

  it('应该将 membersOf 与普通用户名混用转换为 IQL', () => {
    const result = jql2iql('assignee in (membersOf("jira-administrators"), user1)', testConstants);
    expect(result).toBe(`"负责人" in [membersOf(jira-administrators), "user1"]`);
  });

  it('应该将 membersOf 与 currentUser() 混用转换为 IQL', () => {
    const result = jql2iql('assignee in (currentUser(), membersOf("developers"))', testConstants);
    expect(result).toBe(`"负责人" in ["currentUser()", membersOf(developers)]`);
  });

  it('应该将 membersOf 与 EMPTY 混用转换为 IQL', () => {
    const result = jql2iql('assignee in (EMPTY, membersOf("developers"))', testConstants);
    expect(result).toBe(`("负责人" in [membersOf(developers)] or "负责人" is null)`);
  });

  it('应该将包含特殊字符的组名正确转换', () => {
    const result = jql2iql('assignee in membersOf("jira-users-group")', testConstants);
    expect(result).toBe(`"负责人" in [membersOf(jira-users-group)]`);
  });

  it('应该支持多个 membersOf 函数', () => {
    const result = jql2iql('assignee in (membersOf("developers"), membersOf("testers"))', testConstants);
    expect(result).toBe(`"负责人" in [membersOf(developers), membersOf(testers)]`);
  });

  it('应该支持 assignee = membersOf("group")', () => {
    const result = jql2iql('assignee = membersOf("administrators")', testConstants);
    expect(result).toBe(`"负责人" = membersOf(administrators)`);
  });

  it('应该支持 assignee != membersOf("group")', () => {
    const result = jql2iql('assignee != membersOf("administrators")', testConstants);
    expect(result).toBe(`"负责人" != membersOf(administrators)`);
  });

  it('应该将复杂的 membersOf 组合转换为 IQL', () => {
    const result = jql2iql(
      'assignee in (membersOf("jira-administrators"), "user1", currentUser(), EMPTY)',
      testConstants
    );
    expect(result).toBe(
      `("负责人" in [membersOf(jira-administrators), "user1", "currentUser()"] or "负责人" is null)`
    );
  });
});
