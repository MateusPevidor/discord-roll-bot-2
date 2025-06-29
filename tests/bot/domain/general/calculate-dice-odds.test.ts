import { calculateDiceOdds } from '../../../../src/bot/domain/general/calculate-dice-odds';

describe('calculateDiceOdds', () => {
  describe('Basic functionality', () => {
    it('should calculate odds for a single hit on a 6-sided die', () => {
      const result = calculateDiceOdds(6, 1);
      expect(result).toBe('16.6666666667');
    });

    it('should calculate odds for a single hit on a 20-sided die', () => {
      const result = calculateDiceOdds(20, 1);
      expect(result).toBe('5.0000000000');
    });

    it('should calculate odds for multiple hits on the same die', () => {
      const result = calculateDiceOdds(6, 2);
      expect(result).toBe('2.7777777778');
    });

    it('should calculate odds for three hits on a 6-sided die', () => {
      const result = calculateDiceOdds(6, 3);
      expect(result).toBe('0.4629629630');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero hits (should return 100%)', () => {
      const result = calculateDiceOdds(6, 0);
      expect(result).toBe('100.0000000000');
    });

    it('should handle a 2-sided die (coin flip)', () => {
      const result = calculateDiceOdds(2, 1);
      expect(result).toBe('50.0000000000');
    });

    it('should handle very large dice faces', () => {
      const result = calculateDiceOdds(100, 1);
      expect(result).toBe('1.0000000000');
    });

    it('should handle multiple hits on a 2-sided die', () => {
      const result = calculateDiceOdds(2, 3);
      expect(result).toBe('12.5000000000');
    });
  });

  describe('High precision calculations', () => {
    it('should maintain precision for many hits', () => {
      const result = calculateDiceOdds(6, 10);
      // 1/6^10 * 100 = approximately 0.0000016538
      expect(result).toBe('0.0000016538');
    });

    it('should handle very small probabilities', () => {
      const result = calculateDiceOdds(20, 5);
      // 1/20^5 * 100 = 1/3200000 * 100 = 0.00003125
      expect(result).toBe('0.0000312500');
    });
  });

  describe('Mathematical accuracy', () => {
    it('should calculate 1/6 correctly (standard die)', () => {
      const result = calculateDiceOdds(6, 1);
      const expected = (1 / 6) * 100;
      expect(parseFloat(result)).toBeCloseTo(expected, 10);
    });

    it('should calculate 1/36 correctly (two dice)', () => {
      const result = calculateDiceOdds(6, 2);
      const expected = (1 / 36) * 100;
      expect(parseFloat(result)).toBeCloseTo(expected, 10);
    });

    it('should calculate 1/216 correctly (three dice)', () => {
      const result = calculateDiceOdds(6, 3);
      const expected = (1 / 216) * 100;
      expect(parseFloat(result)).toBeCloseTo(expected, 10);
    });
  });

  describe('Return value format', () => {
    it('should return a string', () => {
      const result = calculateDiceOdds(6, 1);
      expect(typeof result).toBe('string');
    });

    it('should return a number with exactly 10 decimal places', () => {
      const result = calculateDiceOdds(6, 1);
      const decimalPlaces = result.split('.')[1]?.length || 0;
      expect(decimalPlaces).toBe(10);
    });

    it('should not return scientific notation for small numbers', () => {
      const result = calculateDiceOdds(20, 10);
      expect(result).not.toMatch(/[eE]/);
    });
  });

  describe('Various dice types', () => {
    it('should work with d4 (4-sided die)', () => {
      const result = calculateDiceOdds(4, 1);
      expect(result).toBe('25.0000000000');
    });

    it('should work with d8 (8-sided die)', () => {
      const result = calculateDiceOdds(8, 1);
      expect(result).toBe('12.5000000000');
    });

    it('should work with d10 (10-sided die)', () => {
      const result = calculateDiceOdds(10, 1);
      expect(result).toBe('10.0000000000');
    });

    it('should work with d12 (12-sided die)', () => {
      const result = calculateDiceOdds(12, 1);
      expect(result).toBe('8.3333333333');
    });

    it('should work with d100 (percentile die)', () => {
      const result = calculateDiceOdds(100, 1);
      expect(result).toBe('1.0000000000');
    });
  });

  describe('Consistency checks', () => {
    it('should produce consistent results when called multiple times', () => {
      const result1 = calculateDiceOdds(6, 2);
      const result2 = calculateDiceOdds(6, 2);
      const result3 = calculateDiceOdds(6, 2);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should show decreasing odds as hits increase', () => {
      const oneHit = parseFloat(calculateDiceOdds(6, 1));
      const twoHits = parseFloat(calculateDiceOdds(6, 2));
      const threeHits = parseFloat(calculateDiceOdds(6, 3));

      expect(oneHit).toBeGreaterThan(twoHits);
      expect(twoHits).toBeGreaterThan(threeHits);
    });

    it('should show decreasing odds as die faces increase', () => {
      const d4 = parseFloat(calculateDiceOdds(4, 1));
      const d6 = parseFloat(calculateDiceOdds(6, 1));
      const d20 = parseFloat(calculateDiceOdds(20, 1));

      expect(d4).toBeGreaterThan(d6);
      expect(d6).toBeGreaterThan(d20);
    });
  });
});
