
import { calculateSRS, Grade } from './srs';

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`PASS: ${message}`);
}

function testSRS() {
    console.log('--- Testing SRS Logic ---');

    // Test 1: New item with Grade 5 (Easy)
    // Should be interval 1, EF > 2.5
    let result = calculateSRS(5, 0, 2.5, 0);
    assert(result.interval === 1, 'First review interval should be 1');
    assert(result.reviewCount === 1, 'First review count should result in 1');
    assert(result.easeFactor > 2.5, 'Easy (5) should increase EF');
    console.log('Test 1 Result:', result);

    // Test 2: Second review (Grade 4 - Good)
    // Should be interval 6
    result = calculateSRS(4, 1, result.easeFactor, 1);
    assert(result.interval === 6, 'Second review interval should be 6');
    assert(result.reviewCount === 2, 'Second review count should result in 2');
    console.log('Test 2 Result:', result);

    // Test 3: Third review (Grade 3 - Hard)
    // Should be interval 6 * EF
    const prevInterval = 6;
    const prevEF = result.easeFactor;
    result = calculateSRS(3, prevInterval, prevEF, 2);
    // Hard (3) decreases EF slightly
    assert(result.easeFactor < prevEF, 'Hard (3) should decrease EF');
    // Interval should be approx 6 * EF
    assert(result.interval === Math.round(prevInterval * prevEF), `Third interval should be round(6 * EF). Expected ${Math.round(prevInterval * prevEF)}, got ${result.interval}`);
    console.log('Test 3 Result:', result);

    // Test 4: Failure (Grade 1 - Again)
    // Should reset interval to 1
    result = calculateSRS(1, 15, 2.3, 3);
    assert(result.interval === 1, 'Failure should reset interval to 1');
    assert(result.reviewCount === 0, 'Failure should reset review count to 0');
    assert(result.easeFactor < 2.3, 'Failure should decrease EF');
    console.log('Test 4 Result:', result);

    console.log('--- All Tests Passed ---');
}

testSRS();
