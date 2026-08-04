import type { UserRole } from "./entities";

export interface UserAdmin {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminSettings {
  publicSignup: boolean;
}

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  q?: string;
  role?: UserRole;
  isActive?: boolean;
  sort?: "createdAt" | "email" | "name" | "role";
  order?: "asc" | "desc";
}

export interface CreateAdminUserPayload {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UpdateAdminUserPayload {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
}
