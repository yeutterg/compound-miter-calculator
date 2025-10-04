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
  bladeTilt: number;      // β - Saw blade tilt angle
  miterGauge: number;     // γ - Miter gauge angle
  trimAngle: number;      // δ - Trim angle
  interiorAngle: number;  // Interior angle of polygon
  miterAngle: number;     // Miter angle for joining pieces
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
  // β = arctan(tan(α) × sin(miter angle))
  const bladeTiltRad = Math.atan(
    Math.tan(sideAngleRad) * Math.sin(miterAngleRad)
  );
  const bladeTilt = toDegrees(bladeTiltRad);

  // Calculate miter gauge angle
  // γ = arctan(cos(α) × tan(miter angle))
  const miterGaugeRad = Math.atan(
    Math.cos(sideAngleRad) * Math.tan(miterAngleRad)
  );
  const miterGauge = toDegrees(miterGaugeRad);

  // Calculate trim angle
  // δ = 90° - (interior angle / 2)
  const trimAngle = 90 - (interiorAngle / 2);

  return {
    bladeTilt: Number(bladeTilt.toFixed(1)),
    miterGauge: Number(miterGauge.toFixed(1)),
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
