'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChevronUp, ChevronDown } from 'lucide-react';
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

          {/* Side-by-side controls for Number of Sides and Side Angle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Number of Sides Card */}
            <div className="relative p-6 rounded-lg border bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-border/50">
              <div className="space-y-4">
                <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  Number of Sides
                </div>

                {/* Large input field with controls */}
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1">
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
                      className="!text-5xl font-bold tracking-tight text-left h-auto py-0 text-emerald-600 dark:text-emerald-400 bg-transparent border-none shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 focus-visible:bg-emerald-50 dark:focus-visible:bg-emerald-950/20 rounded-md transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-auto px-0"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setNumberOfSides(Math.min(60, numberOfSides + 1))}
                      disabled={numberOfSides >= 60}
                      className="h-9 w-9"
                      title="Increment"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setNumberOfSides(Math.max(3, numberOfSides - 1))}
                      disabled={numberOfSides <= 3}
                      className="h-9 w-9"
                      title="Decrement"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Slider with min/max labels */}
                <div className="pt-3 border-t border-border/30">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium">3</span>
                    <Slider
                      id="numberOfSides"
                      min={3}
                      max={60}
                      step={1}
                      value={[numberOfSides]}
                      onValueChange={([value]) => setNumberOfSides(value)}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground font-medium">60</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Angle Card */}
            <div className="relative p-6 rounded-lg border bg-gradient-to-br from-violet-500/20 to-purple-500/20 border-border/50">
              <div className="space-y-4">
                <div className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                  Side Angle
                </div>

                {/* Large input field with controls */}
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1 flex items-center gap-0">
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
                      className="!text-5xl font-bold tracking-tight text-left h-auto py-0 text-violet-600 dark:text-violet-400 bg-transparent border-none shadow-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-0 focus-visible:bg-violet-50 dark:focus-visible:bg-violet-950/20 rounded-md transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-auto px-0"
                    />
                    <span className="text-5xl font-bold tracking-tight text-violet-600 dark:text-violet-400">°</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSideAngle(Math.min(90, sideAngle + 1))}
                      disabled={sideAngle >= 90}
                      className="h-9 w-9"
                      title="Increment"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSideAngle(Math.max(1, sideAngle - 1))}
                      disabled={sideAngle <= 1}
                      className="h-9 w-9"
                      title="Decrement"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Slider with min/max labels */}
                <div className="pt-3 border-t border-border/30">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium">1°</span>
                    <Slider
                      id="sideAngle"
                      min={1}
                      max={90}
                      step={1}
                      value={[sideAngle]}
                      onValueChange={([value]) => setSideAngle(value)}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground font-medium">90°</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            90° = vertical sides, 45° = moderate slope, 1° = nearly horizontal
          </p>
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
