import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LengthUnit, UnitSystem } from './utils/unitConversions';

export type ProjectType = 'general' | 'planter' | 'decorative' | 'storage';

export interface CalculatorState {
  // Input values
  numberOfSides: number;
  sideAngle: number;
  height: number;
  diameter: number;
  thickness: number;
  projectType: ProjectType;
  unitSystem: UnitSystem;
  lengthUnit: LengthUnit;
  includeWaste: boolean;
  applyDrainage: boolean; // For planters
  miterGaugeLimit: number;

  // Actions
  setNumberOfSides: (value: number) => void;
  setSideAngle: (value: number) => void;
  setHeight: (value: number) => void;
  setDiameter: (value: number) => void;
  setThickness: (value: number) => void;
  setProjectType: (value: ProjectType) => void;
  setUnitSystem: (value: UnitSystem) => void;
  setLengthUnit: (value: LengthUnit) => void;
  setIncludeWaste: (value: boolean) => void;
  setApplyDrainage: (value: boolean) => void;
  setMiterGaugeLimit: (value: number) => void;
  reset: () => void;
}

// Default values based on imperial units
const defaultValues = {
  numberOfSides: 4,
  sideAngle: 45,
  height: 10,
  diameter: 10,
  thickness: 0.75,
  projectType: 'general' as ProjectType,
  unitSystem: 'imperial' as UnitSystem,
  lengthUnit: 'inches' as LengthUnit,
  includeWaste: false,
  applyDrainage: false,
  miterGaugeLimit: 60,
};

export const useCalculatorStore = create<CalculatorState>()(
  persist(
    (set) => ({
      ...defaultValues,

      setNumberOfSides: (value) => set({ numberOfSides: value }),
      setSideAngle: (value) => set({ sideAngle: value }),
      setHeight: (value) => set({ height: value }),
      setDiameter: (value) => set({ diameter: value }),
      setThickness: (value) => set({ thickness: value }),
      setProjectType: (value) => set({ projectType: value }),
      setUnitSystem: (value) => {
        // Auto-switch length unit based on unit system
        const newLengthUnit = value === 'imperial' ? 'inches' : 'millimeters';
        set({ unitSystem: value, lengthUnit: newLengthUnit });
      },
      setLengthUnit: (value) => set({ lengthUnit: value }),
      setIncludeWaste: (value) => set({ includeWaste: value }),
      setApplyDrainage: (value) => set({ applyDrainage: value }),
      setMiterGaugeLimit: (value) =>
        set({
          miterGaugeLimit: Math.max(45, Math.min(60, Math.round(value / 5) * 5)),
        }),
      reset: () => set(defaultValues),
    }),
    {
      name: 'compound-miter-calculator',
      partialize: (state) => ({
        // Persist both user preferences and input values
        numberOfSides: state.numberOfSides,
        sideAngle: state.sideAngle,
        height: state.height,
        diameter: state.diameter,
        thickness: state.thickness,
        unitSystem: state.unitSystem,
        lengthUnit: state.lengthUnit,
        projectType: state.projectType,
        includeWaste: state.includeWaste,
        applyDrainage: state.applyDrainage,
        miterGaugeLimit: state.miterGaugeLimit,
      }),
    }
  )
);
