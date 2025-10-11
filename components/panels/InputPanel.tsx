'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCalculatorStore } from '@/lib/store';
import { THICKNESS_PRESETS, type LengthUnit } from '@/lib/utils/unitConversions';

export function InputPanel() {
  const {
    numberOfSides,
    sideAngle,
    height,
    diameter,
    thickness,
    lengthUnit,
    includeWaste,
    setNumberOfSides,
    setSideAngle,
    setHeight,
    setDiameter,
    setThickness,
    setLengthUnit,
    setIncludeWaste,
  } = useCalculatorStore();

  const isImperial = lengthUnit === 'inches' || lengthUnit === 'feet';
  const thicknessPresets = isImperial
    ? THICKNESS_PRESETS.imperial
    : THICKNESS_PRESETS.metric;

  const unitLabel = lengthUnit === 'inches' ? 'in' :
                    lengthUnit === 'feet' ? 'ft' :
                    lengthUnit === 'millimeters' ? 'mm' : 'cm';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Inputs</CardTitle>
        <CardDescription>
          Configure your project dimensions and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">

        {/* Geometry Group */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-sm font-medium">Geometry</h3>

          {/* Number of Sides */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="numberOfSides">Number of Sides</Label>
              <Input
                id="numberOfSidesInput"
                type="number"
                min={3}
                max={60}
                step={1}
                value={numberOfSides}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 3;
                  setNumberOfSides(Math.max(3, Math.min(60, val)));
                }}
                className="w-20 text-right"
              />
            </div>
            <Slider
              id="numberOfSides"
              min={3}
              max={60}
              step={1}
              value={[numberOfSides]}
              onValueChange={([value]) => setNumberOfSides(value)}
              className="relative"
            />
          </div>

          {/* Side Angle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="sideAngle">Side Angle</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="sideAngleInput"
                  type="number"
                  min={1}
                  max={90}
                  step={1}
                  value={sideAngle}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setSideAngle(Math.max(1, Math.min(90, val)));
                  }}
                  className="w-20 text-right"
                />
                <span className="text-sm font-medium">°</span>
              </div>
            </div>
            <Slider
              id="sideAngle"
              min={1}
              max={90}
              step={1}
              value={[sideAngle]}
              onValueChange={([value]) => setSideAngle(value)}
              className="relative"
            />
            <p className="text-xs text-muted-foreground">
              90° = vertical sides, 45° = moderate slope, 1° = nearly horizontal
            </p>
          </div>
        </div>

        {/* Dimensions Group */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-sm font-medium">Dimensions</h3>

          {/* Unit Selection */}
          <div className="space-y-2">
            <Label>Units</Label>
            <RadioGroup
              value={lengthUnit}
              onValueChange={(value) => setLengthUnit(value as LengthUnit)}
              className="flex flex-row gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inches" id="unit-inches" />
                <Label htmlFor="unit-inches" className="cursor-pointer font-normal">
                  Inches
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="millimeters" id="unit-mm" />
                <Label htmlFor="unit-mm" className="cursor-pointer font-normal">
                  mm
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="centimeters" id="unit-cm" />
                <Label htmlFor="unit-cm" className="cursor-pointer font-normal">
                  cm
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Height ({unitLabel})</Label>
              <Input
                id="height"
                type="number"
                min={0.1}
                step={0.1}
                value={height}
                onChange={(e) => setHeight(parseFloat(e.target.value) || 0.1)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="diameter">Diameter ({unitLabel})</Label>
              <Input
                id="diameter"
                type="number"
                min={0.1}
                step={0.1}
                value={diameter}
                onChange={(e) => setDiameter(parseFloat(e.target.value) || 0.1)}
              />
              <p className="text-xs text-muted-foreground">Corner-to-corner</p>
            </div>
          </div>
        </div>

        {/* Material Group */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-sm font-medium">Material</h3>
          <div className="space-y-2">
            <Label htmlFor="thickness">Thickness ({unitLabel})</Label>
            <div className="flex gap-2">
              <Input
                id="thickness"
                type="number"
                min={0}
                step={0.01}
                value={thickness}
                onChange={(e) => setThickness(parseFloat(e.target.value) || 0)}
                className="flex-1"
              />
              <Select
                value={thickness.toString()}
                onValueChange={(value) => setThickness(parseFloat(value))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Preset" />
                </SelectTrigger>
                <SelectContent>
                  {thicknessPresets.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value.toString()}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Options Group */}
        <div className="space-y-3 pt-4 border-t">
          <h3 className="text-sm font-medium">Options</h3>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeWaste"
              checked={includeWaste}
              onCheckedChange={(checked) => setIncludeWaste(checked as boolean)}
            />
            <Label htmlFor="includeWaste" className="cursor-pointer font-normal">
              Add 10% waste to material estimate
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
