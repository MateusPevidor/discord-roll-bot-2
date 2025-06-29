import { roll } from '../../../../src/bot/domain/general/roll';

describe('roll', () => {
  let mockMathRandom: jest.SpyInstance;

  beforeEach(() => {
    // Mock Math.random to return predictable values
    mockMathRandom = jest.spyOn(Math, 'random');
  });

  afterEach(() => {
    // Restore the original Math.random after each test
    mockMathRandom.mockRestore();
  });

  describe('Basic functionality', () => {
    it('should return 1 when Math.random returns 0', () => {
      // Arrange
      mockMathRandom.mockReturnValue(0);

      // Act
      const result = roll(100);

      // Assert
      expect(result).toBe(1);
      expect(mockMathRandom).toHaveBeenCalledTimes(1);
    });

    it('should return the maximum value when Math.random returns a value just below 1', () => {
      // Arrange
      mockMathRandom.mockReturnValue(0.999999);

      // Act
      const result = roll(100);

      // Assert
      expect(result).toBe(100);
    });

    it('should return the middle value for 0.5 random value', () => {
      // Arrange
      mockMathRandom.mockReturnValue(0.5);

      // Act
      const result = roll(100);

      // Assert
      expect(result).toBe(51); // Math.floor(0.5 * 100) + 1 = Math.floor(50) + 1 = 50 + 1 = 51
    });

    it('should work with default limit of 100', () => {
      // Arrange
      mockMathRandom.mockReturnValue(0.25);

      // Act
      const result = roll();

      // Assert
      expect(result).toBe(26); // Math.floor(0.25 * 100) + 1 = Math.floor(25) + 1 = 25 + 1 = 26
    });
  });

  describe('Different limit values', () => {
    it('should handle a 6-sided die (limit = 6)', () => {
      // Arrange
      mockMathRandom.mockReturnValue(0);

      // Act
      const result = roll(6);

      // Assert
      expect(result).toBe(1);
    });

    it('should return 6 for a 6-sided die when random is near 1', () => {
      // Arrange
      mockMathRandom.mockReturnValue(0.9999);

      // Act
      const result = roll(6);

      // Assert
      expect(result).toBe(6);
    });

    it('should handle a 20-sided die (limit = 20)', () => {
      // Arrange
      mockMathRandom.mockReturnValue(0.5);

      // Act
      const result = roll(20);

      // Assert
      expect(result).toBe(11); // Math.floor(0.5 * 20) + 1 = Math.floor(10) + 1 = 10 + 1 = 11
    });

    it('should handle a 2-sided coin flip (limit = 2)', () => {
      // Arrange
      mockMathRandom.mockReturnValue(0.3);

      // Act
      const result = roll(2);

      // Assert
      expect(result).toBe(1);
    });

    it('should handle a 2-sided coin flip returning 2', () => {
      // Arrange
      mockMathRandom.mockReturnValue(0.7);

      // Act
      const result = roll(2);

      // Assert
      expect(result).toBe(2);
    });

    it('should handle single-sided die (limit = 1)', () => {
      // Arrange
      mockMathRandom.mockReturnValue(0.5);

      // Act
      const result = roll(1);

      // Assert
      expect(result).toBe(1);
    });

    it('should handle large limit values', () => {
      // Arrange
      mockMathRandom.mockReturnValue(0.001);

      // Act
      const result = roll(1000);

      // Assert
      expect(result).toBe(2); // Math.floor(0.001 * 1000) + 1 = Math.floor(1) + 1 = 1 + 1 = 2
    });

    it('should handle large limit with high random value', () => {
      // Arrange
      mockMathRandom.mockReturnValue(0.999);

      // Act
      const result = roll(1000);

      // Assert
      expect(result).toBe(1000); // Math.floor(0.999 * 1000) + 1 = Math.floor(999) + 1 = 999 + 1 = 1000
    });
  });

  describe('Edge cases with specific random values', () => {
    it('should handle very small positive random values', () => {
      // Arrange
      mockMathRandom.mockReturnValue(0.000001);

      // Act
      const result = roll(100);

      // Assert
      expect(result).toBe(1);
    });

    it('should handle random values just below thresholds', () => {
      // Arrange - This should give us Math.floor(0.99999 * 6) + 1 = Math.floor(5.99994) + 1 = 5 + 1 = 6
      mockMathRandom.mockReturnValue(0.99999);

      // Act
      const result = roll(6);

      // Assert
      expect(result).toBe(6);
    });

    it('should properly floor decimal results', () => {
      // Arrange - This should give us Math.floor(0.33 * 10) + 1 = Math.floor(3.3) + 1 = 3 + 1 = 4
      mockMathRandom.mockReturnValue(0.33);

      // Act
      const result = roll(10);

      // Assert
      expect(result).toBe(4);
    });
  });

  describe('Multiple calls with different random values', () => {
    it('should return different values for different random inputs', () => {
      // Arrange
      mockMathRandom
        .mockReturnValueOnce(0.1) // Should give 11: Math.floor(0.1 * 100) + 1 = 10 + 1 = 11
        .mockReturnValueOnce(0.5) // Should give 51: Math.floor(0.5 * 100) + 1 = 50 + 1 = 51
        .mockReturnValueOnce(0.9); // Should give 91: Math.floor(0.9 * 100) + 1 = 90 + 1 = 91

      // Act
      const result1 = roll(100);
      const result2 = roll(100);
      const result3 = roll(100);

      // Assert
      expect(result1).toBe(11);
      expect(result2).toBe(51);
      expect(result3).toBe(91);
      expect(mockMathRandom).toHaveBeenCalledTimes(3);
    });

    it('should work consistently with the same random value', () => {
      // Arrange
      mockMathRandom.mockReturnValue(0.25);

      // Act
      const result1 = roll(100);
      const result2 = roll(100);

      // Assert
      expect(result1).toBe(26); // Math.floor(0.25 * 100) + 1 = 25 + 1 = 26
      expect(result2).toBe(26);
      expect(mockMathRandom).toHaveBeenCalledTimes(2);
    });
  });

  describe('Return value validation', () => {
    it('should always return integers', () => {
      // Arrange
      const randomValues = [0, 0.1, 0.33333, 0.5, 0.66666, 0.9, 0.99999];

      randomValues.forEach((randomValue, index) => {
        // Arrange
        mockMathRandom.mockReturnValueOnce(randomValue);

        // Act
        const result = roll(100);

        // Assert
        expect(Number.isInteger(result)).toBe(true);
      });
    });

    it('should always return values within the expected range [1, limit]', () => {
      // Arrange
      const limits = [1, 2, 6, 10, 20, 100, 1000];
      const randomValues = [0, 0.5, 0.99999];

      limits.forEach((limit) => {
        randomValues.forEach((randomValue) => {
          // Arrange
          mockMathRandom.mockReturnValueOnce(randomValue);

          // Act
          const result = roll(limit);

          // Assert
          expect(result).toBeGreaterThanOrEqual(1);
          expect(result).toBeLessThanOrEqual(limit);
        });
      });
    });
  });

  describe('Statistical distribution verification', () => {
    it('should distribute values correctly across the range for a 6-sided die', () => {
      // Arrange - Mock specific values that should map to each face of a 6-sided die
      const testCases = [
        { random: 0, expected: 1 }, // Math.floor(0 * 6) + 1 = 0 + 1 = 1
        { random: 0.166, expected: 1 }, // Math.floor(0.166 * 6) + 1 = 0 + 1 = 1
        { random: 0.167, expected: 2 }, // Math.floor(0.167 * 6) + 1 = 1 + 1 = 2
        { random: 0.333, expected: 2 }, // Math.floor(0.333 * 6) + 1 = 1 + 1 = 2
        { random: 0.334, expected: 3 }, // Math.floor(0.334 * 6) + 1 = 2 + 1 = 3
        { random: 0.5, expected: 4 }, // Math.floor(0.5 * 6) + 1 = 3 + 1 = 4
        { random: 0.667, expected: 5 }, // Math.floor(0.667 * 6) + 1 = 4 + 1 = 5
        { random: 0.833, expected: 5 }, // Math.floor(0.833 * 6) + 1 = 4 + 1 = 5
        { random: 0.834, expected: 6 }, // Math.floor(0.834 * 6) + 1 = 5 + 1 = 6
        { random: 0.999, expected: 6 } // Math.floor(0.999 * 6) + 1 = 5 + 1 = 6
      ];

      testCases.forEach(({ random, expected }) => {
        // Arrange
        mockMathRandom.mockReturnValueOnce(random);

        // Act
        const result = roll(6);

        // Assert
        expect(result).toBe(expected);
      });
    });
  });

  describe('Integration with actual Math.random (no mocking)', () => {
    beforeEach(() => {
      // Restore Math.random for these tests
      mockMathRandom.mockRestore();
    });

    it('should return values in the correct range with real randomness', () => {
      // Act - Run multiple times to test with real random values
      const results = Array.from({ length: 100 }, () => roll(6));

      // Assert
      results.forEach((result) => {
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
        expect(Number.isInteger(result)).toBe(true);
      });
    });

    it('should produce different values over multiple calls (probabilistically)', () => {
      // Act
      const results = Array.from({ length: 20 }, () => roll(100));
      const uniqueResults = new Set(results);

      // Assert - With 20 rolls on a 100-sided die, we should get some variety
      // This test could theoretically fail but the probability is extremely low
      expect(uniqueResults.size).toBeGreaterThan(1);
    });

    it('should work with default parameter and real randomness', () => {
      // Act
      const result = roll();

      // Assert
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result)).toBe(true);
    });
  });
});
