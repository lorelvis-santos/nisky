export type UserRole = "ADMIN" | "USER";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface Subtask {
  id: string;
  taskId: string;
  userId: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  order: number;
  pomodoroEstimate: number;
  pomodoroCount: number;
  subtaskCount?: number;
  completedSubtasks?: number;
  subtasks?: Subtask[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  itemCount: number;
  totalItems: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export type HabitFrequency = "DAILY" | "WEEKLY";

export interface Habit {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  frequency: HabitFrequency;
  targetDays: number;
  archived: boolean;
  todayCompleted: boolean;
  streak: number;
  createdAt: string;
  updatedAt: string;
}

export interface HabitEntry {
  id: string;
  habitId: string;
  userId: string;
  date: string;
  completed: boolean;
  createdAt: string;
}

export type QuickNoteStatus = "INBOX" | "ARCHIVED";

export interface QuickNote {
  id: string;
  userId: string;
  content: string;
  status: QuickNoteStatus;
  createdAt: string;
  updatedAt: string;
}

export type PomodoroPhase = "WORK" | "SHORT_BREAK" | "LONG_BREAK";
export type PomodoroSessionStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

export interface PomodoroSession {
  id: string;
  userId: string;
  taskId: string | null;
  phase: PomodoroPhase;
  status: PomodoroSessionStatus;
  plannedSec: number;
  actualSec: number | null;
  cycleIndex: number;
  startedAt: string;
  pausedAt: string | null;
  totalPausedSec: number;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  task?: { id: string; title: string } | null;
}

export interface PomodoroSettings {
  workSec: number;
  shortBreakSec: number;
  longBreakSec: number;
  cyclesPerLong: number;
  autoCycle: boolean;
  soundEnabled: boolean;
}

export interface PomodoroStats {
  totalSessions: number;
  completedSessions: number;
  completedWorkSessions: number;
  totalWorkSec: number;
  totalBreakSec: number;
  activeDays: number;
}
