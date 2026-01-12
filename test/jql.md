project = BDR and issuetype in (Epic, Story) ORDER BY Rank ASC

project = SCRU AND assignee in (membersOf(jira-administrators), yep)


project = SCRU AND issuetype in (standardIssueTypes(), subTaskIssueTypes()) AND priority in (High, Medium) AND resolution in (Done, "Won't Do") AND labels in (tag1, tag2) AND Sprint = 1 AND 单选 in (选项1, 选项2) AND 数值 = "123456" AND 版本单选 in (EMPTY, unreleasedVersions(), releasedVersions(), "Version 2.0", "Version 3.0") AND 级联 in cascadeOption(10011, 10013) AND 项目单选 = SCRU AND created >= 2026-01-02 AND created <= 2026-01-09 AND resolved <= -24m AND assignee in (membersOf(jira-administrators), yep) AND 用户单选 in (EMPTY, meng, currentUser()) AND 用户多选 in (meng, wu, yep, currentUser()) AND text ~ "描述"

Sprint = 1
数值 = "123456"
resolved <= -24m
