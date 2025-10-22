'use client';

import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
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

// Isometric projection: converts 3D coordinates (x, y, z) to 2D screen coordinates
// y-axis points up, x and z form the horizontal plane
function isoProject(x: number, y: number, z: number) {
  const cos30 = Math.sqrt(3) / 2; // ≈ 0.866
  const sin30 = 0.5;
  return {
    x: (x - z) * cos30,
    y: -y + (x + z) * sin30,
  };
}

function SawSetupDiagram({
  miterGauge,
  miterGaugeComplement,
  bladeTilt,
  miterGaugeLimit,
}: {
  miterGauge: number;
  miterGaugeComplement: number;
  bladeTilt: number;
  miterGaugeLimit: number;
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/90">Miter Gauge γ</p>
          <div className="text-right leading-tight">
            <p className="text-sm font-semibold text-sky-100">γ {primaryLabel}</p>
            <p className="text-xs font-medium text-sky-200">Complement {complementLabel}</p>
          </div>
        </div>
        <svg viewBox={`0 0 ${topSize} ${topSize}`} className="w-full">
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

function IsometricBowlDiagram({ metrics, sides }: { metrics: VesselMetrics; sides: number }) {
  const width = 320;
  const height = 280;
  const scale = 0.65; // Scale factor for the bowl geometry

  // Center the view
  const centerX = width / 2;
  const centerY = height * 0.58;

  // Generate polygon points at a given height and radius
  const getPolygonPoints3D = (radiusMm: number, heightMm: number, sides: number) => {
    const points = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radiusMm * scale;
      const z = Math.sin(angle) * radiusMm * scale;
      const projected = isoProject(x, heightMm * scale, z);
      points.push({
        x: centerX + projected.x,
        y: centerY + projected.y,
      });
    }
    return points;
  };

  // Create points for outer surface at bottom and top
  const outerBottom = getPolygonPoints3D(metrics.outerBottomRadiusMm, 0, sides);
  const outerTop = getPolygonPoints3D(metrics.outerTopRadiusMm, metrics.heightMm, sides);
  const innerBottom = getPolygonPoints3D(metrics.innerBottomRadiusMm, 0, sides);
  const innerTop = getPolygonPoints3D(metrics.innerTopRadiusMm, metrics.heightMm, sides);

  // Generate individual segment faces for the outer surface
  const outerSegments = [];
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    // Each segment is a quad: bottom-left, bottom-right, top-right, top-left
    const points = [
      outerBottom[i],
      outerBottom[next],
      outerTop[next],
      outerTop[i],
    ];

    // Calculate if this face is front-facing (simple visibility check)
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const normalAngle = angle + Math.PI / 2;
    // Faces pointing toward viewer (roughly -45° to 135° range) are front-facing
    const isFrontFacing = normalAngle > -Math.PI * 0.75 && normalAngle < Math.PI * 0.75;

    outerSegments.push({
      points,
      isFrontFacing,
      angle: normalAngle,
    });
  }

  // Generate inner cavity segments
  const innerSegments = [];
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    const points = [
      innerBottom[i],
      innerBottom[next],
      innerTop[next],
      innerTop[i],
    ];

    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const normalAngle = angle - Math.PI / 2; // Inner faces point inward
    const isFrontFacing = normalAngle > -Math.PI * 0.75 && normalAngle < Math.PI * 0.75;

    innerSegments.push({
      points,
      isFrontFacing,
      angle: normalAngle,
    });
  }

  // Top rim (connecting outer and inner top)
  const topRimSegments = [];
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    const points = [
      innerTop[i],
      innerTop[next],
      outerTop[next],
      outerTop[i],
    ];
    topRimSegments.push({ points });
  }

  // Bottom surface (flat base connecting outer and inner bottom)
  const bottomSegments = [];
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    const points = [
      outerBottom[i],
      outerBottom[next],
      innerBottom[next],
      innerBottom[i],
    ];
    bottomSegments.push({ points });
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/5 bg-slate-950/60 p-4 text-slate-200 shadow-inner shadow-slate-900/60">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300/90">Isometric View</p>
        <p className="text-sm font-medium text-emerald-100">{sides} Segments</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          {/* Gradient for outer surface - lighter on front faces */}
          <linearGradient id="outerGradientFront" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#047857" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#065f46" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="outerGradientBack" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#064e3b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#052e16" stopOpacity="0.6" />
          </linearGradient>
          {/* Gradient for inner cavity */}
          <linearGradient id="innerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
          </linearGradient>
          {/* Gradient for top rim */}
          <linearGradient id="topRimGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.7" />
          </linearGradient>
          {/* Gradient for bottom surface */}
          <linearGradient id="bottomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#334155" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        <rect x={0} y={0} width={width} height={height} fill="#020617" rx={16} />

        {/* Draw back-facing outer segments first (painter's algorithm) */}
        {outerSegments
          .filter(seg => !seg.isFrontFacing)
          .map((seg, idx) => (
            <polygon
              key={`outer-back-${idx}`}
              points={formatPolygon(seg.points)}
              fill="url(#outerGradientBack)"
              stroke="#065f46"
              strokeWidth={0.8}
              opacity={0.6}
            />
          ))}

        {/* Draw bottom surface (flat base) */}
        {bottomSegments.map((seg, idx) => (
          <polygon
            key={`bottom-${idx}`}
            points={formatPolygon(seg.points)}
            fill="url(#bottomGradient)"
            stroke="#64748b"
            strokeWidth={0.8}
            opacity={0.85}
          />
        ))}

        {/* Draw inner cavity segments */}
        {innerSegments.map((seg, idx) => (
          <polygon
            key={`inner-${idx}`}
            points={formatPolygon(seg.points)}
            fill="url(#innerGradient)"
            stroke="#334155"
            strokeWidth={0.6}
            opacity={0.85}
          />
        ))}

        {/* Draw top rim */}
        {topRimSegments.map((seg, idx) => (
          <polygon
            key={`rim-${idx}`}
            points={formatPolygon(seg.points)}
            fill="url(#topRimGradient)"
            stroke="#10b981"
            strokeWidth={1.2}
            opacity={0.9}
          />
        ))}

        {/* Draw front-facing outer segments last */}
        {outerSegments
          .filter(seg => seg.isFrontFacing)
          .map((seg, idx) => (
            <polygon
              key={`outer-front-${idx}`}
              points={formatPolygon(seg.points)}
              fill="url(#outerGradientFront)"
              stroke="#10b981"
              strokeWidth={1.2}
              opacity={0.85}
            />
          ))}

        {/* Highlight one segment for reference */}
        {outerSegments[0] && (
          <polygon
            points={formatPolygon(outerSegments[0].points)}
            fill="none"
            stroke="#34d399"
            strokeWidth={2}
            strokeDasharray="4 3"
            opacity={0.8}
          />
        )}

        {/* Top opening outline for clarity */}
        <polygon
          points={formatPolygon(outerTop)}
          fill="none"
          stroke="#10b981"
          strokeWidth={1.8}
          opacity={0.7}
        />

        {/* Labels */}
        <text
          x={width / 2}
          y={height - 20}
          textAnchor="middle"
          className="text-[11px] fill-slate-300"
        >
          {metrics.heightMm.toFixed(0)}mm tall × {metrics.bottomFootprintMm.toFixed(0)}mm base
        </text>
      </svg>
      <p className="text-xs text-slate-400">
        Isometric view shows the bowl&apos;s 3D form with {sides} segments. Highlighted segment shows individual piece geometry.
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
          />
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Bowl Preview</h3>
            <p className="mt-2 text-sm text-slate-300">
              3D visualization shows how segments stack together to form the bowl, with wall thickness and taper angle clearly visible.
            </p>
          </div>
          <IsometricBowlDiagram metrics={metrics} sides={numberOfSides} />
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
