'use client';

import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useCalculatorStore } from '@/lib/store';
import { calculateAngles } from '@/lib/calculations/angles';
import {
  toMillimeters,
  fromMillimeters,
  formatNumber,
  getUnitLabel,
  type LengthUnit,
} from '@/lib/utils/unitConversions';

interface VesselMetrics {
  heightMm: number;
  outerBottomRadiusMm: number;
  outerTopRadiusMm: number;
  innerBottomRadiusMm: number;
  innerTopRadiusMm: number;
  wallThicknessMm: number;
  topOpeningMm: number;
  bottomFootprintMm: number;
  clampedThickness: boolean;
}

function computeVesselMetrics(
  height: number,
  diameter: number,
  thickness: number,
  sideAngle: number,
  lengthUnit: LengthUnit
): VesselMetrics {
  const heightMm = Math.max(1, toMillimeters(height, lengthUnit));
  const diameterMm = Math.max(1, toMillimeters(diameter, lengthUnit));
  const rawThicknessMm = Math.max(0, toMillimeters(thickness, lengthUnit));

  const outerBottomRadiusMm = diameterMm / 2;
  const taperAngleDeg = Math.max(0, 90 - sideAngle);
  const taperAngleRad = (taperAngleDeg * Math.PI) / 180;
  const taperOffsetMm = heightMm * Math.tan(taperAngleRad);
  const outerTopRadiusRawMm = outerBottomRadiusMm - taperOffsetMm;
  const outerTopRadiusMm = Math.max(0, outerTopRadiusRawMm);

  const maxWallMm = outerBottomRadiusMm * 0.95;
  const minWallMm = Math.max(outerBottomRadiusMm * 0.04, 1);
  const wallThicknessMm = Math.min(Math.max(rawThicknessMm, minWallMm), maxWallMm);
  const clampedThickness = Math.abs(wallThicknessMm - rawThicknessMm) > 0.5;

  const innerBottomRadiusMm = Math.max(outerBottomRadiusMm - wallThicknessMm, 0);
  const innerTopRadiusMm = Math.max(outerTopRadiusMm - wallThicknessMm, 0);

  return {
    heightMm,
    outerBottomRadiusMm,
    outerTopRadiusMm,
    innerBottomRadiusMm,
    innerTopRadiusMm,
    wallThicknessMm,
    topOpeningMm: outerTopRadiusMm * 2,
    bottomFootprintMm: outerBottomRadiusMm * 2,
    clampedThickness,
  };
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function formatPolygon(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
}

function SawSetupDiagram({
  miterGauge,
  miterGaugeComplement,
  bladeTilt,
  miterGaugeLimit,
  setMiterGaugeLimit,
}: {
  miterGauge: number;
  miterGaugeComplement: number;
  bladeTilt: number;
  miterGaugeLimit: number;
  setMiterGaugeLimit: (value: number) => void;
}) {
  const topSize = 220;
  const center = topSize / 2;
  const gaugeRadius = topSize * 0.34;
  const baseAngle = 180;
  const limit = Math.max(45, Math.min(60, Math.round(miterGaugeLimit / 5) * 5));
  const gaugeSpan = limit;
  const clampSpan = (value: number) => Math.max(-limit, Math.min(limit, value));
  const useComplement = miterGauge > limit;
  const rawValue = useComplement ? miterGaugeComplement : -miterGauge;
  const displayValue = clampSpan(rawValue);
  const gaugeTicks = Array.from({ length: (gaugeSpan * 2) / 5 + 1 }, (_, idx) => -gaugeSpan + idx * 5);
  const pointerAngle = baseAngle - displayValue;
  const pointerOuterRadius = gaugeRadius + 36;
  const pointerInner = polarToCartesian(center, center, gaugeRadius - 12, pointerAngle);
  const pointerOuter = polarToCartesian(center, center, pointerOuterRadius, pointerAngle);
  const primaryLabel = `${miterGauge.toFixed(1)}°`;
  const complementLabel = `${miterGaugeComplement >= 0 ? '+' : ''}${miterGaugeComplement.toFixed(1)}°`;

  const bevelWidth = 240;
  const bevelHeight = 160;
  const bevelRadius = Math.min(bevelWidth, bevelHeight) * 0.38;
  const pivotX = bevelWidth * 0.22;
  const pivotY = bevelHeight * 0.76;
  const clampedTilt = Math.max(0, Math.min(60, bladeTilt));
  const bevelTicks = Array.from({ length: 13 }, (_, idx) => idx * 5);
  const bevelPointerAngle = 90 - clampedTilt;
  const bevelPointerInner = polarToCartesian(pivotX, pivotY, bevelRadius - 12, bevelPointerAngle);
  const bevelPointerOuter = polarToCartesian(pivotX, pivotY, bevelRadius + 44, bevelPointerAngle);
  const bevelLabel = polarToCartesian(pivotX, pivotY, bevelRadius + 58, bevelPointerAngle);

  return (
    <div className="grid gap-6 rounded-xl border border-white/5 bg-slate-950/60 p-6 text-slate-200 shadow-inner shadow-slate-900/60">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">Miter Gauge γ</p>
          <div className="text-right leading-tight">
            <p className="text-sm font-semibold text-sky-100">γ {primaryLabel}</p>
            <p className="text-xs font-medium text-sky-200">Complement {complementLabel}</p>
          </div>
        </div>

        {/* Miter Gauge Limit Slider */}
        <div className="space-y-2 rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 pt-3 pb-1 mb-0">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="miterGaugeLimit" className="text-xs font-medium text-slate-300">
              Miter gauge limit
            </Label>
            <span className="text-sm font-semibold text-slate-200">
              {miterGaugeLimit}°
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">45°</span>
            <Slider
              id="miterGaugeLimit"
              min={45}
              max={60}
              step={5}
              value={[miterGaugeLimit]}
              onValueChange={([value]) => setMiterGaugeLimit(value)}
              className="flex-1"
            />
            <span className="text-xs text-slate-400 font-medium">60°</span>
          </div>
          <p className="text-xs text-slate-400">
            Maximum travel of your saw&apos;s miter gauge. Auto-switches to complement when exceeded.
          </p>
        </div>

        <svg viewBox="0 97 220 123" className="w-full" preserveAspectRatio="xMidYMin meet">
          {gaugeTicks.map((tickAngle) => {
            const actualAngle = baseAngle - tickAngle;
            const isMajor = tickAngle % 15 === 0;
            const inner = polarToCartesian(center, center, gaugeRadius - (isMajor ? 12 : 7), actualAngle);
            const outer = polarToCartesian(center, center, gaugeRadius + (isMajor ? 16 : 9), actualAngle);
            const labelPos = polarToCartesian(center, center, gaugeRadius + 30, actualAngle);
            return (
              <g key={`tick-${tickAngle}`}>
                <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#cbd5f5" strokeWidth={isMajor ? 2 : 1} />
                {isMajor && (
                  <text x={labelPos.x} y={labelPos.y} className="text-[9px] fill-sky-200" textAnchor="middle" dominantBaseline="middle">
                    {tickAngle > 0 ? `+${tickAngle}` : tickAngle}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={pointerInner.x} y1={pointerInner.y} x2={pointerOuter.x} y2={pointerOuter.y} stroke="#38bdf8" strokeWidth={4} strokeLinecap="round" />
        </svg>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/90">Blade Tilt β</p>
          <p className="text-sm font-medium text-amber-100">{bladeTilt.toFixed(1)}°</p>
        </div>
        <svg viewBox={`0 0 ${bevelWidth} ${bevelHeight}`} className="w-full">
          {bevelTicks.map((tick) => {
            const isMajor = tick % 10 === 0;
            const tickAngle = 90 - tick;
            const inner = polarToCartesian(pivotX, pivotY, bevelRadius - (isMajor ? 16 : 10), tickAngle);
            const outer = polarToCartesian(pivotX, pivotY, bevelRadius + (isMajor ? 20 : 11), tickAngle);
            const labelPos = polarToCartesian(pivotX, pivotY, bevelRadius + 32, tickAngle);
            return (
              <g key={`bevel-${tick}`}>
                <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#fde68a" strokeWidth={isMajor ? 2 : 1} />
                {isMajor && (
                  <text x={labelPos.x} y={labelPos.y} className="text-[9px] fill-amber-100" textAnchor="middle" dominantBaseline="middle">
                    {tick}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={bevelPointerInner.x} y1={bevelPointerInner.y} x2={bevelPointerOuter.x} y2={bevelPointerOuter.y} stroke="#fbbf24" strokeWidth={4} strokeLinecap="round" />
          <text x={bevelLabel.x} y={bevelLabel.y} className="text-[10px] fill-slate-200" textAnchor="middle" dominantBaseline="middle">
            β {clampedTilt.toFixed(1)}°
          </text>
        </svg>
      </div>
    </div>
  );
}

function TopViewDiagram({ metrics, sides }: { metrics: VesselMetrics; sides: number }) {
  const size = 260;
  const center = size / 2;
  const margin = 28;
  const maxRadius = Math.max(
    metrics.outerTopRadiusMm,
    metrics.outerBottomRadiusMm,
    metrics.innerTopRadiusMm,
    metrics.innerBottomRadiusMm,
    1
  );
  const scale = (center - margin) / maxRadius;

  const pointFor = (index: number, radiusMm: number) => {
    const angle = ((index / sides) * Math.PI * 2) - Math.PI / 2;
    const radius = radiusMm * scale;
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  };

  const polygonPoints = (radiusMm: number) => {
    if (radiusMm <= 0) return null;
    const points = Array.from({ length: sides }, (_, idx) => pointFor(idx, radiusMm));
    return formatPolygon(points);
  };

  const outerTop = polygonPoints(metrics.outerTopRadiusMm);
  const outerBottom = polygonPoints(metrics.outerBottomRadiusMm);
  const innerTop = polygonPoints(metrics.innerTopRadiusMm);

  const highlightRadiusMm = metrics.outerTopRadiusMm > 0 ? metrics.outerTopRadiusMm : metrics.outerBottomRadiusMm;
  const highlightPoints = highlightRadiusMm > 0
    ? [
        { x: center, y: center },
        pointFor(0, highlightRadiusMm),
        pointFor(1, highlightRadiusMm),
      ]
    : null;

  const wedge = highlightPoints ? `M ${highlightPoints[0].x.toFixed(2)} ${highlightPoints[0].y.toFixed(2)} L ${highlightPoints[1].x.toFixed(2)} ${highlightPoints[1].y.toFixed(2)} L ${highlightPoints[2].x.toFixed(2)} ${highlightPoints[2].y.toFixed(2)} Z` : null;
  const segmentAngle = 360 / sides;

  return (
    <div className="space-y-3 rounded-xl border border-white/5 bg-slate-950/60 p-4 text-slate-200 shadow-inner shadow-slate-900/60">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300/90">Top Opening</p>
        <p className="text-sm font-medium text-emerald-100">{Math.round(metrics.topOpeningMm).toLocaleString()} mm</p>
      </div>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full">
        <rect x={0} y={0} width={size} height={size} fill="#020617" rx={16} />
        {outerBottom && (
          <polygon points={outerBottom} fill="none" stroke="#64748b" strokeDasharray="8 6" strokeWidth={2} opacity={0.6} />
        )}
        {wedge && (
          <path d={wedge} fill="#064e3b" opacity={0.28} />
        )}
        {outerTop && (
          <polygon points={outerTop} fill="#047857" opacity={0.2} stroke="#10b981" strokeWidth={2.4} />
        )}
        {innerTop && (
          <polygon points={innerTop} fill="#020617" stroke="#34d399" strokeWidth={1.6} opacity={0.9} />
        )}
        <text x={center} y={center + 4} textAnchor="middle" className="text-[22px] font-semibold fill-emerald-200">
          {sides}
        </text>
        <text x={center} y={center + 24} textAnchor="middle" className="text-[11px] fill-slate-300 tracking-widest uppercase">
          segments
        </text>
        <text x={center + 42} y={center - 52} className="text-[10px] fill-emerald-100">
          {segmentAngle.toFixed(1)}° per segment
        </text>
      </svg>
      <p className="text-xs text-slate-400">
        Solid line shows the top opening, dashed outline indicates the footprint. Interior ring displays wall thickness.
      </p>
    </div>
  );
}

function ProfileDiagram({ metrics }: { metrics: VesselMetrics }) {
  const width = 280;
  const height = 240;
  const margin = 28;
  const maxWidthMm = Math.max(metrics.outerBottomRadiusMm, metrics.outerTopRadiusMm) * 2 || 1;
  const scale = Math.min(
    (width - margin * 2) / maxWidthMm,
    (height - margin * 2) / Math.max(metrics.heightMm, 1)
  );

  const cx = width / 2;
  const bottomY = height - margin;
  const topY = bottomY - metrics.heightMm * scale;
  const outerBottomX = metrics.outerBottomRadiusMm * scale;
  const outerTopX = metrics.outerTopRadiusMm * scale;
  const innerBottomX = Math.min(metrics.innerBottomRadiusMm * scale, outerBottomX - scale * 0.5);
  const innerTopX = Math.min(metrics.innerTopRadiusMm * scale, Math.max(outerTopX - scale * 0.5, 0));

  const baseThicknessMm = Math.min(metrics.wallThicknessMm * 1.25, metrics.heightMm * 0.35);
  const innerBottomY = bottomY - baseThicknessMm * scale;
  const lipDropMm = Math.min(metrics.wallThicknessMm * 0.35, metrics.heightMm * 0.2);
  let innerTopY = topY + lipDropMm * scale;
  if (innerBottomY - innerTopY < 12) {
    innerTopY = innerBottomY - 12;
  }
  if (innerTopY < topY + 2) {
    innerTopY = topY + 2;
  }

  const outerPath = `M ${(cx - outerTopX).toFixed(2)} ${topY.toFixed(2)} L ${(cx + outerTopX).toFixed(2)} ${topY.toFixed(2)} L ${(cx + outerBottomX).toFixed(2)} ${bottomY.toFixed(2)} L ${(cx - outerBottomX).toFixed(2)} ${bottomY.toFixed(2)} Z`;
  const innerPath = innerBottomX > 0
    ? `M ${(cx - innerTopX).toFixed(2)} ${innerTopY.toFixed(2)} L ${(cx + innerTopX).toFixed(2)} ${innerTopY.toFixed(2)} L ${(cx + innerBottomX).toFixed(2)} ${innerBottomY.toFixed(2)} L ${(cx - innerBottomX).toFixed(2)} ${innerBottomY.toFixed(2)} Z`
    : null;

  const measurementX = Math.max(18, cx + outerBottomX + 26);
  const heightMidY = (topY + bottomY) / 2;
  const widthTextY = bottomY + 24;
  const topTextY = topY - 12;

  return (
    <div className="space-y-3 rounded-xl border border-white/5 bg-slate-950/60 p-4 text-slate-200 shadow-inner shadow-slate-900/60">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-300/90">Profile</p>
        <p className="text-sm font-medium text-indigo-100">Height {Math.round(metrics.heightMm).toLocaleString()} mm</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <rect x={0} y={0} width={width} height={height} fill="#020617" rx={16} />
        <path d={outerPath} fill="#1d2537" stroke="#475569" strokeWidth={2.4} />
        {innerPath && <path d={innerPath} fill="#020617" stroke="#38bdf8" strokeWidth={1.8} opacity={0.9} />}
        <line x1={cx - outerBottomX} y1={bottomY} x2={cx + outerBottomX} y2={bottomY} stroke="#94a3b8" strokeWidth={1.4} strokeDasharray="6 6" />
        <line x1={cx - outerTopX} y1={topY} x2={cx + outerTopX} y2={topY} stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="4 6" />

        <line x1={measurementX} y1={topY} x2={measurementX} y2={bottomY} stroke="#f472b6" strokeWidth={1.8} strokeDasharray="4 4" />
        <polygon points={`${measurementX - 6},${topY + 10} ${measurementX},${topY} ${measurementX + 6},${topY + 10}`} fill="#f472b6" />
        <polygon points={`${measurementX - 6},${bottomY - 10} ${measurementX},${bottomY} ${measurementX + 6},${bottomY - 10}`} fill="#f472b6" />

        <line x1={cx - outerBottomX} y1={widthTextY - 6} x2={cx + outerBottomX} y2={widthTextY - 6} stroke="#22d3ee" strokeWidth={1.6} strokeDasharray="5 6" />
        <line x1={cx - outerTopX} y1={topTextY + 4} x2={cx + outerTopX} y2={topTextY + 4} stroke="#a855f7" strokeWidth={1.4} strokeDasharray="5 6" />

        <text x={measurementX + 10} y={heightMidY} className="text-[11px] font-semibold fill-rose-200" transform={`rotate(-90 ${measurementX + 10} ${heightMidY})`}>
          Height {Math.round(metrics.heightMm).toLocaleString()} mm
        </text>
        <text x={cx} y={widthTextY} textAnchor="middle" className="text-[11px] font-semibold fill-cyan-200">
          Footprint {Math.round(metrics.bottomFootprintMm).toLocaleString()} mm
        </text>
        <text x={cx} y={topTextY} textAnchor="middle" className="text-[11px] font-semibold fill-fuchsia-200">
          Opening {Math.round(metrics.topOpeningMm).toLocaleString()} mm
        </text>

        {innerPath && (
          <>
            <line x1={cx + innerBottomX} y1={heightMidY} x2={cx + outerBottomX} y2={heightMidY} stroke="#38bdf8" strokeWidth={2} />
            <text x={cx + (innerBottomX + outerBottomX) / 2} y={heightMidY - 6} textAnchor="middle" className="text-[10px] fill-sky-200">
              Wall {Math.round(metrics.wallThicknessMm).toLocaleString()} mm
            </text>
          </>
        )}
      </svg>
      <p className="text-xs text-slate-400">
        Exterior silhouette is shaded. Interior cavity shows estimated wall thickness with a thicker base pad for stability.
      </p>
    </div>
  );
}

export function Visualization3D() {
  const {
    numberOfSides,
    sideAngle,
    height,
    diameter,
    thickness,
    lengthUnit,
    miterGaugeLimit,
    setMiterGaugeLimit,
  } = useCalculatorStore();

  const metrics = useMemo(
    () => computeVesselMetrics(height, diameter, thickness, sideAngle, lengthUnit),
    [height, diameter, thickness, sideAngle, lengthUnit]
  );

  const angles = useMemo(
    () => calculateAngles(numberOfSides, sideAngle),
    [numberOfSides, sideAngle]
  );

  const unitLabel = getUnitLabel(lengthUnit);
  const heightDisplay = formatNumber(fromMillimeters(metrics.heightMm, lengthUnit), 2);
  const footprintDisplay = formatNumber(fromMillimeters(metrics.bottomFootprintMm, lengthUnit), 2);
  const topOpeningDisplay = formatNumber(fromMillimeters(metrics.topOpeningMm, lengthUnit), 2);
  const thicknessDisplay = formatNumber(fromMillimeters(metrics.wallThicknessMm, lengthUnit), 2);

  return (
    <Card className="w-full overflow-hidden border border-slate-800/60 bg-slate-950/80">
      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Saw Setup Reference</h3>
            <p className="mt-2 text-sm text-slate-300">
              Match both diagrams to set your saw: rotate the miter gauge to γ and tilt the blade to β. Values update instantly as you adjust inputs.
            </p>
          </div>
          <SawSetupDiagram
            miterGauge={angles.miterGauge}
            miterGaugeComplement={angles.miterGaugeComplement}
            bladeTilt={angles.bladeTilt}
            miterGaugeLimit={miterGaugeLimit}
            setMiterGaugeLimit={setMiterGaugeLimit}
          />
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Bowl Preview</h3>
            <p className="mt-2 text-sm text-slate-300">
              Visual comparison of the top opening, footprint, and wall thickness so you can scale stacked rings or mix-and-match diameters.
            </p>
          </div>
          <TopViewDiagram metrics={metrics} sides={numberOfSides} />
          <ProfileDiagram metrics={metrics} />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 border-t border-slate-800/60 bg-slate-900/60 px-6 py-4 text-slate-200">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Project Summary</p>
          <p className="text-sm">
            {heightDisplay} {unitLabel} tall · {footprintDisplay} {unitLabel} footprint · {topOpeningDisplay} {unitLabel} opening
          </p>
          <p className="text-xs text-slate-300">
            Wall {thicknessDisplay} {unitLabel} · Blade tilt β {angles.bladeTilt.toFixed(1)}° · Miter γ {angles.miterGauge.toFixed(1)}°
          </p>
          {metrics.clampedThickness && (
            <p className="text-[10px] text-rose-300">
              Thickness was nudged to keep the visualization realistic.
            </p>
          )}
        </div>
        <div className="ml-auto space-y-1 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Inputs</p>
          <p className="text-sm">
            {numberOfSides} sides · {formatNumber(height, 2)} × {formatNumber(diameter, 2)} × {formatNumber(thickness, 2)} {unitLabel}
          </p>
          <p className="text-xs text-slate-300">
            Side angle α {formatNumber(sideAngle, 1)}°
          </p>
        </div>
      </div>
    </Card>
  );
}
