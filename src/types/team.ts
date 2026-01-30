/**
 * Team types for native Claude Code Teams integration
 * Read-only types matching CC's JSON format for CLI display
 */

import { z } from 'zod';

// =============================================================================
// Team Member
// =============================================================================

export const TeamMemberStatusSchema = z.enum(['idle', 'working', 'completed', 'shutdown']);
export type TeamMemberStatus = z.infer<typeof TeamMemberStatusSchema>;

export interface TeamMember {
  /** Unique member identifier */
  id: string;

  /** Member name/role */
  name: string;

  /** Current status */
  status: TeamMemberStatus;

  /** Current task description (if working) */
  currentTask?: string;

  /** Number of tasks completed */
  tasksCompleted: number;

  /** When the member joined */
  joinedAt: Date;
}

export const TeamMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: TeamMemberStatusSchema,
  currentTask: z.string().optional(),
  tasksCompleted: z.number().int().min(0),
  joinedAt: z.coerce.date(),
});

// =============================================================================
// Team
// =============================================================================

export const TeamStatusSchema = z.enum(['active', 'completed', 'shutdown']);
export type TeamStatus = z.infer<typeof TeamStatusSchema>;

export interface Team {
  /** Unique team identifier */
  id: string;

  /** Team name */
  name: string;

  /** Current team status */
  status: TeamStatus;

  /** Leader member ID */
  leaderId: string;

  /** Team members */
  members: TeamMember[];

  /** When the team was created */
  createdAt: Date;

  /** When the team completed/shutdown */
  completedAt?: Date;
}

export const TeamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: TeamStatusSchema,
  leaderId: z.string().min(1),
  members: z.array(TeamMemberSchema),
  createdAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
});

// =============================================================================
// Team Task (from native CC task pool)
// =============================================================================

export const TeamTaskStatusSchema = z.enum(['pending', 'claimed', 'in_progress', 'completed', 'failed']);
export type TeamTaskStatus = z.infer<typeof TeamTaskStatusSchema>;

export interface TeamTask {
  /** Task identifier */
  id: string;

  /** Task description */
  description: string;

  /** Current status */
  status: TeamTaskStatus;

  /** Member ID that claimed this task */
  claimedBy?: string;

  /** When claimed */
  claimedAt?: Date;

  /** When completed */
  completedAt?: Date;
}

export const TeamTaskSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
  status: TeamTaskStatusSchema,
  claimedBy: z.string().optional(),
  claimedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});
