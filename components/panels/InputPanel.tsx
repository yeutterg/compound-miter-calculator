'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCalculatorStore } from '@/lib/store';
import { THICKNESS_PRESETS } from '@/lib/utils/unitConversions';

export function InputPanel() {
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
    setNumberOfSides,
    setSideAngle,
    setHeight,
    setDiameter,
    setThickness,
    setProjectType,
    setUnitSystem,
    setLengthUnit,
    setIncludeWaste,
    setApplyDrainage,
  } = useCalculatorStore();

  const isImperial = unitSystem === 'imperial';
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
        {/* Project Settings Group */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-sm font-medium">Project Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type</Label>
              <Select value={projectType} onValueChange={(value) => setProjectType(value as typeof projectType)}>
                <SelectTrigger id="projectType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="planter">Planter/Container</SelectItem>
                  <SelectItem value="decorative">Decorative</SelectItem>
                  <SelectItem value="storage">Storage Box</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitSystem">Unit System</Label>
              <Select value={unitSystem} onValueChange={(value) => setUnitSystem(value as typeof unitSystem)}>
                <SelectTrigger id="unitSystem">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imperial">Imperial</SelectItem>
                  <SelectItem value="metric">Metric</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Geometry Group */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-sm font-medium">Geometry</h3>

          {/* Number of Sides */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="numberOfSides">Number of Sides</Label>
              <span className="text-sm font-medium text-muted-foreground">{numberOfSides}</span>
            </div>
            <Slider
              id="numberOfSides"
              min={3}
              max={60}
              step={1}
              value={[numberOfSides]}
              onValueChange={([value]) => setNumberOfSides(value)}
            />
          </div>

          {/* Side Angle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="sideAngle">Side Angle</Label>
              <span className="text-sm font-medium text-muted-foreground">{sideAngle}°</span>
            </div>
            <Slider
              id="sideAngle"
              min={1}
              max={90}
              step={1}
              value={[sideAngle]}
              onValueChange={([value]) => setSideAngle(value)}
            />
            <p className="text-xs text-muted-foreground">
              90° = vertical sides, 45° = moderate slope, 1° = nearly horizontal
            </p>
          </div>
        </div>

        {/* Dimensions Group */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-sm font-medium">Dimensions ({unitLabel})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
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
              <Label htmlFor="diameter">Diameter</Label>
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

          {projectType === 'planter' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="applyDrainage"
                checked={applyDrainage}
                onCheckedChange={(checked) => setApplyDrainage(checked as boolean)}
              />
              <Label htmlFor="applyDrainage" className="cursor-pointer font-normal">
                Reduce volume by 10% for drainage
              </Label>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
