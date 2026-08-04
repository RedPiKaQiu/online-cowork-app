import { sql } from "drizzle-orm"
import {
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

export const taskStatus = pgEnum("task_status", ["box", "todo", "done"])

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
const updatedAt = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description").notNull().default(""),
    accessTokenHash: varchar("access_token_hash", { length: 64 }).notNull(),
    version: integer("version").notNull().default(1),
    createdAt,
    updatedAt,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("projects_access_token_hash_key").on(table.accessTokenHash),
    index("projects_active_idx").on(table.deletedAt).where(sql`${table.deletedAt} is null`),
    unique("projects_id_key").on(table.id),
  ],
)

export const members = pgTable(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    color: varchar("color", { length: 32 }).notNull(),
    fg: varchar("fg", { length: 32 }).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    foreignKey({
      name: "members_project_id_projects_id_fk",
      columns: [table.projectId],
      foreignColumns: [projects.id],
    }).onDelete("restrict"),
    index("members_project_id_idx").on(table.projectId),
    unique("members_id_project_id_key").on(table.id, table.projectId),
  ],
)

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    status: taskStatus("status").notNull(),
    position: integer("position").notNull(),
    assigneeId: uuid("assignee_id"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt,
    updatedAt,
  },
  (table) => [
    foreignKey({
      name: "tasks_project_id_projects_id_fk",
      columns: [table.projectId],
      foreignColumns: [projects.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "tasks_assignee_id_project_id_members_id_project_id_fk",
      columns: [table.assigneeId, table.projectId],
      foreignColumns: [members.id, members.projectId],
    }).onDelete("restrict"),
    index("tasks_project_status_position_idx").on(table.projectId, table.status, table.position),
    index("tasks_project_status_completed_at_position_idx").on(table.projectId, table.status, table.completedAt, table.position),
  ],
)

export type TaskStatus = (typeof taskStatus.enumValues)[number]
export type Project = typeof projects.$inferSelect
export type Member = typeof members.$inferSelect
export type Task = typeof tasks.$inferSelect
