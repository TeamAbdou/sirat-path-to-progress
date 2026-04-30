/**
 * Streak stress tests for recomputeProgress.
 * Uses fake-indexeddb (loaded in setup) so Dexie works under jsdom.
 *
 * We freeze "today" via vi.useFakeTimers so the relative current-streak
 * logic (only valid if last clean day is today/yesterday) is deterministic.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/lib/localdb/db";
import { markDay, recomputeProgress, todayKey } from "@/lib/localdb/repository";

const CHALLENGE = "pornography";
const FIXED_NOW = new Date(2026, 3, 30, 12, 0, 0); // 2026-04-30 local

const dayBefore = (key: string, delta: number) => {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
  await db.dailyEntries.clear();
  await db.progress.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("recomputeProgress — streak math", () => {
  it("counts a simple 5-day clean streak ending today", async () => {
    const today = todayKey();
    for (let i = 4; i >= 0; i--) {
      await markDay(CHALLENGE, dayBefore(today, -i), "clean");
    }
    const p = await recomputeProgress(CHALLENGE);
    expect(p.daysClean).toBe(5);
    expect(p.currentStreak).toBe(5);
    expect(p.bestStreak).toBe(5);
  });

  it("breaks the current streak on a relapse and restarts cleanly", async () => {
    const today = todayKey();
    // -6..-4 clean, -3 relapse, -2..0 clean
    for (const off of [-6, -5, -4]) await markDay(CHALLENGE, dayBefore(today, off), "clean");
    await markDay(CHALLENGE, dayBefore(today, -3), "relapse");
    for (const off of [-2, -1, 0]) await markDay(CHALLENGE, dayBefore(today, off), "clean");

    const p = await recomputeProgress(CHALLENGE);
    expect(p.daysClean).toBe(6);
    expect(p.currentStreak).toBe(3);
    expect(p.bestStreak).toBe(3);
  });

  it("handles consecutive relapses without going negative", async () => {
    const today = todayKey();
    for (const off of [-4, -3, -2, -1, 0]) {
      await markDay(CHALLENGE, dayBefore(today, off), "relapse");
    }
    const p = await recomputeProgress(CHALLENGE);
    expect(p.daysClean).toBe(0);
    expect(p.currentStreak).toBe(0);
    expect(p.bestStreak).toBe(0);
  });

  it("invalidates current streak when last clean day is older than yesterday", async () => {
    const today = todayKey();
    // 3 clean days that ended 5 days ago
    for (const off of [-7, -6, -5]) await markDay(CHALLENGE, dayBefore(today, off), "clean");
    const p = await recomputeProgress(CHALLENGE);
    expect(p.daysClean).toBe(3);
    expect(p.bestStreak).toBe(3);
    expect(p.currentStreak).toBe(0); // stale tail
  });

  it("counts current streak when last clean day is yesterday (late check-in scenario)", async () => {
    const today = todayKey();
    for (const off of [-3, -2, -1]) await markDay(CHALLENGE, dayBefore(today, off), "clean");
    // No entry for today yet — yesterday's tail still counts
    const p = await recomputeProgress(CHALLENGE);
    expect(p.daysClean).toBe(3);
    expect(p.currentStreak).toBe(3);
    expect(p.bestStreak).toBe(3);
  });

  it("breaks current streak when a gap day exists between clean days", async () => {
    const today = todayKey();
    // -5,-4 clean, gap at -3, -2,-1,0 clean
    for (const off of [-5, -4]) await markDay(CHALLENGE, dayBefore(today, off), "clean");
    for (const off of [-2, -1, 0]) await markDay(CHALLENGE, dayBefore(today, off), "clean");
    const p = await recomputeProgress(CHALLENGE);
    expect(p.daysClean).toBe(5);
    expect(p.currentStreak).toBe(3); // tail only
    expect(p.bestStreak).toBe(3);
  });

  it("preserves bestStreak across later relapse", async () => {
    const today = todayKey();
    // long run -10..-4 (7 clean), then relapse -3, then -2..0 (3 clean)
    for (let off = -10; off <= -4; off++) await markDay(CHALLENGE, dayBefore(today, off), "clean");
    await markDay(CHALLENGE, dayBefore(today, -3), "relapse");
    for (const off of [-2, -1, 0]) await markDay(CHALLENGE, dayBefore(today, off), "clean");

    const p = await recomputeProgress(CHALLENGE);
    expect(p.daysClean).toBe(10);
    expect(p.bestStreak).toBe(7);
    expect(p.currentStreak).toBe(3);
  });

  it("late check-in: marking yesterday after marking today does not double-count", async () => {
    const today = todayKey();
    await markDay(CHALLENGE, today, "clean");
    await markDay(CHALLENGE, dayBefore(today, -1), "clean");
    const p = await recomputeProgress(CHALLENGE);
    expect(p.daysClean).toBe(2);
    expect(p.currentStreak).toBe(2);
    expect(p.bestStreak).toBe(2);
  });

  it("overwriting a relapse with clean (composite PK) recomputes correctly", async () => {
    const today = todayKey();
    await markDay(CHALLENGE, dayBefore(today, -1), "relapse");
    await markDay(CHALLENGE, today, "clean");
    let p = await recomputeProgress(CHALLENGE);
    expect(p.currentStreak).toBe(1);

    // User corrects yesterday → clean
    await markDay(CHALLENGE, dayBefore(today, -1), "clean");
    p = await recomputeProgress(CHALLENGE);
    expect(p.daysClean).toBe(2);
    expect(p.currentStreak).toBe(2);
    expect(p.bestStreak).toBe(2);
  });
});
