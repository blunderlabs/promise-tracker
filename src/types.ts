export type PromiseStatus = 'open' | 'done' | 'broken' | 'expired';

export interface TrackedPromise {
  id: string;
  what: string;
  who: string;
  dueDate: string;       // YYYY-MM-DD
  status: PromiseStatus;
  createdAt: string;      // ISO 8601
  completedAt?: string;   // ISO 8601
  notes?: string;
}

export interface PromiseStore {
  add(promise: TrackedPromise): Promise<void>;
  getById(id: string): Promise<TrackedPromise | null>;
  getAll(): Promise<TrackedPromise[]>;
  getByStatus(status: string): Promise<TrackedPromise[]>;
  getDueOn(date: string): Promise<TrackedPromise[]>;
  getOverdue(asOf: string): Promise<TrackedPromise[]>;
  update(id: string, fields: Partial<TrackedPromise>): Promise<void>;
  delete(id: string): Promise<void>;
}
