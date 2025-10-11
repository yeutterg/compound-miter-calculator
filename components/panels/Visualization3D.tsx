'use client';

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Line, Text, Billboard } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useCalculatorStore } from '@/lib/store';
import { calculateAngles } from '@/lib/calculations/angles';
import { toMillimeters, formatNumber, getUnitLabel } from '@/lib/utils/unitConversions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface PolygonShapeProps {
  numberOfSides: number;
  diameter: number;
  height: number;
  sideAngle: number;
  thickness: number;
  showMaterial: boolean;
}

interface SideElevationProps {
  diameter: number;
  height: number;
  thickness: number;
  sideAngle: number;
  bladeTilt: number;
  miterGauge: number;
  showMaterial: boolean;
  labels: {
    height: string;
    thickness: string;
    diameter: string;
  };
  textRotation: [number, number, number];
}

function createAngleArc2D(
  origin: THREE.Vector3,
  radius: number,
  startAngle: number,
  endAngle: number,
  color: THREE.ColorRepresentation,
) {
  const curve = new THREE.EllipseCurve(
    origin.x,
    origin.y,
    radius,
    radius,
    startAngle,
    endAngle,
    false,
    0
  );

  const points = curve
    .getPoints(48)
    .map(point => new THREE.Vector3(point.x, point.y, origin.z));

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color });

  return new THREE.Line(geometry, material);
}

function buildPolygonPoints(sides: number, radius: number, y: number) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

function buildPlanLoop(sides: number, radius: number) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    points.push(new THREE.Vector3(x, y, 0));
  }
  return points;
}

// Side elevation / saw reference view
function SideElevationView({
  diameter,
  height,
  thickness,
  sideAngle,
  bladeTilt,
  miterGauge,
  showMaterial,
  labels,
  textRotation,
}: SideElevationProps) {
  const wallHeight = Math.max(height, 0.01);
  const halfWidth = Math.max(diameter / 2, 0.2);
  const taperAngle = Math.max(0.01, 90 - sideAngle);
  const taperAngleRad = THREE.MathUtils.degToRad(taperAngle);
  const horizontalOffset = wallHeight * Math.tan(taperAngleRad);
  const topHalfWidth = Math.max(halfWidth - horizontalOffset, halfWidth * 0.2);

  const innerOffsetX = thickness * Math.sin(taperAngleRad);
  const innerOffsetY = thickness * Math.cos(taperAngleRad);

  const outerPoints = useMemo(() => ([
    new THREE.Vector3(-halfWidth, -wallHeight / 2, 0),
    new THREE.Vector3(-topHalfWidth, wallHeight / 2, 0),
    new THREE.Vector3(topHalfWidth, wallHeight / 2, 0),
    new THREE.Vector3(halfWidth, -wallHeight / 2, 0),
  ]), [halfWidth, topHalfWidth, wallHeight]);

  const innerPoints = useMemo(() => {
    if (thickness <= 0) return null;
    return [
      new THREE.Vector3(-halfWidth + innerOffsetX, -wallHeight / 2 + innerOffsetY, 0),
      new THREE.Vector3(-topHalfWidth + innerOffsetX, wallHeight / 2 - innerOffsetY, 0),
      new THREE.Vector3(topHalfWidth - innerOffsetX, wallHeight / 2 - innerOffsetY, 0),
      new THREE.Vector3(halfWidth - innerOffsetX, -wallHeight / 2 + innerOffsetY, 0),
    ];
  }, [halfWidth, topHalfWidth, wallHeight, innerOffsetX, innerOffsetY, thickness]);

  const dashedHeightX = -halfWidth - Math.max(halfWidth * 0.25, 0.4);
  const dashedWidthY = -wallHeight / 2 - Math.max(halfWidth * 0.12, 0.35);

  const clampedBladeTilt = Math.min(Math.max(bladeTilt, 0.01), 89.9);
  const bladeTiltRad = THREE.MathUtils.degToRad(clampedBladeTilt);

  const bottomLeft = outerPoints[0];
  const topLeft = outerPoints[1];
  const topRight = outerPoints[2];
  const bottomRight = outerPoints[3];

  const bladeOrigin = useMemo(() => bottomRight.clone(), [bottomRight]);
  const bevelLength = Math.max(Math.min(wallHeight * 0.5, halfWidth * 0.7), 0.25);
  const bevelEnd = useMemo(() => bladeOrigin.clone().add(new THREE.Vector3(
    Math.cos(bladeTiltRad) * bevelLength,
    Math.sin(bladeTiltRad) * bevelLength,
    0,
  )), [bladeOrigin, bladeTiltRad, bevelLength]);

  const bladeArc = useMemo(() => {
    if (bladeTilt <= 0.01) return null;
    const radius = Math.max(Math.min(bevelLength * 0.65, wallHeight * 0.35), 0.08);
    return createAngleArc2D(
      bladeOrigin.clone(),
      radius,
      0,
      bladeTiltRad,
      0xfacc15
    );
  }, [bladeOrigin, bladeTilt, bladeTiltRad, bevelLength, wallHeight]);

  const pitchArc = useMemo(() => {
    if (sideAngle <= 0.01) return null;
    const radius = Math.max(Math.min(halfWidth * 0.45, wallHeight * 0.35), 0.12);
    return createAngleArc2D(
      bottomRight.clone(),
      radius,
      0,
      THREE.MathUtils.degToRad(sideAngle),
      0x38bdf8
    );
  }, [bottomRight, halfWidth, wallHeight, sideAngle]);

  const annotationX = halfWidth + Math.max(halfWidth * 0.6, 0.6);
  const annotationFont = Math.max(wallHeight * 0.08, 0.07);
  const annotationSpacing = annotationFont * 1.25;

  return (
    <group>
      {/* Outer shell */}
      <Line points={[bottomLeft, topLeft]} color="#2563eb" lineWidth={3} />
      <Line points={[topLeft, topRight]} color="#2563eb" lineWidth={2} dashed dashSize={0.05} gapSize={0.04} />
      <Line points={[topRight, bottomRight]} color="#2563eb" lineWidth={3} />
      <Line points={[bottomRight, bottomLeft]} color="#2563eb" lineWidth={2} />

      {/* Inner shell */}
      {showMaterial && innerPoints && (
        <>
          <Line points={[innerPoints[0], innerPoints[1]]} color="#10b981" lineWidth={2} />
          <Line points={[innerPoints[1], innerPoints[2]]} color="#10b981" lineWidth={1.8} />
          <Line points={[innerPoints[2], innerPoints[3]]} color="#10b981" lineWidth={2} />
          <Line points={[innerPoints[3], innerPoints[0]]} color="#10b981" lineWidth={1.8} />
        </>
      )}

      {/* Height dimension */}
      <Line
        points={[
          new THREE.Vector3(dashedHeightX, -wallHeight / 2, 0),
          new THREE.Vector3(dashedHeightX, wallHeight / 2, 0),
        ]}
        color="#475569"
        lineWidth={1}
        dashed
        dashSize={0.06}
        gapSize={0.05}
      />
      <Line
        points={[
          new THREE.Vector3(dashedHeightX - 0.1, -wallHeight / 2, 0),
          new THREE.Vector3(dashedHeightX + 0.1, -wallHeight / 2, 0),
        ]}
        color="#475569"
        lineWidth={1.3}
      />
      <Line
        points={[
          new THREE.Vector3(dashedHeightX - 0.1, wallHeight / 2, 0),
          new THREE.Vector3(dashedHeightX + 0.1, wallHeight / 2, 0),
        ]}
        color="#475569"
        lineWidth={1.3}
      />
      <Text
        position={[dashedHeightX - 0.15, 0, 0]}
        fontSize={annotationFont}
        color="#e2e8f0"
        anchorX="right"
        anchorY="middle"
        rotation={textRotation}
      >
        Height {labels.height}
      </Text>

      {/* Width/diameter dimension */}
      <Line
        points={[
          new THREE.Vector3(-halfWidth, dashedWidthY, 0),
          new THREE.Vector3(halfWidth, dashedWidthY, 0),
        ]}
        color="#94a3b8"
        lineWidth={1}
        dashed
        dashSize={0.06}
        gapSize={0.05}
      />
      <Line
        points={[
          new THREE.Vector3(-halfWidth, dashedWidthY - 0.08, 0),
          new THREE.Vector3(-halfWidth, dashedWidthY + 0.08, 0),
        ]}
        color="#94a3b8"
        lineWidth={1.1}
      />
      <Line
        points={[
          new THREE.Vector3(halfWidth, dashedWidthY - 0.08, 0),
          new THREE.Vector3(halfWidth, dashedWidthY + 0.08, 0),
        ]}
        color="#94a3b8"
        lineWidth={1.1}
      />
      <Text
        position={[0, dashedWidthY - 0.2, 0]}
        fontSize={annotationFont}
        color="#e2e8f0"
        anchorX="center"
        anchorY="top"
        rotation={textRotation}
      >
        Diameter {labels.diameter}
      </Text>

      {/* Wall thickness indicator */}
      {showMaterial && innerPoints && (
        <>
          <Line points={[bottomLeft, innerPoints[0]]} color="#10b981" lineWidth={1.2} />
          <Text
            position={[bottomLeft.x + (innerPoints[0].x - bottomLeft.x) / 2, bottomLeft.y - 0.18, 0]}
            fontSize={annotationFont * 0.8}
            color="#10b981"
            anchorX="center"
            anchorY="top"
            rotation={textRotation}
          >
            Wall {labels.thickness}
          </Text>
        </>
      )}

      {/* Side pitch */}
      {pitchArc && (
        <>
          <primitive object={pitchArc} />
          <Line points={[bottomRight, topRight]} color="#38bdf8" lineWidth={1.2} />
          <Line
            points={[bottomRight, new THREE.Vector3(bottomRight.x + Math.max(halfWidth * 0.6, 0.45), bottomRight.y, 0)]}
            color="#38bdf8"
            lineWidth={1.2}
            dashed
            dashSize={0.05}
            gapSize={0.05}
          />
          <Text
            position={[bottomRight.x + Math.max(halfWidth * 0.4, 0.4), bottomRight.y + Math.max(wallHeight * 0.25, 0.25), 0]}
            fontSize={annotationFont * 0.85}
            color="#38bdf8"
            anchorX="left"
            anchorY="bottom"
            rotation={textRotation}
          >
            α {sideAngle.toFixed(1)}°
          </Text>
        </>
      )}

      {/* Blade tilt */}
      {bladeArc && (
        <>
          <primitive object={bladeArc} />
          <Line points={[bladeOrigin, bevelEnd]} color="#facc15" lineWidth={1.2} />
          <Line
            points={[bladeOrigin, bladeOrigin.clone().add(new THREE.Vector3(Math.max(halfWidth * 0.55, 0.4), 0, 0))]}
            color="#facc15"
            lineWidth={1.2}
            dashed
            dashSize={0.05}
            gapSize={0.05}
          />
          <Text
            position={[bladeOrigin.x + Math.max(halfWidth * 0.45, 0.35), bladeOrigin.y + Math.max(wallHeight * 0.18, 0.18), 0]}
            fontSize={annotationFont * 0.8}
            color="#facc15"
            anchorX="left"
            anchorY="bottom"
            rotation={textRotation}
          >
            β {bladeTilt.toFixed(1)}°
          </Text>
        </>
      )}

      {/* Summary */}
      <group position={[annotationX, wallHeight / 2, 0]}>
        <Text
          position={[0, 0, 0]}
          fontSize={annotationFont}
          color="#e2e8f0"
          anchorX="left"
          anchorY="top"
          rotation={textRotation}
        >
          Saw Setup
        </Text>
        <Text
          position={[0, -annotationSpacing, 0]}
          fontSize={annotationFont * 0.9}
          color="#facc15"
          anchorX="left"
          anchorY="top"
          rotation={textRotation}
        >
          β Blade Tilt {bladeTilt.toFixed(1)}°
        </Text>
        <Text
          position={[0, -annotationSpacing * 2, 0]}
          fontSize={annotationFont * 0.9}
          color="#38bdf8"
          anchorX="left"
          anchorY="top"
          rotation={textRotation}
        >
          α Side Pitch {sideAngle.toFixed(1)}°
        </Text>
        <Text
          position={[0, -annotationSpacing * 3, 0]}
          fontSize={annotationFont * 0.9}
          color="#c7d2fe"
          anchorX="left"
          anchorY="top"
          rotation={textRotation}
        >
          γ Miter Gauge {miterGauge.toFixed(1)}°
        </Text>
      </group>
    </group>
  );
}

interface TopPlanViewProps {
  numberOfSides: number;
  diameter: number;
  thickness: number;
  showMaterial: boolean;
  textRotation: [number, number, number];
  labels: {
    diameter: string;
    thickness: string;
  };
}

function TopPlanView({
  numberOfSides,
  diameter,
  thickness,
  showMaterial,
  textRotation,
  labels,
}: TopPlanViewProps) {
  const outerRadius = Math.max(diameter / 2, 0.1);
  const innerRadius = Math.max(outerRadius - thickness, outerRadius * 0.2);

  const outerLoop = useMemo(
    () => buildPlanLoop(numberOfSides, outerRadius),
    [numberOfSides, outerRadius]
  );
  const innerLoop = useMemo(() => {
    if (thickness <= 0) return null;
    return buildPlanLoop(numberOfSides, innerRadius);
  }, [numberOfSides, innerRadius, thickness]);

  const outerEdges = useMemo(() => {
    const lines: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < numberOfSides; i++) {
      const next = (i + 1) % numberOfSides;
      lines.push([outerLoop[i], outerLoop[next]]);
    }
    return lines;
  }, [outerLoop, numberOfSides]);

  const innerEdges = useMemo(() => {
    if (!innerLoop) return [];
    const lines: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < numberOfSides; i++) {
      const next = (i + 1) % numberOfSides;
      lines.push([innerLoop[i], innerLoop[next]]);
    }
    return lines;
  }, [innerLoop, numberOfSides]);

  const outerShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(outerLoop[0].x, outerLoop[0].y);
    for (let i = 1; i < outerLoop.length; i++) {
      shape.lineTo(outerLoop[i].x, outerLoop[i].y);
    }
    shape.closePath();
    if (innerLoop) {
      const hole = new THREE.Path();
      hole.moveTo(innerLoop[0].x, innerLoop[0].y);
      for (let i = 1; i < innerLoop.length; i++) {
        hole.lineTo(innerLoop[i].x, innerLoop[i].y);
      }
      hole.closePath();
      shape.holes.push(hole);
    }
    return shape;
  }, [outerLoop, innerLoop]);

  const diameterOffset = outerRadius * 0.2 + 0.3;
  const wallGuideOffset = Math.max(outerRadius * 0.08 + 0.15, 0.25);

  return (
    <group>
      <mesh position={[0, 0, -0.001]}>
        <shapeGeometry args={[outerShape]} />
        <meshBasicMaterial
          color="#2563eb"
          transparent
          opacity={showMaterial ? 0.18 : 0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {outerEdges.map((edge, i) => (
        <Line
          key={`outer-top-${i}`}
          points={[edge[0], edge[1]]}
          color="#2563eb"
          lineWidth={2.5}
        />
      ))}

      {showMaterial && thickness > 0 && innerEdges.map((edge, i) => (
        <Line
          key={`inner-top-${i}`}
          points={[edge[0], edge[1]]}
          color="#10b981"
          lineWidth={1.5}
        />
      ))}

      {/* Reference axes */}
      <Line
        points={[
          new THREE.Vector3(-outerRadius * 1.2, 0, 0),
          new THREE.Vector3(outerRadius * 1.2, 0, 0),
        ]}
        color="#475569"
        lineWidth={0.8}
        dashed
        dashSize={0.05}
        gapSize={0.05}
      />
      <Line
        points={[
          new THREE.Vector3(0, -outerRadius * 1.2, 0),
          new THREE.Vector3(0, outerRadius * 1.2, 0),
        ]}
        color="#475569"
        lineWidth={0.8}
        dashed
        dashSize={0.05}
        gapSize={0.05}
      />

      {/* Diameter annotation */}
      <Line
        points={[
          new THREE.Vector3(-outerRadius, -diameterOffset, 0),
          new THREE.Vector3(outerRadius, -diameterOffset, 0),
        ]}
        color="#94a3b8"
        lineWidth={1}
        dashed
        dashSize={0.05}
        gapSize={0.05}
      />
      <Line
        points={[
          new THREE.Vector3(-outerRadius, -diameterOffset - 0.08, 0),
          new THREE.Vector3(-outerRadius, -diameterOffset + 0.08, 0),
        ]}
        color="#94a3b8"
        lineWidth={1.2}
      />
      <Line
        points={[
          new THREE.Vector3(outerRadius, -diameterOffset - 0.08, 0),
          new THREE.Vector3(outerRadius, -diameterOffset + 0.08, 0),
        ]}
        color="#94a3b8"
        lineWidth={1.2}
      />
      <Text
        position={[0, -diameterOffset - 0.2, 0]}
        fontSize={Math.max(outerRadius * 0.14, 0.07)}
        color="#e2e8f0"
        anchorX="center"
        anchorY="top"
        rotation={textRotation}
      >
        Diameter {labels.diameter}
      </Text>

      {showMaterial && thickness > 0 && (
        <>
          <Line
            points={[
              new THREE.Vector3(-outerRadius, wallGuideOffset, 0),
              new THREE.Vector3(-innerRadius, wallGuideOffset, 0),
            ]}
            color="#10b981"
            lineWidth={1}
          />
          <Line
            points={[
              new THREE.Vector3(-outerRadius, wallGuideOffset - 0.07, 0),
              new THREE.Vector3(-outerRadius, wallGuideOffset + 0.07, 0),
            ]}
            color="#10b981"
            lineWidth={1}
          />
          <Line
            points={[
              new THREE.Vector3(-innerRadius, wallGuideOffset - 0.07, 0),
              new THREE.Vector3(-innerRadius, wallGuideOffset + 0.07, 0),
            ]}
            color="#10b981"
            lineWidth={1}
          />
          <Text
            position={[
              -outerRadius + (outerRadius - innerRadius) / 2,
              wallGuideOffset + 0.12,
              0,
            ]}
            fontSize={Math.max(outerRadius * 0.11, 0.06)}
            color="#10b981"
            anchorX="center"
            anchorY="bottom"
            rotation={textRotation}
          >
            Wall {labels.thickness}
          </Text>
        </>
      )}

      <Text
        position={[0, outerRadius * 1.35, 0]}
        fontSize={Math.max(outerRadius * 0.12, 0.06)}
        color="#e2e8f0"
        anchorX="center"
        anchorY="bottom"
        rotation={textRotation}
      >
        Top View
      </Text>
    </group>
  );
}

interface AngleAnnotations3DProps {
  diameter: number;
  height: number;
  sideAngle: number;
  bladeTilt: number;
  miterGauge: number;
}

function AngleAnnotations3D({
  diameter,
  height,
  sideAngle,
  bladeTilt,
  miterGauge,
}: AngleAnnotations3DProps) {
  const outerRadius = Math.max(diameter / 2, 0.1);
  const taperAngle = Math.max(0, 90 - sideAngle);
  const taperOffset = height * Math.tan(THREE.MathUtils.degToRad(taperAngle));
  const outerRadiusTop = Math.max(outerRadius - Math.min(taperOffset, outerRadius * 0.45), outerRadius * 0.4);
  const bottomY = -height / 2;
  const topY = height / 2;

  const sideAngleRad = THREE.MathUtils.degToRad(sideAngle);
  const miterGaugeRad = THREE.MathUtils.degToRad(Math.max(miterGauge, 0));

  const alphaArcPoints = useMemo(() => {
    const radius = Math.max(Math.min(outerRadius * 0.45, height * 0.4), 0.12);
    const center = new THREE.Vector3(outerRadius, bottomY, 0);
    const pts: THREE.Vector3[] = [];
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const t = sideAngleRad * (i / steps);
      pts.push(new THREE.Vector3(
        center.x + Math.cos(t) * radius,
        center.y + Math.sin(t) * radius,
        center.z,
      ));
    }
    return { center, points: pts, radius };
  }, [outerRadius, bottomY, height, sideAngleRad]);

  const gammaArcPoints = useMemo(() => {
    const radius = Math.max(outerRadius * 0.6, 0.2);
    const center = new THREE.Vector3(0, bottomY, 0);
    const pts: THREE.Vector3[] = [];
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const t = miterGaugeRad * (i / steps);
      pts.push(new THREE.Vector3(
        center.x + Math.cos(t) * radius,
        center.y,
        center.z + Math.sin(t) * radius,
      ));
    }
    return { center, points: pts, radius };
  }, [outerRadius, bottomY, miterGaugeRad]);

  const topSlopePoint = useMemo(() => (
    new THREE.Vector3(outerRadiusTop, topY, 0)
  ), [outerRadiusTop, topY]);

  const bottomSlopePoint = useMemo(() => (
    new THREE.Vector3(outerRadius, bottomY, 0)
  ), [outerRadius, bottomY]);

  const gammaEnd = useMemo(() => (
    gammaArcPoints.center.clone().add(new THREE.Vector3(
      Math.cos(miterGaugeRad) * gammaArcPoints.radius,
      0,
      Math.sin(miterGaugeRad) * gammaArcPoints.radius,
    ))
  ), [gammaArcPoints, miterGaugeRad]);

  return (
    <group>
      {/* Side angle α */}
      <Line points={alphaArcPoints.points} color="#38bdf8" lineWidth={1.5} />
      <Line
        points={[alphaArcPoints.center, alphaArcPoints.center.clone().add(new THREE.Vector3(alphaArcPoints.radius * 1.15, 0, 0))]}
        color="#38bdf8"
        lineWidth={1.2}
        dashed
        dashSize={0.05}
        gapSize={0.05}
      />
      <Line points={[bottomSlopePoint, topSlopePoint]} color="#38bdf8" lineWidth={1.3} />
      <Billboard position={alphaArcPoints.center.clone().add(new THREE.Vector3(alphaArcPoints.radius * 0.8, alphaArcPoints.radius * 0.65, 0))} follow={false} lockX lockY lockZ>
        <Text fontSize={Math.max(height * 0.04, 0.04)} color="#38bdf8" anchorX="center" anchorY="middle">
          α {sideAngle.toFixed(1)}°
        </Text>
      </Billboard>

      {/* Miter gauge γ */}
      <Line points={gammaArcPoints.points} color="#c7d2fe" lineWidth={1.5} />
      <Line
        points={[gammaArcPoints.center, gammaArcPoints.center.clone().add(new THREE.Vector3(gammaArcPoints.radius * 1.1, 0, 0))]}
        color="#c7d2fe"
        lineWidth={1.2}
        dashed
        dashSize={0.05}
        gapSize={0.05}
      />
      <Line points={[gammaArcPoints.center, gammaEnd]} color="#c7d2fe" lineWidth={1.2} />
      <Billboard position={gammaArcPoints.center.clone().add(new THREE.Vector3(gammaArcPoints.radius * 0.65, 0, gammaArcPoints.radius * 0.45))} follow={false} lockX lockY lockZ>
        <Text fontSize={Math.max(height * 0.04, 0.04)} color="#c7d2fe" anchorX="center" anchorY="middle">
          γ {miterGauge.toFixed(1)}°
        </Text>
      </Billboard>

      {/* Blade tilt β label */}
      <Billboard position={[0, topY + Math.max(height * 0.15, 0.2), 0]} follow={false} lockX lockY lockZ>
        <Text fontSize={Math.max(height * 0.045, 0.045)} color="#facc15" anchorX="center" anchorY="middle">
          β Blade Tilt {bladeTilt.toFixed(1)}°
        </Text>
      </Billboard>
    </group>
  );
}

// 3D polygon shape component
function PolygonShape3D({
  numberOfSides,
  diameter,
  height,
  sideAngle,
  thickness,
  showMaterial,
}: PolygonShapeProps) {
  const outerRadius = Math.max(diameter / 2, 0.1);
  const segmentAngle = Math.PI / numberOfSides;

  const outerApothemBottom = outerRadius * Math.cos(segmentAngle);
  const innerApothemBottom = Math.max(outerApothemBottom - thickness, outerApothemBottom * 0.2);
  const innerRadiusBottom = Math.max(innerApothemBottom / Math.cos(segmentAngle), outerRadius * 0.2);

  const angleFromVertical = Math.max(90 - sideAngle, 0);
  const taperOffset = height * Math.tan((angleFromVertical * Math.PI) / 180);
  const maxTaper = outerRadius * 0.45;
  const clampedTaper = Math.min(taperOffset, maxTaper);
  const outerRadiusTop = Math.max(outerRadius - clampedTaper, outerRadius * 0.4);

  const outerApothemTop = outerRadiusTop * Math.cos(segmentAngle);
  const innerApothemTop = Math.max(outerApothemTop - thickness, outerApothemTop * 0.2);
  const innerRadiusTop = Math.max(innerApothemTop / Math.cos(segmentAngle), outerRadiusTop * 0.2);

  const outerBottom = useMemo(
    () => buildPolygonPoints(numberOfSides, outerRadius, -height / 2),
    [numberOfSides, outerRadius, height]
  );
  const outerTop = useMemo(
    () => buildPolygonPoints(numberOfSides, outerRadiusTop, height / 2),
    [numberOfSides, outerRadiusTop, height]
  );

  const innerBottom = useMemo(() => {
    if (thickness <= 0) return null;
    return buildPolygonPoints(numberOfSides, innerRadiusBottom, -height / 2);
  }, [numberOfSides, innerRadiusBottom, height, thickness]);

  const innerTop = useMemo(() => {
    if (thickness <= 0) return null;
    return buildPolygonPoints(numberOfSides, innerRadiusTop, height / 2);
  }, [numberOfSides, innerRadiusTop, height, thickness]);

  const outerEdges = useMemo(() => {
    const lines: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < numberOfSides; i++) {
      const next = (i + 1) % numberOfSides;
      lines.push([outerBottom[i], outerBottom[next]]);
      lines.push([outerTop[i], outerTop[next]]);
      lines.push([outerBottom[i], outerTop[i]]);
    }
    return lines;
  }, [outerBottom, outerTop, numberOfSides]);

  const innerEdges = useMemo(() => {
    if (!innerBottom || !innerTop) return [];
    const lines: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < numberOfSides; i++) {
      const next = (i + 1) % numberOfSides;
      lines.push([innerBottom[i], innerBottom[next]]);
      lines.push([innerTop[i], innerTop[next]]);
      lines.push([innerBottom[i], innerTop[i]]);
      lines.push([outerBottom[i], innerBottom[i]]);
      lines.push([outerTop[i], innerTop[i]]);
    }
    return lines;
  }, [outerBottom, outerTop, innerBottom, innerTop, numberOfSides]);

  return (
    <group>
      {outerEdges.map((edge, i) => (
        <Line
          key={`outer-${i}`}
          points={[edge[0], edge[1]]}
          color="#2563eb"
          lineWidth={2}
        />
      ))}

      {thickness > 0 && innerEdges.map((edge, i) => (
        <Line
          key={`inner-${i}`}
          points={[edge[0], edge[1]]}
          color={showMaterial ? '#10b981' : '#64748b'}
          lineWidth={showMaterial ? 2 : 1}
          dashed={!showMaterial}
          dashSize={0.04}
          gapSize={0.04}
        />
      ))}
    </group>
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
  } = useCalculatorStore();

  const [showMaterial, setShowMaterial] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'side' | 'top' | '3d'>('3d');
  const [isHorizontalFlip, setIsHorizontalFlip] = React.useState(false);
  const [isVerticalFlip, setIsVerticalFlip] = React.useState(false);
  const [canvasKey, setCanvasKey] = React.useState(0);
  const [zoom, setZoom] = React.useState(60);
  const controlsRef = React.useRef<OrbitControlsImpl | null>(null);

  const unitLabel = getUnitLabel(lengthUnit);
  const measurementLabels = useMemo(() => ({
    height: `${formatNumber(height, 2)} ${unitLabel}`,
    thickness: `${formatNumber(Math.max(thickness, 0), 2)} ${unitLabel}`,
    diameter: `${formatNumber(Math.max(diameter, 0), 2)} ${unitLabel}`,
  }), [height, thickness, diameter, unitLabel]);

  const angles = useMemo(
    () => calculateAngles(numberOfSides, sideAngle),
    [numberOfSides, sideAngle]
  );

  // Normalize scale for visualization (convert to mm and scale down)
  const heightMm = toMillimeters(height, lengthUnit);
  const diameterMm = toMillimeters(diameter, lengthUnit);
  const thicknessMm = toMillimeters(thickness, lengthUnit);

  const scale = 1 / Math.max(heightMm, diameterMm, thicknessMm * 4, 100);
  const scaledHeight = heightMm * scale;
  const scaledDiameter = diameterMm * scale;
  const scaledThickness = thicknessMm * scale;

  // Camera settings based on view mode
  const cameraPosition: [number, number, number] = viewMode === '3d'
    ? [3, 3, 3]
    : [0, 0, 5];

  // Use zoom state instead of fixed value
  const cameraZoom = viewMode === '3d' ? zoom * 0.833 : zoom;

  const rotation: [number, number, number] = [
    isVerticalFlip ? Math.PI : 0,
    isHorizontalFlip ? Math.PI : 0,
    0,
  ];
  const textRotation: [number, number, number] = [
    rotation[0] ? -rotation[0] : 0,
    rotation[1] ? -rotation[1] : 0,
    rotation[2] ? -rotation[2] : 0,
  ];

  const viewHelperMessage = viewMode === '3d'
    ? 'Drag to rotate • Scroll to zoom • Double-click to reset'
    : viewMode === 'top'
      ? 'Top View • Scroll to zoom • Switch views above'
      : 'Side Elevation View • Scroll to zoom • Switch views above';

  const handleResetView = React.useCallback(() => {
    setShowMaterial(false);
    setIsHorizontalFlip(false);
    setIsVerticalFlip(false);
    setViewMode('3d');
    setZoom(60);
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
    setCanvasKey(key => key + 1);
  }, []);

  return (
    <Card className="w-full h-[400px] sm:h-[500px] md:h-[600px] relative">
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex flex-wrap items-center justify-end gap-1.5 sm:gap-3">
        <fieldset className="flex gap-0.5 sm:gap-1 rounded-md border border-border bg-background/80 p-0.5 sm:p-1 backdrop-blur">
          <legend className="sr-only">View Mode</legend>
          {([
            { key: 'side', label: 'Side' },
            { key: 'top', label: 'Top' },
            { key: '3d', label: '3D' },
          ] as const).map(option => {
            const active = viewMode === option.key;
            return (
              <Label
                key={option.key}
                className={`cursor-pointer rounded px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium transition ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background/70 text-muted-foreground hover:bg-muted'
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name="view-mode"
                  value={option.key}
                  checked={active}
                  onChange={() => setViewMode(option.key)}
                />
                {option.label}
              </Label>
            );
          })}
        </fieldset>
        <Button
          variant={showMaterial ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowMaterial(!showMaterial)}
          className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-2 h-auto"
        >
          <span className="hidden sm:inline">Show Material</span>
          <span className="sm:hidden">Material</span>
        </Button>
        <Button
          variant={isHorizontalFlip ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsHorizontalFlip(!isHorizontalFlip)}
          className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-2 h-auto"
        >
          <span className="hidden sm:inline">Flip Horizontal</span>
          <span className="sm:hidden">Flip H</span>
        </Button>
        <Button
          variant={isVerticalFlip ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsVerticalFlip(!isVerticalFlip)}
          className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-2 h-auto"
        >
          <span className="hidden sm:inline">Flip Vertical</span>
          <span className="sm:hidden">Flip V</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetView}
          className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-2 h-auto"
        >
          Reset
        </Button>
      </div>

      {/* Zoom Control */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2 bg-background/80 p-2 rounded backdrop-blur-sm">
        <Label className="text-xs font-medium">Zoom</Label>
        <input
          type="range"
          min="10"
          max="200"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="slider-vertical"
          style={{
            width: '24px',
            height: '200px',
            transform: 'rotate(270deg)',
            transformOrigin: 'center'
          } as React.CSSProperties}
        />
        <span className="text-xs text-muted-foreground font-medium">{Math.round(zoom)}%</span>
      </div>

      <Canvas
        key={`${canvasKey}-${viewMode}`}
        orthographic={viewMode !== '3d'}
        camera={{
          position: cameraPosition,
          zoom: cameraZoom,
          near: 0.1,
          far: 1000,
        }}
      >
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />

        <group rotation={rotation}>
          {viewMode === '3d' ? (
            <>
              <PolygonShape3D
                numberOfSides={numberOfSides}
                diameter={scaledDiameter}
                height={scaledHeight}
                sideAngle={sideAngle}
                thickness={scaledThickness}
                showMaterial={showMaterial}
              />
              <AngleAnnotations3D
                diameter={scaledDiameter}
                height={scaledHeight}
                sideAngle={sideAngle}
                bladeTilt={angles.bladeTilt}
                miterGauge={angles.miterGauge}
              />
            </>
          ) : viewMode === 'top' ? (
            <TopPlanView
              numberOfSides={numberOfSides}
              diameter={scaledDiameter}
              thickness={scaledThickness}
              showMaterial={showMaterial}
              textRotation={textRotation}
              labels={{
                diameter: measurementLabels.diameter,
                thickness: measurementLabels.thickness,
              }}
            />
          ) : (
            <SideElevationView
              diameter={scaledDiameter}
              height={scaledHeight}
              sideAngle={sideAngle}
              thickness={scaledThickness}
              bladeTilt={angles.bladeTilt}
              miterGauge={angles.miterGauge}
              showMaterial={showMaterial}
              labels={measurementLabels}
              textRotation={textRotation}
            />
          )}
        </group>

        <Grid
          args={[10, 10]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#374151"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#4b5563"
          fadeDistance={25}
          fadeStrength={1}
          infiniteGrid
          position={[0, 0, 0]}
        />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={0.1}
          maxDistance={120}
          minZoom={0.05}
          maxZoom={500}
          zoomSpeed={0.75}
          enableRotate={viewMode === '3d'}
        />

        <axesHelper args={[1.5]} />
      </Canvas>

      <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 text-[10px] sm:text-xs text-muted-foreground bg-background/80 p-1.5 sm:p-2 rounded backdrop-blur-sm">
        {viewHelperMessage}
      </div>

      <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 text-[10px] sm:text-xs text-muted-foreground bg-background/80 p-1.5 sm:p-2 rounded backdrop-blur-sm">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-blue-500"></div> Vertical reference
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-emerald-500"></div> Thickness reference
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-amber-400"></div> Blade tilt
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-sky-400"></div> Side pitch
          </span>
        </div>
      </div>
    </Card>
  );
}
