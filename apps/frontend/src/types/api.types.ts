export type ApiError = {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
};

export type ApiResponse<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: ApiError;
};
