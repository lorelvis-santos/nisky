export type UserRole = "ADMIN" | "USER";

export interface User {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
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

export type TaskSource = "MANUAL" | "MOODLE" | "CANVAS";

export type IntegrationProvider = "MOODLE" | "CANVAS";

export interface Project {
  id: string;
  userId: string;
  name: string;
  color: string;
  isDefault: boolean;
  weeklyTargetMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  members?: ProjectMember[];
  _count?: { tasks: number };
}

export type ProjectRole = "OWNER" | "MEMBER";

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  user: { id: string; email: string; name: string | null; username: string | null; avatarUrl: string | null };
  role: ProjectRole;
  createdAt: string;
}

export interface ProjectInvitation {
  id: string;
  projectId: string;
  project: Project;
  invitedBy: { id: string; email: string; name: string | null; username: string | null };
  email: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
}

export interface TimeBlock {
  id: string;
  userId: string;
  projectId: string | null;
  name: string | null;
  daysOfWeek: number[];
  startMin: number;
  endMin: number;
  isActive: boolean;
  repeatEveryWeeks: number;
  repeatEndsAt: string | null;
  remindBeforeMin: number;
  lastRemindNotifiedAt: string | null;
  lastStartNotifiedAt: string | null;
  lastEndWarnNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimeBlockWithProject extends TimeBlock {
  project: Project | null;
}

export interface TimeBlockSettings {
  userId: string;
  dayStartMin: number;
  dayEndMin: number;
  updatedAt: string;
}

export type EventRecurrenceType = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  date: string;
  allDay: boolean;
  startMin: number | null;
  endMin: number | null;
  location: string | null;
  color: string | null;
  recurrenceType: EventRecurrenceType | null;
  recurrenceInterval: number;
  recurrenceDaysOfWeek: number[];
  recurrenceDayOfMonth: number | null;
  recurrenceEndsAt: string | null;
  remindBeforeMin: number;
  lastRemindNotifiedAt: string | null;
  lastStartNotifiedAt: string | null;
  lastEndWarnNotifiedAt: string | null;
  isException?: boolean;
  exceptionAction?: "skip" | "move";
  exceptions?: CalendarEventException[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventException {
  id: string;
  eventId: string;
  userId: string;
  date: string;
  action: "skip" | "move";
  startMin: number | null;
  endMin: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimeBlockException {
  id: string;
  blockId: string;
  userId: string;
  date: string;
  action: "skip" | "move";
  startMin: number | null;
  endMin: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  userId: string;
  morningDigest: boolean;
  taskDueReminders: boolean;
  integrationNews: boolean;
  integrationErrors: boolean;
  timeBlockReminders: boolean;
  updatedAt: string;
}

export interface IntegrationAccount {
  id: string;
  provider: IntegrationProvider;
  domain: string;
  username: string | null;
  service: string | null;
  enabled: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskRecurrenceType = "DAILY" | "WEEKLY" | "MONTHLY";

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  source: TaskSource;
  sourceRef: string | null;
  projectId: string | null;
  order: number;
  pomodoroEstimate: number;
  pomodoroCount: number;
  assigneeId: string | null;
  assignee?: { id: string; email: string; name: string | null; avatarUrl: string | null } | null;
  recurrenceType: TaskRecurrenceType | null;
  recurrenceInterval: number;
  recurrenceDaysOfWeek: number[];
  recurrenceDayOfMonth: number | null;
  recurrenceEndsAt: string | null;
  recurrenceParentId: string | null;
  subtaskCount?: number;
  completedSubtasks?: number;
  subtasks?: Subtask[];
  commentCount?: number;
  project?: { id: string; name: string; color: string } | null;
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
  daysOfWeek: number[];
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

export type ReminderRepeatType = "DAILY" | "WEEKLY" | "MONTHLY";

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  body: string | null;
  triggerAt: string;
  timezone: string;
  repeatType: ReminderRepeatType | null;
  repeatInterval: number;
  repeatDaysOfWeek: number[];
  repeatDayOfMonth: number | null;
  payload: { type?: string; taskId?: string; habitId?: string; timeBlockId?: string } | null;
  isActive: boolean;
  sentAt: string | null;
  resolvedAt: string | null;
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

export interface JournalEntry {
  id: string;
  title: string;
  classification: string | null;
  tags: string[];
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string | null;
  tags: string[];
  pinned: boolean;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  body: string;
  projectId: string | null;
  taskId: string | null;
  author: { id: string; email: string; name: string | null; avatarUrl: string | null };
  createdAt: string;
  updatedAt: string;
}

export interface FacetCount {
  name: string;
  count: number;
}

export interface KnowledgeFacets {
  categories: FacetCount[];
  tags: FacetCount[];
}

export type FeedbackCategory = "BUG" | "IDEA" | "IMPROVEMENT" | "OTHER";
export type FeedbackStatus = "NEW" | "REVIEWING" | "RESOLVED";

export interface Feedback {
  id: string;
  userId: string;
  category: FeedbackCategory;
  message: string;
  contactEmail: string | null;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackWithAuthor extends Feedback {
  user: { id: string; email: string; name: string | null };
}

export interface HomeWeeklyStats {
  totalWorkSec: number;
  completedWorkSessions: number;
  completedTasks: number;
  dueTasks: number;
  projectProgress?: Array<{
    id: string;
    name: string;
    color: string;
    targetMinutes: number;
    spentMinutes: number;
  }>;
  weekStart: string;
  weekEnd: string;
}

export interface HomeOverview {
  activeBlock: TimeBlockWithProject | null;
  activeEvent: CalendarEvent | null;
  blockTasks: Task[];
  urgentTasks: Task[];
  futureTasks: (Task & { project: Project | null })[];
  futureBlocks: (TimeBlockWithProject & { date?: string })[];
  nextBlock: TimeBlockWithProject | null;
  nextBlockStart: string | null;
  weekly: HomeWeeklyStats;
}

export interface HomeActivityPoint {
  date: string;
  tasks: number;
  habits: number;
  pomodoro: number;
}

export interface HabitMatrixEntry {
  habitId: string;
  date: string;
  completed: boolean;
}

export interface HabitsMatrix {
  habits: Habit[];
  entries: HabitMatrixEntry[];
}
