
export type Grade = 0 | 1 | 2 | 3 | 4 | 5;

// Anki / SuperMemo-2 Algorithm
// https://docs.ankiweb.net/deck-options.html#easy-bonus
// https://super-memory.com/english/ol/sm2.htm

export interface SRSResult {
  interval: number; // Days until next review
  easeFactor: number; // Difficulty multiplier
  reviewCount: number; // Number of reviews
  nextReviewDate: number; // Timestamp (ms)
}

/**
 * Calculate next review schedule based on grade.
 * @param grade 0-5 (0=complete failure, 5=perfect)
 * @param currentInterval Current interval in days
 * @param currentEaseFactor Current ease factor (default 2.5)
 * @param currentReviewCount Current review count
 */
export function calculateSRS(
  grade: Grade,
  currentInterval: number = 0,
  currentEaseFactor: number = 2.5,
  currentReviewCount: number = 0
): SRSResult {
  let nextInterval: number;
  let nextEaseFactor: number;
  let nextReviewCount: number;

  if (grade >= 3) {
    if (currentReviewCount === 0) {
      nextInterval = 1;
    } else if (currentReviewCount === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(currentInterval * currentEaseFactor);
    }
    nextReviewCount = currentReviewCount + 1;
  } else {
    nextInterval = 1;
    nextReviewCount = 0; // Reset streak on failure
  }

  // Update Ease Factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  nextEaseFactor = currentEaseFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (nextEaseFactor < 1.3) nextEaseFactor = 1.3;

  // Calculate next date
  const now = new Date();
  const nextDate = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000);

  return {
    interval: nextInterval,
    easeFactor: parseFloat(nextEaseFactor.toFixed(2)),
    reviewCount: nextReviewCount,
    nextReviewDate: nextDate.getTime(),
  };
}

// Helper to calculate days between dates
export function daysBetween(date1: number, date2: number): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1 - date2) / oneDay));
}

// Helper to determine if review is due
export function isReviewDue(nextReviewDate: number): boolean {
  return Date.now() >= nextReviewDate;
}
