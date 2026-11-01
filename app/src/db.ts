import Dexie, { type Table } from "dexie";
import type { ExerciseConfig, SetLog, UserProfile } from "@fitness/shared";

export interface ProfileRow extends UserProfile {
  id: 1;
  /** Workout days, 0 = Sunday ... 6 = Saturday (matches Date.getDay). */
  days: number[];
  dayNames: Record<number, string>;
  targetWeightKg: number;
}
export interface PlanRow {
  id?: number;
  day: number;
  order: number;
  exercise: ExerciseConfig;
}
export interface SettingRow { key: string; value: string }
export type SetRow = SetLog & { id?: number };

class AppDB extends Dexie {
  profile!: Table<ProfileRow, number>;
  plan!: Table<PlanRow, number>;
  sets!: Table<SetRow, number>;
  settings!: Table<SettingRow, string>;
  constructor() {
    super("fitness");
    this.version(1).stores({
      profile: "id",
      plan: "++id, day",
      sets: "++id, exerciseId, sessionId, loggedAt",
    });
    this.version(2).stores({
      profile: "id",
      plan: "++id, day",
      sets: "++id, exerciseId, sessionId, loggedAt",
      settings: "key",
    });
  }
}
export const db = new AppDB();
