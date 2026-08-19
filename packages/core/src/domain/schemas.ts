import { z } from 'zod';
import { ASSIGNEE_KINDS, COMMENT_AUTHORS, PRIORITIES, TASK_TYPES } from './types.js';

export const StateMachineSchema = z.object({
  states: z.array(z.string().min(1)).min(1),
  transitions: z.record(z.string(), z.array(z.string())),
  humanGates: z.array(z.string()).default([]),
  initial: z.string().min(1),
  terminal: z.array(z.string()).default([]),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  key: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[A-Za-z][A-Za-z0-9]*$/, 'key must be alphanumeric, starting with a letter')
    .optional(),
  repo: z.string().nullish(),
  defaultBranch: z.string().nullish(),
  stateMachine: StateMachineSchema.nullish(),
});
export type CreateProjectInput = z.input<typeof CreateProjectSchema>;

export const CreateTaskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  details: z.string().default(''),
  repo: z.string().nullish(),
  branch: z.string().nullish(),
  priority: z.enum(PRIORITIES).default('medium'),
  type: z.enum(TASK_TYPES).default('feature'),
  agentId: z.string().nullish(),
  modelId: z.string().nullish(),
  assignee: z.enum(ASSIGNEE_KINDS).default('agent'),
});
export type CreateTaskInput = z.input<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z
  .object({
    title: z.string().min(1),
    details: z.string(),
    repo: z.string().nullable(),
    branch: z.string().nullable(),
    priority: z.enum(PRIORITIES),
    type: z.enum(TASK_TYPES),
    agentId: z.string().nullable(),
    modelId: z.string().nullable(),
    assignee: z.enum(ASSIGNEE_KINDS),
  })
  .partial();
export type UpdateTaskInput = z.input<typeof UpdateTaskSchema>;

export const TransitionSchema = z.object({
  to: z.string().min(1),
  comment: z.string().min(1, 'a comment is required for every transition'),
  actor: z.enum(COMMENT_AUTHORS).default('agent'),
});
export type TransitionInput = z.input<typeof TransitionSchema>;

export const AddCommentSchema = z.object({
  body: z.string().min(1),
  author: z.enum(COMMENT_AUTHORS).default('human'),
});
export type AddCommentInput = z.input<typeof AddCommentSchema>;

export const TaskFilterSchema = z
  .object({
    projectId: z.string(),
    status: z.string(),
    priority: z.enum(PRIORITIES),
    type: z.enum(TASK_TYPES),
    agentId: z.string(),
    search: z.string(),
  })
  .partial();
export type TaskFilter = z.infer<typeof TaskFilterSchema>;
