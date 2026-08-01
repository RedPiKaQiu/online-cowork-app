export type ColumnId = "box" | "todo" | "done"

export type Member = {
  id: string
  name: string
  /** color used for the assignee color block */
  color: string
  fg: string
}

export type Task = {
  id: string
  title: string
  /** short description, shown as up to two lines under the title */
  description: string
  /** member id, only meaningful for todo / done items */
  assigneeId: string | null
}

export type BoardState = Record<ColumnId, Task[]>

export type Project = {
  id: string
  name: string
  board: BoardState
}

/** palette cycled through when creating new members */
export const MEMBER_COLORS: { color: string; fg: string }[] = [
  { color: "oklch(0.58 0.1 195)", fg: "oklch(0.99 0 0)" },
  { color: "oklch(0.6 0.12 250)", fg: "oklch(0.99 0 0)" },
  { color: "oklch(0.72 0.15 70)", fg: "oklch(0.24 0.02 250)" },
  { color: "oklch(0.62 0.16 15)", fg: "oklch(0.99 0 0)" },
  { color: "oklch(0.6 0.13 300)", fg: "oklch(0.99 0 0)" },
  { color: "oklch(0.62 0.14 150)", fg: "oklch(0.99 0 0)" },
  { color: "oklch(0.66 0.15 40)", fg: "oklch(0.24 0.02 250)" },
  { color: "oklch(0.55 0.12 330)", fg: "oklch(0.99 0 0)" },
]

export const INITIAL_MEMBERS: Member[] = [
  { id: "m1", name: "林晓", ...MEMBER_COLORS[0] },
  { id: "m2", name: "陈昊", ...MEMBER_COLORS[1] },
  { id: "m3", name: "王悦", ...MEMBER_COLORS[2] },
  { id: "m4", name: "赵磊", ...MEMBER_COLORS[3] },
  { id: "m5", name: "周宁", ...MEMBER_COLORS[4] },
]

let counter = 100
export function newId(prefix = "t") {
  counter += 1
  return `${prefix}${counter}`
}

export function getMember(members: Member[], id: string | null): Member | undefined {
  if (!id) return undefined
  return members.find((m) => m.id === id)
}

/** pick the least-used color from the palette for a new member */
export function nextMemberColor(members: Member[]) {
  const counts = MEMBER_COLORS.map(
    (c) => members.filter((m) => m.color === c.color).length,
  )
  let minIdx = 0
  for (let i = 1; i < counts.length; i++) {
    if (counts[i] < counts[minIdx]) minIdx = i
  }
  return MEMBER_COLORS[minIdx]
}

export const INITIAL_PROJECTS: Project[] = [
  {
    id: "p1",
    name: "官网改版 2.0",
    board: {
      box: [
        { id: "t1", title: "接入实时协作光标", description: "多人同时编辑时显示彼此的光标位置与选区，降低冲突。", assigneeId: null },
        { id: "t2", title: "支持 Markdown 导出", description: "允许将事项列表一键导出为 Markdown，方便同步到文档。", assigneeId: null },
        { id: "t3", title: "移动端离线缓存", description: "断网时可继续查看与编辑，联网后自动同步变更。", assigneeId: null },
        { id: "t4", title: "看板视图自定义列", description: "让用户按团队流程增删列，而不是固定三段式。", assigneeId: null },
      ],
      todo: [
        { id: "t5", title: "完成登录页面视觉走查", description: "核对间距、配色与暗色模式，输出走查问题清单。", assigneeId: "m1" },
        { id: "t6", title: "编写事项拖拽排序逻辑", description: "支持列内排序与跨列移动，处理边界插入位置。", assigneeId: "m2" },
        { id: "t7", title: "梳理成员权限模型", description: "定义所有者、编辑者、只读三种角色的能力边界。", assigneeId: "m3" },
        { id: "t8", title: "接口联调：任务分配", description: "对接后端分配接口，处理失败回滚与乐观更新。", assigneeId: null },
      ],
      done: [
        { id: "t9", title: "搭建项目基础框架", description: "初始化仓库、约定目录结构与代码规范。", assigneeId: "m1" },
        { id: "t10", title: "确定配色与设计规范", description: "沉淀设计 token 与组件样式，供全站复用。", assigneeId: "m3" },
      ],
    },
  },
  {
    id: "p2",
    name: "移动端 App",
    board: {
      box: [
        { id: "t11", title: "推送通知策略", description: "梳理需要推送的事件类型与免打扰时段设置。", assigneeId: null },
        { id: "t12", title: "手势返回优化", description: "统一各页面的边缘滑动返回体验。", assigneeId: null },
      ],
      todo: [
        { id: "t13", title: "搭建导航骨架", description: "实现底部标签与栈式导航的基础结构。", assigneeId: "m2" },
      ],
      done: [
        { id: "t14", title: "技术选型评审", description: "确定跨端框架与状态管理方案。", assigneeId: "m4" },
      ],
    },
  },
]
