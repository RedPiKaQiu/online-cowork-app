## MODIFIED Requirements

### Requirement: 任务快照保持看板顺序
系统 SHALL 将任务按 `box`、`todo`、`done` 三个状态分组。`box` 与 `todo` 组 MUST 按持久化位置升序返回；`done` 组 MUST 按完成时间降序返回，完成时间相同的事项再按稳定的持久化位置升序返回。

#### Scenario: 读取已排序任务
- **WHEN** 项目中同一状态有多个任务
- **THEN** `box` 与 `todo` 状态任务按列内位置从小到大排列，`done` 状态任务按完成时间从新到旧排列

#### Scenario: 同时完成的事项
- **WHEN** 多个已完成事项具有相同完成时间
- **THEN** 快照以其持久化位置升序提供稳定顺序
