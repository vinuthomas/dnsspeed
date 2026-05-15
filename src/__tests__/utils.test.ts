import { calculateMedian, calculateFailureRate } from '../renderer/utils';

describe('utils', () => {
  describe('calculateMedian', () => {
    it('returns -1 for empty array', () => {
      expect(calculateMedian([])).toBe(-1);
    });

    it('returns -1 for array of only -1s', () => {
      expect(calculateMedian([-1, -1, -1])).toBe(-1);
    });

    it('calculates median for odd number of elements', () => {
      expect(calculateMedian([10, 20, 30])).toBe(20);
      expect(calculateMedian([30, 10, 20])).toBe(20);
    });

    it('calculates median for even number of elements', () => {
      expect(calculateMedian([10, 20, 30, 40])).toBe(25);
      expect(calculateMedian([40, 10, 30, 20])).toBe(25);
    });

    it('ignores -1 values when calculating median', () => {
      expect(calculateMedian([10, -1, 20, 30])).toBe(20);
    });
  });

  describe('calculateFailureRate', () => {
    it('returns 0 for empty array', () => {
      expect(calculateFailureRate([])).toBe(0);
    });

    it('returns 0 when there are no failures', () => {
      expect(calculateFailureRate([10, 20, 30])).toBe(0);
    });

    it('returns 100 when all are failures', () => {
      expect(calculateFailureRate([-1, -1, -1])).toBe(100);
    });

    it('calculates correct percentage', () => {
      expect(calculateFailureRate([-1, 10, 20, 30])).toBe(25);
      expect(calculateFailureRate([-1, -1, 10, 20])).toBe(50);
      expect(calculateFailureRate([-1, -1, -1, 10])).toBe(75);
    });
  });
});
