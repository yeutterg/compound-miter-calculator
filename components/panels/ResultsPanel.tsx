'use client';

import { useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCalculatorStore } from '@/lib/store';
import { calculateAngles, calculateStockWidth, calculateDistanceAcrossFlats, hasParallelSides } from '@/lib/calculations/angles';
import { calculateInteriorVolume, getVolumeContext, applyDrainageReduction } from '@/lib/calculations/volume';
import { calculateBoardFeet, calculateCubicMeters } from '@/lib/calculations/materials';
import {
  toMillimeters,
  fromMillimeters,
  convertVolume,
  getSmartVolumeUnit,
  formatNumber,
  getUnitLabel,
} from '@/lib/utils/unitConversions';
import { useState } from 'react';

export function ResultsPanel() {
  const {
    numberOfSides,
    sideAngle,
    height,
    diameter,
    thickness,
    projectType,
    unitSystem,
    lengthUnit,
    includeWaste,
    applyDrainage,
  } = useCalculatorStore();

  // Convert inputs to millimeters (base unit for calculations)
  const heightMm = toMillimeters(height, lengthUnit);
  const diameterMm = toMillimeters(diameter, lengthUnit);
  const thicknessMm = toMillimeters(thickness, lengthUnit);

  // Calculate angles
  const angles = useMemo(
    () => calculateAngles(numberOfSides, sideAngle),
    [numberOfSides, sideAngle]
  );

  // Calculate stock width
  const stockWidthMm = useMemo(
    () => calculateStockWidth(diameterMm, numberOfSides, sideAngle),
    [diameterMm, numberOfSides, sideAngle]
  );
  const stockWidth = fromMillimeters(stockWidthMm, lengthUnit);

  // Calculate distance across flats (if applicable)
  const distanceAcrossFlatsResult = useMemo(() => {
    if (!hasParallelSides(numberOfSides)) return null;
    const daf = calculateDistanceAcrossFlats(diameterMm, numberOfSides, thicknessMm);
    return daf ? fromMillimeters(daf, lengthUnit) : null;
  }, [diameterMm, numberOfSides, thicknessMm, lengthUnit]);

  // Calculate interior volume (if thickness is specified)
  const volumeResult = useMemo(() => {
    if (thickness <= 0) return null;

    const volumeMm3 = calculateInteriorVolume(
      diameterMm,
      heightMm,
      numberOfSides,
      sideAngle,
      thicknessMm
    );

    // Apply drainage reduction if applicable
    const adjustedVolume = projectType === 'planter'
      ? applyDrainageReduction(volumeMm3, applyDrainage)
      : volumeMm3;

    const volumeUnit = getSmartVolumeUnit(adjustedVolume, unitSystem);
    const volumeValue = convertVolume(adjustedVolume, volumeUnit);

    // Get context message
    const volumeInGallons = convertVolume(adjustedVolume, 'gallons');
    const volumeInLiters = convertVolume(adjustedVolume, 'liters');
    const context = getVolumeContext(volumeInGallons, volumeInLiters, projectType, unitSystem);

    return {
      value: volumeValue,
      unit: volumeUnit,
      label: getUnitLabel(volumeUnit),
      context,
    };
  }, [diameterMm, heightMm, numberOfSides, sideAngle, thicknessMm, thickness, projectType, unitSystem, applyDrainage]);

  // Calculate board feet / cubic meters (if thickness is specified)
  const materialResult = useMemo(() => {
    if (thickness <= 0) return null;

    if (unitSystem === 'imperial') {
      const boardFeet = calculateBoardFeet(
        heightMm,
        stockWidthMm,
        thicknessMm,
        numberOfSides,
        sideAngle,
        includeWaste
      );
      return {
        value: boardFeet,
        label: 'Board Feet',
        unit: 'bd ft',
      };
    } else {
      const cubicMeters = calculateCubicMeters(
        heightMm,
        stockWidthMm,
        thicknessMm,
        numberOfSides,
        sideAngle,
        includeWaste
      );
      return {
        value: cubicMeters,
        label: 'Material Volume',
        unit: 'm³',
      };
    }
  }, [heightMm, stockWidthMm, thicknessMm, numberOfSides, sideAngle, thickness, unitSystem, includeWaste]);

  const unitLabel = getUnitLabel(lengthUnit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculated Results</CardTitle>
        <CardDescription>
          Precise measurements for your compound miter cuts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Saw Settings Group */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Saw Settings</h3>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <ResultCard
              label="Blade Tilt"
              value={`${formatNumber(angles.bladeTilt, 1)}°`}
              description="Bevel angle"
              copyValue={angles.bladeTilt.toString()}
            />
            <ResultCard
              label="Miter Gauge"
              value={`${formatNumber(angles.miterGauge, 1)}°`}
              description="Miter setting"
              copyValue={angles.miterGauge.toString()}
            />
          </div>
        </div>

        {/* Measurements Group */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Measurements</h3>
          <div className="space-y-3">
            <ResultCard
              label="Stock Width"
              value={`${formatNumber(stockWidth, 2)} ${unitLabel}`}
              description="Minimum material width"
              copyValue={stockWidth.toString()}
            />
            <ResultCard
              label="Trim Angle"
              value={`${formatNumber(angles.trimAngle, 1)}°`}
              description="Fine-tuning angle"
              copyValue={angles.trimAngle.toString()}
            />
          </div>
        </div>

        {/* Conditional Results */}
        {distanceAcrossFlatsResult !== null && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Clearance</h3>
            <ResultCard
              label="Distance Across Flats"
              value={`${formatNumber(distanceAcrossFlatsResult, 2)} ${unitLabel}`}
              description="Narrowest width (outer)"
              copyValue={distanceAcrossFlatsResult.toString()}
              highlight
            />
          </div>
        )}

        {volumeResult && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Capacity</h3>
            <ResultCard
              label="Interior Volume"
              value={`${formatNumber(volumeResult.value, 1)} ${volumeResult.label}`}
              description={volumeResult.context}
              copyValue={volumeResult.value.toString()}
              highlight
            />
          </div>
        )}

        {materialResult && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Materials</h3>
            <ResultCard
              label={materialResult.label}
              value={`${formatNumber(materialResult.value, materialResult.unit === 'm³' ? 4 : 2)} ${materialResult.unit}`}
              description={includeWaste ? 'Includes 10% waste' : 'Material required'}
              copyValue={materialResult.value.toString()}
              highlight
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ResultCardProps {
  label: string;
  value: string;
  description: string;
  copyValue: string;
  highlight?: boolean;
}

function ResultCard({ label, value, description, copyValue, highlight }: ResultCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(copyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative p-4 rounded-lg border ${
      highlight
        ? 'bg-primary/5 border-primary/20'
        : 'bg-muted/50'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{description}</div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={copyToClipboard}
          className="h-8 w-8 shrink-0"
          title="Copy to clipboard"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
