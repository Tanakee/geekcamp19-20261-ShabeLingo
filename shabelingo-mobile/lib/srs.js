"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSRS = calculateSRS;
exports.daysBetween = daysBetween;
exports.isReviewDue = isReviewDue;
/**
 * Calculate next review schedule based on grade.
 * @param grade 0-5 (0=complete failure, 5=perfect)
 * @param currentInterval Current interval in days
 * @param currentEaseFactor Current ease factor (default 2.5)
 * @param currentReviewCount Current review count
 */
function calculateSRS(grade, currentInterval = 0, currentEaseFactor = 2.5, currentReviewCount = 0) {
    let nextInterval;
    let nextEaseFactor;
    let nextReviewCount;
    if (grade >= 3) {
        if (currentReviewCount === 0) {
            nextInterval = 1;
        }
        else if (currentReviewCount === 1) {
            nextInterval = 6;
        }
        else {
            nextInterval = Math.round(currentInterval * currentEaseFactor);
        }
        nextReviewCount = currentReviewCount + 1;
    }
    else {
        nextInterval = 1;
        nextReviewCount = 0; // Reset streak on failure
    }
    // Update Ease Factor
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    nextEaseFactor = currentEaseFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (nextEaseFactor < 1.3)
        nextEaseFactor = 1.3;
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
function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1 - date2) / oneDay));
}
// Helper to determine if review is due
function isReviewDue(nextReviewDate) {
    return Date.now() >= nextReviewDate;
}
