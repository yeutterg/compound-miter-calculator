import { describe, it, expect } from 'vitest';
import { calculateAngles, calculateStockWidth, calculateDistanceAcrossFlats } from '../angles';

describe('Compound Miter Angle Calculations', () => {
  describe('calculateAngles', () => {
    it('should match spreadsheet values for 4 sides at 70° angle', () => {
      // Test case from spreadsheet: 4 sides, 70° from horizontal
      const result = calculateAngles(4, 70);

      // Blade tilt values
      expect(result.bladeTilt).toBeCloseTo(41.641143, 1); // Actual bevel angle
      expect(result.bladeTiltComplement).toBeCloseTo(48.358857, 1); // From vertical

      // Miter gauge values
      expect(result.miterGauge).toBeCloseTo(71.118279, 1); // Miter angle
      expect(result.miterGaugeComplement).toBeCloseTo(18.881721, 1); // From square

      // Trim angle
      expect(result.trimAngle).toBe(70); // Same as side angle
    });

    it('should calculate correct angles for 3 sides (triangle) at 45°', () => {
      const result = calculateAngles(3, 45);

      // For 3 sides: miter angle = 60°
      // β = arcsin(sin(60°) × sin(45°)) ≈ 37.76°
      // γ = 90° - arctan(cos(45°) × tan(60°)) ≈ 39.23°
      expect(result.bladeTilt).toBeCloseTo(37.76, 1);
      expect(result.bladeTiltComplement).toBeCloseTo(52.24, 1); // 90 - 37.76
      expect(result.miterGauge).toBeCloseTo(39.23, 1);
      expect(result.miterGaugeComplement).toBeCloseTo(50.77, 1); // 90 - 39.23
      expect(result.trimAngle).toBe(45);
      expect(result.interiorAngle).toBe(60);
      expect(result.miterAngle).toBe(60);
    });

    it('should calculate correct angles for 6 sides (hexagon) at 90°', () => {
      const result = calculateAngles(6, 90);

      // For 6 sides at 90°: miter angle = 30°
      // β = arcsin(sin(30°) × sin(90°)) = arcsin(0.5) = 30°
      // γ = arctan(tan(30°) / cos(90°)) = arctan(∞) = 90°
      expect(result.bladeTilt).toBeCloseTo(30, 1);
      expect(result.miterGauge).toBeCloseTo(90, 0); // Allow larger margin for infinity case
      expect(result.trimAngle).toBe(90); // Same as side angle
      expect(result.interiorAngle).toBe(120);
      expect(result.miterAngle).toBe(30);
    });

    it('should calculate correct angles for 8 sides (octagon) at 60°', () => {
      const result = calculateAngles(8, 60);

      // For 8 sides: miter angle = 22.5°
      // β = arcsin(sin(22.5°) × sin(60°)) ≈ 19.35°
      // γ = 90° - arctan(cos(60°) × tan(22.5°)) ≈ 78.30°
      expect(result.bladeTilt).toBeCloseTo(19.35, 1);
      expect(result.miterGauge).toBeCloseTo(78.30, 1);
      expect(result.trimAngle).toBe(60); // Same as side angle
      expect(result.interiorAngle).toBe(135);
      expect(result.miterAngle).toBe(22.5);
    });

    it('should calculate correct angles for 4 sides (square) at 45°', () => {
      const result = calculateAngles(4, 45);

      // Classic 45° case for square
      // Miter angle = 45°
      // β = arcsin(sin(45°) × sin(45°)) = arcsin(0.5) = 30°
      // γ = arctan(tan(45°) / cos(45°)) ≈ 54.74°
      expect(result.bladeTilt).toBeCloseTo(30, 1);
      expect(result.bladeTiltComplement).toBeCloseTo(60, 1);
      expect(result.miterGauge).toBeCloseTo(54.74, 1);
      expect(result.miterGaugeComplement).toBeCloseTo(35.26, 1);
      expect(result.trimAngle).toBe(45);
      expect(result.interiorAngle).toBe(90);
      expect(result.miterAngle).toBe(45);
    });

    it('should handle edge case: very small side angle (nearly horizontal)', () => {
      const result = calculateAngles(4, 1);

      // At 1° from horizontal, angles should be very small
      expect(result.bladeTilt).toBeLessThan(1);
      expect(result.miterGauge).toBeGreaterThan(0);
      expect(result.trimAngle).toBe(1); // Same as side angle
    });

    it('should handle edge case: 3 sides (minimum)', () => {
      const result = calculateAngles(3, 45);

      expect(result.interiorAngle).toBe(60);
      expect(result.miterAngle).toBe(60);
      expect(result.bladeTilt).toBeGreaterThan(0);
      expect(result.miterGauge).toBeGreaterThan(0);
    });

    it('should handle edge case: 60 sides (maximum)', () => {
      const result = calculateAngles(60, 45);

      // With 60 sides, it's nearly circular
      // Miter angle = 3°
      expect(result.interiorAngle).toBe(174);
      expect(result.miterAngle).toBe(3);
      expect(result.bladeTilt).toBeGreaterThan(0);
      expect(result.miterGauge).toBeGreaterThan(0);
    });

    it('should throw error for invalid number of sides (too few)', () => {
      expect(() => calculateAngles(2, 45)).toThrow('Number of sides must be between 3 and 60');
    });

    it('should throw error for invalid number of sides (too many)', () => {
      expect(() => calculateAngles(61, 45)).toThrow('Number of sides must be between 3 and 60');
    });

    it('should throw error for invalid side angle (too small)', () => {
      expect(() => calculateAngles(4, 0)).toThrow('Side angle must be between 1 and 90 degrees');
    });

    it('should throw error for invalid side angle (too large)', () => {
      expect(() => calculateAngles(4, 91)).toThrow('Side angle must be between 1 and 90 degrees');
    });

    // Complement angle invariants - these must ALWAYS hold true
    describe('complement angle invariants', () => {
      it('bladeTilt + bladeTiltComplement must always equal 90° across all permutations', () => {
        // Test comprehensive permutations: sides from 3 to 60, angles from 1 to 90
        const sidesToTest = [3, 4, 5, 6, 7, 8, 10, 12, 16, 20, 24, 30, 40, 50, 60];
        const anglesToTest = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];

        let testCount = 0;
        sidesToTest.forEach(sides => {
          anglesToTest.forEach(angle => {
            const result = calculateAngles(sides, angle);
            const sum = result.bladeTilt + result.bladeTiltComplement;
            expect(sum).toBeCloseTo(90, 1);
            testCount++;
          });
        });

        // Verify we tested a comprehensive set
        expect(testCount).toBe(sidesToTest.length * anglesToTest.length);
      });

      it('miterGauge + miterGaugeComplement must always equal 90° across all permutations', () => {
        // Test comprehensive permutations: sides from 3 to 60, angles from 1 to 90
        const sidesToTest = [3, 4, 5, 6, 7, 8, 10, 12, 16, 20, 24, 30, 40, 50, 60];
        const anglesToTest = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];

        let testCount = 0;
        sidesToTest.forEach(sides => {
          anglesToTest.forEach(angle => {
            const result = calculateAngles(sides, angle);
            const sum = result.miterGauge + result.miterGaugeComplement;
            expect(sum).toBeCloseTo(90, 1);
            testCount++;
          });
        });

        // Verify we tested a comprehensive set
        expect(testCount).toBe(sidesToTest.length * anglesToTest.length);
      });

      it('all calculated values must be valid numbers (not NaN or Infinity)', () => {
        // Test that all calculations produce valid numbers across permutations
        const sidesToTest = [3, 4, 5, 6, 8, 10, 12, 20, 30, 60];
        const anglesToTest = [1, 10, 20, 30, 45, 60, 75, 85, 90];

        sidesToTest.forEach(sides => {
          anglesToTest.forEach(angle => {
            const result = calculateAngles(sides, angle);

            // All values must be finite numbers
            expect(Number.isFinite(result.bladeTilt)).toBe(true);
            expect(Number.isFinite(result.bladeTiltComplement)).toBe(true);
            expect(Number.isFinite(result.miterGauge)).toBe(true);
            expect(Number.isFinite(result.miterGaugeComplement)).toBe(true);
            expect(Number.isFinite(result.trimAngle)).toBe(true);
            expect(Number.isFinite(result.interiorAngle)).toBe(true);
            expect(Number.isFinite(result.miterAngle)).toBe(true);

            // No values should be NaN
            expect(Number.isNaN(result.bladeTilt)).toBe(false);
            expect(Number.isNaN(result.bladeTiltComplement)).toBe(false);
            expect(Number.isNaN(result.miterGauge)).toBe(false);
            expect(Number.isNaN(result.miterGaugeComplement)).toBe(false);
          });
        });
      });

      it('trimAngle must always equal the input sideAngle', () => {
        // Test that trim angle is always the same as side angle
        const sidesToTest = [3, 4, 6, 8, 12, 20, 40, 60];
        const anglesToTest = [1, 15, 30, 45, 60, 75, 90];

        sidesToTest.forEach(sides => {
          anglesToTest.forEach(angle => {
            const result = calculateAngles(sides, angle);
            expect(result.trimAngle).toBe(angle);
          });
        });
      });

      it('angles must be within valid ranges', () => {
        // Test that all angles stay within their valid ranges
        const sidesToTest = [3, 4, 5, 6, 8, 10, 15, 20, 30, 60];
        const anglesToTest = [1, 10, 25, 45, 65, 85, 90];

        sidesToTest.forEach(sides => {
          anglesToTest.forEach(angle => {
            const result = calculateAngles(sides, angle);

            // Blade tilt and miter gauge should be between 0 and 90
            expect(result.bladeTilt).toBeGreaterThanOrEqual(0);
            expect(result.bladeTilt).toBeLessThanOrEqual(90);
            expect(result.miterGauge).toBeGreaterThanOrEqual(0);
            expect(result.miterGauge).toBeLessThanOrEqual(90);

            // Complements should also be between 0 and 90
            expect(result.bladeTiltComplement).toBeGreaterThanOrEqual(0);
            expect(result.bladeTiltComplement).toBeLessThanOrEqual(90);
            expect(result.miterGaugeComplement).toBeGreaterThanOrEqual(0);
            expect(result.miterGaugeComplement).toBeLessThanOrEqual(90);

            // Trim angle should match input (1-90)
            expect(result.trimAngle).toBeGreaterThanOrEqual(1);
            expect(result.trimAngle).toBeLessThanOrEqual(90);
          });
        });
      });
    });
  });

  describe('calculateStockWidth', () => {
    it('should calculate correct stock width for 4 sides at 45°', () => {
      // For a square with 10" diameter at 45°
      const diameter = 254; // 10 inches in mm
      const stockWidth = calculateStockWidth(diameter, 4, 45);

      // w = (d × sin(45°)) / cos(45°) = d
      expect(stockWidth).toBeCloseTo(254, 1);
    });

    it('should calculate correct stock width for 6 sides at 90°', () => {
      // For hexagon with 10" diameter at 90° (vertical)
      const diameter = 254; // 10 inches in mm
      const stockWidth = calculateStockWidth(diameter, 6, 90);

      // w = (d × sin(30°)) / cos(90°) = d × 0.5 / 0 = ∞
      // Should be very large (near vertical)
      expect(stockWidth).toBeGreaterThan(1000);
    });

    it('should increase stock width as angle approaches 90°', () => {
      const diameter = 254;
      const width45 = calculateStockWidth(diameter, 4, 45);
      const width70 = calculateStockWidth(diameter, 4, 70);
      const width85 = calculateStockWidth(diameter, 4, 85);

      expect(width70).toBeGreaterThan(width45);
      expect(width85).toBeGreaterThan(width70);
    });
  });

  describe('calculateDistanceAcrossFlats', () => {
    it('should calculate distance across flats for even-sided polygons', () => {
      const diameter = 254; // 10 inches
      const thickness = 19.05; // 0.75 inches

      const distance = calculateDistanceAcrossFlats(diameter, 4, thickness);

      // For square: distance = (d + 2t) × cos(45°)
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(diameter + 2 * thickness);
    });

    it('should return null for odd-sided polygons', () => {
      const distance = calculateDistanceAcrossFlats(254, 3, 19.05);
      expect(distance).toBeNull();
    });

    it('should account for material thickness', () => {
      const diameter = 254;
      const thinDistance = calculateDistanceAcrossFlats(diameter, 4, 10);
      const thickDistance = calculateDistanceAcrossFlats(diameter, 4, 20);

      // Thicker material should result in larger distance across flats
      expect(thickDistance).toBeGreaterThan(thinDistance!);
    });

    it('should work for hexagon (6 sides)', () => {
      const diameter = 254;
      const thickness = 19.05;

      const distance = calculateDistanceAcrossFlats(diameter, 6, thickness);

      // For hexagon: distance = (d + 2t) × cos(30°)
      expect(distance).toBeGreaterThan(0);
      expect(distance).not.toBeNull();
    });

    it('should work for octagon (8 sides)', () => {
      const diameter = 254;
      const thickness = 19.05;

      const distance = calculateDistanceAcrossFlats(diameter, 8, thickness);

      expect(distance).toBeGreaterThan(0);
      expect(distance).not.toBeNull();
    });
  });
});
