/**
 * Material and board feet calculations
 */

import { CONVERSIONS } from '../utils/unitConversions';

/**
 * Calculate the length of each side piece
 *
 * @param height - Project height (in mm)
 * @param sideAngle - Angle of sides to horizontal (degrees)
 * @returns Length of each piece in millimeters
 */
function calculatePieceLength(height: number, sideAngle: number): number {
  const sideAngleRad = (sideAngle * Math.PI) / 180;

  // Length = height / sin(angle)
  // This gives us the slant height of the side piece
  const length = height / Math.sin(sideAngleRad);

  return length;
}

/**
 * Calculate board feet required for the project
 *
 * @param height - Project height (in mm)
 * @param stockWidth - Width of stock needed (in mm)
 * @param thickness - Material thickness (in mm)
 * @param numberOfSides - Number of sides
 * @param sideAngle - Angle of sides to horizontal (degrees)
 * @param includeWaste - Whether to add 10% waste factor
 * @returns Board feet required
 */
export function calculateBoardFeet(
  height: number,
  stockWidth: number,
  thickness: number,
  numberOfSides: number,
  sideAngle: number,
  includeWaste: boolean = false
): number {
  // Calculate piece length
  const pieceLength = calculatePieceLength(height, sideAngle);

  // Convert all dimensions to inches for board feet calculation
  const lengthInches = pieceLength / CONVERSIONS.INCH_TO_MM;
  const widthInches = stockWidth / CONVERSIONS.INCH_TO_MM;
  const thicknessInches = thickness / CONVERSIONS.INCH_TO_MM;

  // Calculate board feet
  // Board feet = (length × width × thickness × quantity) / 144
  let boardFeet =
    (lengthInches * widthInches * thicknessInches * numberOfSides) /
    CONVERSIONS.BOARD_FOOT_TO_CUBIC_INCHES;

  // Add 10% waste if requested
  if (includeWaste) {
    boardFeet *= 1.1;
  }

  return boardFeet;
}

/**
 * Calculate cubic meters of material (metric equivalent)
 *
 * @param height - Project height (in mm)
 * @param stockWidth - Width of stock needed (in mm)
 * @param thickness - Material thickness (in mm)
 * @param numberOfSides - Number of sides
 * @param sideAngle - Angle of sides to horizontal (degrees)
 * @param includeWaste - Whether to add 10% waste factor
 * @returns Cubic meters required
 */
export function calculateCubicMeters(
  height: number,
  stockWidth: number,
  thickness: number,
  numberOfSides: number,
  sideAngle: number,
  includeWaste: boolean = false
): number {
  // Calculate piece length
  const pieceLength = calculatePieceLength(height, sideAngle);

  // Calculate volume in cubic millimeters
  let cubicMm = pieceLength * stockWidth * thickness * numberOfSides;

  // Add 10% waste if requested
  if (includeWaste) {
    cubicMm *= 1.1;
  }

  // Convert to cubic meters
  const cubicMeters = cubicMm / 1000000000;

  return cubicMeters;
}

/**
 * Get material cost estimate context (placeholder for future feature)
 *
 * @param boardFeet - Board feet required
 * @param pricePerBoardFoot - Price per board foot (optional)
 * @returns Cost estimate or null
 */
export function getMaterialCostEstimate(
  boardFeet: number,
  pricePerBoardFoot?: number
): number | null {
  if (!pricePerBoardFoot) {
    return null;
  }

  return boardFeet * pricePerBoardFoot;
}

/**
 * Calculate total surface area of all pieces
 *
 * @param height - Project height (in mm)
 * @param stockWidth - Width of stock needed (in mm)
 * @param numberOfSides - Number of sides
 * @param sideAngle - Angle of sides to horizontal (degrees)
 * @returns Total surface area in square millimeters
 */
export function calculateSurfaceArea(
  height: number,
  stockWidth: number,
  numberOfSides: number,
  sideAngle: number
): number {
  const pieceLength = calculatePieceLength(height, sideAngle);
  const areaPerPiece = pieceLength * stockWidth;
  const totalArea = areaPerPiece * numberOfSides;

  return totalArea;
}
