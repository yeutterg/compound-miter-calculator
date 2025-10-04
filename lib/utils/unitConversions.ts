// Unit conversion utilities for the compound miter calculator

export type UnitSystem = 'imperial' | 'metric';
export type LengthUnit = 'inches' | 'feet' | 'millimeters' | 'centimeters';
export type VolumeUnit = 'cubic_inches' | 'gallons' | 'quarts' | 'fluid_ounces' |
                         'cubic_centimeters' | 'liters' | 'milliliters' | 'cubic_meters';

// Conversion factors
export const CONVERSIONS = {
  // Length
  INCH_TO_MM: 25.4,
  FOOT_TO_INCH: 12,
  CM_TO_MM: 10,

  // Volume
  GALLON_TO_CUBIC_INCHES: 231,
  QUART_TO_GALLONS: 0.25,
  LITER_TO_CUBIC_CM: 1000,
  CUBIC_METER_TO_CUBIC_CM: 1000000,

  // Board feet
  BOARD_FOOT_TO_CUBIC_INCHES: 144, // 12" × 12" × 1"
  CUBIC_METER_TO_BOARD_FEET: 423.776,
};

/**
 * Convert length to millimeters (base unit for all calculations)
 */
export function toMillimeters(value: number, unit: LengthUnit): number {
  switch (unit) {
    case 'millimeters':
      return value;
    case 'centimeters':
      return value * CONVERSIONS.CM_TO_MM;
    case 'inches':
      return value * CONVERSIONS.INCH_TO_MM;
    case 'feet':
      return value * CONVERSIONS.FOOT_TO_INCH * CONVERSIONS.INCH_TO_MM;
    default:
      return value;
  }
}

/**
 * Convert millimeters to target unit
 */
export function fromMillimeters(value: number, unit: LengthUnit): number {
  switch (unit) {
    case 'millimeters':
      return value;
    case 'centimeters':
      return value / CONVERSIONS.CM_TO_MM;
    case 'inches':
      return value / CONVERSIONS.INCH_TO_MM;
    case 'feet':
      return value / (CONVERSIONS.FOOT_TO_INCH * CONVERSIONS.INCH_TO_MM);
    default:
      return value;
  }
}

/**
 * Convert volume from cubic millimeters to target unit
 */
export function convertVolume(cubicMm: number, targetUnit: VolumeUnit): number {
  const cubicInches = cubicMm / Math.pow(CONVERSIONS.INCH_TO_MM, 3);
  const cubicCm = cubicMm / Math.pow(CONVERSIONS.CM_TO_MM, 3);

  switch (targetUnit) {
    case 'cubic_inches':
      return cubicInches;
    case 'gallons':
      return cubicInches / CONVERSIONS.GALLON_TO_CUBIC_INCHES;
    case 'quarts':
      return (cubicInches / CONVERSIONS.GALLON_TO_CUBIC_INCHES) / CONVERSIONS.QUART_TO_GALLONS;
    case 'fluid_ounces':
      return (cubicInches / CONVERSIONS.GALLON_TO_CUBIC_INCHES) * 128; // 128 oz per gallon
    case 'cubic_centimeters':
      return cubicCm;
    case 'liters':
      return cubicCm / CONVERSIONS.LITER_TO_CUBIC_CM;
    case 'milliliters':
      return cubicCm;
    case 'cubic_meters':
      return cubicCm / CONVERSIONS.CUBIC_METER_TO_CUBIC_CM;
    default:
      return cubicMm;
  }
}

/**
 * Get smart volume unit based on volume size and unit system
 */
export function getSmartVolumeUnit(cubicMm: number, unitSystem: UnitSystem): VolumeUnit {
  if (unitSystem === 'imperial') {
    const gallons = convertVolume(cubicMm, 'gallons');
    if (gallons < 0.25) return 'fluid_ounces';
    if (gallons < 1) return 'quarts';
    return 'gallons';
  } else {
    const liters = convertVolume(cubicMm, 'liters');
    if (liters < 0.1) return 'milliliters';
    if (liters < 1000) return 'liters';
    return 'cubic_meters';
  }
}

/**
 * Format number with appropriate precision
 */
export function formatNumber(value: number, precision: number = 2): string {
  return value.toFixed(precision);
}

/**
 * Get unit label for display
 */
export function getUnitLabel(unit: LengthUnit | VolumeUnit): string {
  const labels: Record<string, string> = {
    inches: 'in',
    feet: 'ft',
    millimeters: 'mm',
    centimeters: 'cm',
    cubic_inches: 'in³',
    gallons: 'gal',
    quarts: 'qt',
    fluid_ounces: 'fl oz',
    cubic_centimeters: 'cm³',
    liters: 'L',
    milliliters: 'mL',
    cubic_meters: 'm³',
  };
  return labels[unit] || unit;
}

/**
 * Calculate board feet from dimensions (in inches)
 */
export function calculateBoardFeet(
  lengthInches: number,
  widthInches: number,
  thicknessInches: number,
  quantity: number = 1
): number {
  return (lengthInches * widthInches * thicknessInches * quantity) / CONVERSIONS.BOARD_FOOT_TO_CUBIC_INCHES;
}

/**
 * Common material thickness presets
 */
export const THICKNESS_PRESETS = {
  imperial: [
    { label: '1/4"', value: 0.25 },
    { label: '1/2"', value: 0.5 },
    { label: '3/4"', value: 0.75 },
    { label: '1"', value: 1 },
  ],
  metric: [
    { label: '6mm', value: 6 },
    { label: '12mm', value: 12 },
    { label: '19mm', value: 19 },
    { label: '25mm', value: 25 },
  ],
};
