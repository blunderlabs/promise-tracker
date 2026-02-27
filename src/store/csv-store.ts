import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import type { TrackedPromise, PromiseStore } from '../types.js';

const COLUMNS = ['id', 'what', 'who', 'dueDate', 'status', 'createdAt', 'completedAt', 'notes'] as const;

export class CsvPromiseStore implements PromiseStore {
  constructor(private filePath: string = 'data/promises.csv') {}

  private async ensureFile(): Promise<void> {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    if (!existsSync(this.filePath)) {
      await writeFile(this.filePath, stringify([], { header: true, columns: [...COLUMNS] }));
    }
  }

  private async readAll(): Promise<TrackedPromise[]> {
    await this.ensureFile();
    const content = await readFile(this.filePath, 'utf-8');
    if (content.trim() === '' || content.trim() === stringify([], { header: true, columns: [...COLUMNS] }).trim()) {
      // Only headers or empty
      const parsed = parse(content, { columns: true, skip_empty_lines: true }) as TrackedPromise[];
      return parsed;
    }
    return parse(content, { columns: true, skip_empty_lines: true }) as TrackedPromise[];
  }

  private async writeAll(promises: TrackedPromise[]): Promise<void> {
    await this.ensureFile();
    const csv = stringify(promises, { header: true, columns: [...COLUMNS] });
    await writeFile(this.filePath, csv);
  }

  async add(promise: TrackedPromise): Promise<void> {
    const all = await this.readAll();
    all.push(promise);
    await this.writeAll(all);
  }

  async getById(id: string): Promise<TrackedPromise | null> {
    const all = await this.readAll();
    return all.find(p => p.id === id) ?? null;
  }

  async getAll(): Promise<TrackedPromise[]> {
    return this.readAll();
  }

  async getByStatus(status: string): Promise<TrackedPromise[]> {
    const all = await this.readAll();
    return all.filter(p => p.status === status);
  }

  async getDueOn(date: string): Promise<TrackedPromise[]> {
    const all = await this.readAll();
    return all.filter(p => p.dueDate === date);
  }

  async getOverdue(asOf: string): Promise<TrackedPromise[]> {
    const all = await this.readAll();
    return all.filter(p => p.status === 'open' && p.dueDate && p.dueDate < asOf);
  }

  async update(id: string, fields: Partial<TrackedPromise>): Promise<void> {
    const all = await this.readAll();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) throw new Error(`Promise ${id} not found`);
    all[idx] = { ...all[idx], ...fields, id }; // prevent id override
    await this.writeAll(all);
  }

  async delete(id: string): Promise<void> {
    const all = await this.readAll();
    const filtered = all.filter(p => p.id !== id);
    if (filtered.length === all.length) throw new Error(`Promise ${id} not found`);
    await this.writeAll(filtered);
  }
}
