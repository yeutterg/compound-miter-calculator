/**
 * Interior volume calculations for containers/planters
 * Uses truncated pyramid/cone approximation
 */

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate area of a regular polygon
 *
 * @param diameter - Diameter of circumscribed circle (in mm)
 * @param numberOfSides - Number of sides
 * @returns Area in square millimeters
 */
function calculatePolygonArea(diameter: number, numberOfSides: number): number {
  const radius = diameter / 2;
  const angleRad = toRadians(360 / numberOfSides);

  // Area = (n × r² × sin(360°/n)) / 2
  const area = (numberOfSides * Math.pow(radius, 2) * Math.sin(angleRad)) / 2;

  return area;
}

/**
 * Calculate interior volume of the project
 * This is an approximation using truncated pyramid formula
 *
 * @param diameter - Base diameter (circumscribed circle, in mm)
 * @param height - Project height (in mm)
 * @param numberOfSides - Number of sides
 * @param sideAngle - Angle of sides to horizontal (degrees)
 * @param thickness - Material thickness (in mm)
 * @returns Volume in cubic millimeters
 */
export function calculateInteriorVolume(
  diameter: number,
  height: number,
  numberOfSides: number,
  sideAngle: number,
  thickness: number
): number {
  // Calculate interior base diameter (accounting for thickness)
  const interiorBaseDiameter = diameter - (2 * thickness);

  if (interiorBaseDiameter <= 0) {
    return 0; // Material is too thick for this diameter
  }

  // Calculate interior top diameter
  // As we go up, the diameter changes based on the side angle
  // For a tapered side, top diameter = base diameter - 2 × height × tan(90° - α)
  const taperAngle = 90 - sideAngle;
  const taperAngleRad = toRadians(taperAngle);
  const diameterReduction = 2 * height * Math.tan(taperAngleRad);

  const interiorTopDiameter = interiorBaseDiameter - diameterReduction;

  if (interiorTopDiameter <= 0) {
    // Project tapers to a point - use cone formula instead
    // Volume of cone = (1/3) × base area × height
    const baseArea = calculatePolygonArea(interiorBaseDiameter, numberOfSides);
    return (baseArea * height) / 3;
  }

  // Calculate base and top areas
  const baseArea = calculatePolygonArea(interiorBaseDiameter, numberOfSides);
  const topArea = calculatePolygonArea(interiorTopDiameter, numberOfSides);

  // Truncated pyramid volume formula:
  // V = (h/3) × (A₁ + A₂ + √(A₁ × A₂))
  const volume = (height / 3) * (baseArea + topArea + Math.sqrt(baseArea * topArea));

  return volume;
}

/**
 * Get context message for volume display based on project type and size
 *
 * @param volumeInGallons - Volume in gallons (imperial)
 * @param volumeInLiters - Volume in liters (metric)
 * @param projectType - Type of project
 * @param unitSystem - Unit system being used
 * @returns Helpful context message
 */
export function getVolumeContext(
  volumeInGallons: number,
  volumeInLiters: number,
  projectType: string,
  unitSystem: 'imperial' | 'metric'
): string {
  const volume = unitSystem === 'imperial' ? volumeInGallons : volumeInLiters;

  if (projectType === 'planter') {
    if (unitSystem === 'imperial') {
      const bags = Math.ceil(volumeInGallons / 1.5); // Assume 1.5 gal per bag of soil
      return `≈ ${bags} bag${bags !== 1 ? 's' : ''} of potting soil`;
    } else {
      const bags = Math.ceil(volumeInLiters / 5); // Assume 5L per bag of soil
      return `≈ ${bags} bag${bags !== 1 ? 's' : ''} of potting soil`;
    }
  }

  if (projectType === 'storage') {
    if (volume < 1) {
      return 'Small storage container';
    } else if (volume < 5) {
      return 'Medium storage box';
    } else {
      return 'Large storage container';
    }
  }

  if (projectType === 'decorative') {
    if (unitSystem === 'imperial') {
      if (volumeInGallons < 0.5) {
        return 'Small decorative vessel';
      } else if (volumeInGallons < 2) {
        return 'Medium decorative container';
      } else {
        return 'Large decorative piece';
      }
    } else {
      if (volumeInLiters < 2) {
        return 'Small decorative vessel';
      } else if (volumeInLiters < 8) {
        return 'Medium decorative container';
      } else {
        return 'Large decorative piece';
      }
    }
  }

  // General context
  if (volume < 1) {
    return 'Compact interior space';
  } else if (volume < 5) {
    return 'Moderate interior capacity';
  } else {
    return 'Spacious interior volume';
  }
}

/**
 * Apply drainage reduction for planters (typically 10%)
 */
export function applyDrainageReduction(volume: number, apply: boolean = true): number {
  return apply ? volume * 0.9 : volume;
}
