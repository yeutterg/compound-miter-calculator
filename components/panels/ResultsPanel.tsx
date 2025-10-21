'use client';

import { useMemo, useState } from 'react';
import { Copy, Check, Info, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCalculatorStore } from '@/lib/store';
import { calculateAngles, calculateStockWidth, calculateDistanceAcrossFlats, hasParallelSides } from '@/lib/calculations/angles';
import { calculateInteriorVolume, getVolumeContext } from '@/lib/calculations/volume';
import { calculateBoardFeet, calculateCubicMeters } from '@/lib/calculations/materials';
import {
  toMillimeters,
  fromMillimeters,
  convertVolume,
  getSmartVolumeUnit,
  formatNumber,
  getUnitLabel,
} from '@/lib/utils/unitConversions';

export function ResultsPanel() {
  const {
    numberOfSides,
    sideAngle,
    height,
    diameter,
    thickness,
    lengthUnit,
    includeWaste,
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

  // Determine unit system from length unit
  const unitSystem = lengthUnit === 'inches' || lengthUnit === 'feet' ? 'imperial' : 'metric';

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

    const volumeUnit = getSmartVolumeUnit(volumeMm3, unitSystem);
    const volumeValue = convertVolume(volumeMm3, volumeUnit);

    // Get context message
    const volumeInGallons = convertVolume(volumeMm3, 'gallons');
    const volumeInLiters = convertVolume(volumeMm3, 'liters');
    const context = getVolumeContext(volumeInGallons, volumeInLiters, 'general', unitSystem);

    return {
      value: volumeValue,
      unit: volumeUnit,
      label: getUnitLabel(volumeUnit),
      context,
    };
  }, [diameterMm, heightMm, numberOfSides, sideAngle, thicknessMm, thickness, unitSystem]);

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
        {/* Saw Settings Group - Side by Side */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Saw Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AngleCard
              symbol="γ"
              primaryLabel="Miter Gauge"
              primaryValue={angles.miterGauge}
              complementValue={angles.miterGaugeComplement}
              primaryDescription="Miter setting"
              complementDescription="from square"
              primaryTooltip="The angle to set your miter gauge for the horizontal cut angle"
              complementTooltip="The miter gauge angle measured from 90° (square). Alternative reference."
              color="from-blue-500/20 to-indigo-500/20"
              textColor="text-blue-600 dark:text-blue-400"
            />
            <AngleCard
              symbol="β"
              primaryLabel="Blade Tilt"
              primaryValue={angles.bladeTilt}
              complementValue={angles.bladeTiltComplement}
              primaryDescription="Bevel angle"
              complementDescription="from vertical"
              primaryTooltip="The angle to tilt your saw blade from horizontal (0°) for the bevel cut"
              complementTooltip="The blade tilt measured from vertical (90°). Some saws use this reference."
              color="from-amber-500/20 to-orange-500/20"
              textColor="text-amber-600 dark:text-amber-400"
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
              tooltip="The minimum width of stock material needed for each side piece"
              copyValue={stockWidth.toString()}
            />
            <ResultCard
              label="α Top/Bottom Trim"
              value={`${formatNumber(angles.trimAngle, 1)}°`}
              description="End cut angle"
              tooltip="The angle to trim the top and/or bottom edges (same as your side angle α)"
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
              tooltip="The narrowest outer dimension measured across parallel flat sides"
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
              tooltip="The calculated interior volume accounting for wall thickness and side angle"
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
              tooltip={`Total ${materialResult.unit === 'm³' ? 'cubic meters' : 'board feet'} of material needed for all ${numberOfSides} pieces`}
              copyValue={materialResult.value.toString()}
              highlight
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AngleCardProps {
  symbol: string;
  primaryLabel: string;
  primaryValue: number;
  complementValue: number;
  primaryDescription: string;
  complementDescription: string;
  primaryTooltip: string;
  complementTooltip: string;
  color: string;
  textColor: string;
}

function AngleCard({
  symbol,
  primaryLabel,
  primaryValue,
  complementValue,
  primaryDescription,
  complementDescription,
  primaryTooltip,
  complementTooltip,
  color,
  textColor,
}: AngleCardProps) {
  const [showComplement, setShowComplement] = useState(false);
  const [copiedMain, setCopiedMain] = useState(false);
  const [copiedComplement, setCopiedComplement] = useState(false);

  const displayValue = showComplement ? complementValue : primaryValue;
  const displayLabel = showComplement ? `${symbol} Complement` : `${symbol} ${primaryLabel}`;
  const displayDescription = showComplement ? `Complement ${complementDescription}` : primaryDescription;
  const displayTooltip = showComplement ? complementTooltip : primaryTooltip;

  const copyMainToClipboard = () => {
    navigator.clipboard.writeText(displayValue.toString());
    setCopiedMain(true);
    setTimeout(() => setCopiedMain(false), 2000);
  };

  const copyComplementToClipboard = () => {
    const complementVal = showComplement ? primaryValue : complementValue;
    navigator.clipboard.writeText(complementVal.toString());
    setCopiedComplement(true);
    setTimeout(() => setCopiedComplement(false), 2000);
  };

  return (
    <div className={`relative p-4 rounded-lg border bg-gradient-to-br ${color} border-border/50`}>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`text-sm font-semibold ${textColor}`}>{displayLabel}</div>
            {displayTooltip && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{displayTooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Large angle display */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className={`text-5xl font-bold tracking-tight ${textColor}`}>
              {formatNumber(displayValue, 1)}°
            </div>
            <div className="text-sm text-muted-foreground">{displayDescription}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyMainToClipboard}
            className="h-9 w-9 self-start mt-2"
            title="Copy to clipboard"
          >
            {copiedMain ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Divider with toggle button */}
        <div className="relative pt-2">
          <div className="absolute inset-x-0 top-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComplement(!showComplement)}
              className="h-6 px-2 bg-background border border-border/50 relative z-10"
              title="Toggle complement angle"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="border-t border-border/30" />
        </div>

        {/* Complement preview */}
        <div className="pt-0">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {showComplement ? primaryDescription : `Complement ${complementDescription}`}:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">
                {formatNumber(showComplement ? primaryValue : complementValue, 1)}°
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyComplementToClipboard}
                className="h-7 w-7"
                title="Copy complement to clipboard"
              >
                {copiedComplement ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ResultCardProps {
  label: string;
  value: string;
  description: string;
  copyValue: string;
  tooltip?: string;
  highlight?: boolean;
}

function ResultCard({ label, value, description, copyValue, tooltip, highlight }: ResultCardProps) {
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
          <div className="flex items-center gap-1.5 mb-1">
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            {tooltip && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
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
