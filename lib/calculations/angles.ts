/**
 * Core angle calculations for compound miter joints
 */

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export interface AngleResults {
  bladeTilt: number;             // β - Saw blade tilt angle (bevel angle)
  bladeTiltComplement: number;   // 90° - β - Blade tilt complement
  miterGauge: number;            // γ - Miter gauge angle
  miterGaugeComplement: number;  // 90° - γ - Miter gauge complement
  trimAngle: number;             // δ - Trim angle (same as side angle for reference)
  interiorAngle: number;         // Interior angle of polygon
  miterAngle: number;            // Miter angle for joining pieces
}

/**
 * Calculate compound miter angles
 *
 * @param numberOfSides - Number of sides in the polygon (3-60)
 * @param sideAngle - Angle of each side to horizontal (1-90 degrees)
 * @returns Object containing all calculated angles in degrees
 */
export function calculateAngles(
  numberOfSides: number,
  sideAngle: number
): AngleResults {
  // Input validation
  if (numberOfSides < 3 || numberOfSides > 60) {
    throw new Error('Number of sides must be between 3 and 60');
  }
  if (sideAngle < 1 || sideAngle > 90) {
    throw new Error('Side angle must be between 1 and 90 degrees');
  }

  // Calculate interior angle of the polygon
  const interiorAngle = ((numberOfSides - 2) * 180) / numberOfSides;

  // Calculate miter angle (half of the corner angle)
  const cornerAngle = 180 - interiorAngle;
  const miterAngle = cornerAngle / 2;

  // Convert to radians for trigonometric calculations
  const sideAngleRad = toRadians(sideAngle);
  const miterAngleRad = toRadians(miterAngle);

  // Calculate blade tilt angle (bevel)
  // β = arcsin(sin(miter angle) × sin(α))
  // This is the CORRECT formula verified against compound miter spreadsheets
  const bladeTiltRad = Math.asin(
    Math.sin(miterAngleRad) * Math.sin(sideAngleRad)
  );
  const bladeTilt = toDegrees(bladeTiltRad);

  // Calculate miter gauge angle
  // The complement formula: γ_complement = arctan(cos(α) × tan(M))
  // Then: γ = 90° - γ_complement
  // This is the CORRECT formula verified against compound miter spreadsheets
  const miterGaugeComplementRad = Math.atan(
    Math.cos(sideAngleRad) * Math.tan(miterAngleRad)
  );
  const miterGaugeComplement = toDegrees(miterGaugeComplementRad);
  const miterGauge = 90 - miterGaugeComplement;

  // Calculate trim angle (same as side angle for top/bottom cuts)
  const trimAngle = sideAngle;

  // Round the primary angles first
  const bladeTiltRounded = Number(bladeTilt.toFixed(1));

  // Calculate blade tilt complement from rounded value to ensure they sum to exactly 90°
  const bladeTiltComplement = Number((90 - bladeTiltRounded).toFixed(1));

  // For miter gauge, we calculated the complement first, so round it and recalculate the primary
  const miterGaugeComplementRounded = Number(miterGaugeComplement.toFixed(1));
  const miterGaugeFinal = Number((90 - miterGaugeComplementRounded).toFixed(1));

  return {
    bladeTilt: bladeTiltRounded,
    bladeTiltComplement: bladeTiltComplement,
    miterGauge: miterGaugeFinal,
    miterGaugeComplement: miterGaugeComplementRounded,
    trimAngle: Number(trimAngle.toFixed(1)),
    interiorAngle: Number(interiorAngle.toFixed(1)),
    miterAngle: Number(miterAngle.toFixed(1)),
  };
}

/**
 * Calculate stock width needed
 *
 * @param diameter - Diameter of the circumscribed circle (in mm)
 * @param numberOfSides - Number of sides in the polygon
 * @param sideAngle - Angle of each side to horizontal (degrees)
 * @returns Stock width in millimeters
 */
export function calculateStockWidth(
  diameter: number,
  numberOfSides: number,
  sideAngle: number
): number {
  const sideAngleRad = toRadians(sideAngle);
  const segmentAngle = toRadians(180 / numberOfSides);

  // w = (diameter × sin(180°/n)) / cos(α)
  const width = (diameter * Math.sin(segmentAngle)) / Math.cos(sideAngleRad);

  return width;
}

/**
 * Calculate distance across flats (only for even-sided polygons)
 * This is the outer measurement accounting for material thickness
 *
 * @param diameter - Diameter of the circumscribed circle (in mm)
 * @param numberOfSides - Number of sides in the polygon
 * @param thickness - Material thickness (in mm)
 * @returns Distance across flats in millimeters, or null if odd-sided
 */
export function calculateDistanceAcrossFlats(
  diameter: number,
  numberOfSides: number,
  thickness: number
): number | null {
  // Only calculate for even-sided polygons
  if (numberOfSides % 2 !== 0) {
    return null;
  }

  // Account for material thickness - add thickness to both sides
  const outerDiameter = diameter + (2 * thickness);

  // Calculate distance across flats
  const angleRad = toRadians(180 / numberOfSides);
  const distanceAcrossFlats = outerDiameter * Math.cos(angleRad);

  return distanceAcrossFlats;
}

/**
 * Check if polygon has parallel opposite sides (even number of sides)
 */
export function hasParallelSides(numberOfSides: number): boolean {
  return numberOfSides % 2 === 0;
}
