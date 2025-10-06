'use client';

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Line, Text } from '@react-three/drei';
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
  height: number;
  thickness: number;
  sideAngle: number;
  bladeTilt: number;
  miterGauge: number;
  showMaterial: boolean;
  labels: {
    height: string;
    thickness: string;
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
  height,
  thickness,
  sideAngle,
  bladeTilt,
  miterGauge,
  showMaterial,
  labels,
  textRotation,
}: SideElevationProps) {
  const boardHeight = Math.max(height, 0.01);
  const boardThickness = Math.max(thickness, 0.01);

  const boardShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, boardHeight);
    shape.lineTo(boardThickness, boardHeight);
    shape.lineTo(boardThickness, 0);
    shape.closePath();
    return shape;
  }, [boardHeight, boardThickness]);

  const heightOffset = boardThickness * 0.6 + 0.3;
  const thicknessOffset = Math.max(boardHeight * 0.08, 0.3);
  const clampedBladeTilt = Math.min(Math.max(bladeTilt, 0.01), 89.9);
  const clampedSideAngle = Math.min(Math.max(sideAngle, 0.01), 89.9);
  const bladeTiltRad = THREE.MathUtils.degToRad(clampedBladeTilt);
  const sideAngleRad = THREE.MathUtils.degToRad(clampedSideAngle);

  const bladeGuideLength = Math.min(boardHeight, boardThickness) * 1.5 + 0.15;
  const bladeOrigin = useMemo(
    () => new THREE.Vector3(boardThickness, boardHeight, 0),
    [boardThickness, boardHeight]
  );
  const bladeGuideEnd = useMemo(
    () => new THREE.Vector3(
      boardThickness - Math.sin(bladeTiltRad) * bladeGuideLength,
      boardHeight - Math.cos(bladeTiltRad) * bladeGuideLength,
      0
    ),
    [boardThickness, boardHeight, bladeGuideLength, bladeTiltRad]
  );

  const bladeArc = useMemo(() => {
    if (bladeTilt <= 0.01) return null;
    const radius = Math.min(boardThickness, boardHeight) * 0.35;
    return createAngleArc2D(
      bladeOrigin.clone(),
      Math.max(radius, 0.08),
      Math.PI / 2,
      Math.PI / 2 + bladeTiltRad,
      0xfacc15
    );
  }, [bladeOrigin, boardThickness, boardHeight, bladeTilt, bladeTiltRad]);

  const pitchBase = Math.min(boardThickness * 1.6, boardHeight * 0.8);
  const pitchHeight = Math.tan(sideAngleRad) * pitchBase;
  const pitchStart = useMemo(
    () => new THREE.Vector3(boardThickness + 0.4, 0, 0),
    [boardThickness]
  );
  const pitchEnd = useMemo(
    () => new THREE.Vector3(pitchStart.x + pitchBase, pitchHeight, 0),
    [pitchStart, pitchBase, pitchHeight]
  );
  const pitchBaseEnd = useMemo(
    () => new THREE.Vector3(pitchStart.x + pitchBase, 0, 0),
    [pitchStart, pitchBase]
  );

  const pitchArc = useMemo(() => {
    if (sideAngle <= 0.01) return null;
    const radius = Math.max(Math.min(pitchBase, pitchHeight) * 0.5, 0.08);
    return createAngleArc2D(pitchStart.clone(), radius, 0, sideAngleRad, 0x38bdf8);
  }, [pitchStart, pitchBase, pitchHeight, sideAngle, sideAngleRad]);

  const annotationX = boardThickness + Math.max(pitchBase, boardThickness) + 0.7;
  const annotationFont = Math.max(boardHeight * 0.065, 0.055);
  const annotationSpacing = annotationFont * 1.3;

  const verticalColor = '#2563eb';
  const horizontalColor = '#10b981';

  return (
    <group>
      {showMaterial && (
        <mesh position={[0, 0, -0.001]}>
          <shapeGeometry args={[boardShape]} />
          <meshBasicMaterial
            color="#2563eb"
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Outer faces */}
      <Line
        points={[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, boardHeight, 0)]}
        color={verticalColor}
        lineWidth={3}
      />
      <Line
        points={[
          new THREE.Vector3(boardThickness, 0, 0),
          new THREE.Vector3(boardThickness, boardHeight, 0),
        ]}
        color={verticalColor}
        lineWidth={3}
      />

      {/* Reference baseline */}
      <Line
        points={[
          new THREE.Vector3(-boardThickness * 0.4, 0, 0),
          new THREE.Vector3(boardThickness * 1.9, 0, 0),
        ]}
        color="#475569"
        lineWidth={1}
        dashed
        dashSize={0.05}
        gapSize={0.04}
      />

      {/* Height dimension */}
      <Line
        points={[
          new THREE.Vector3(-heightOffset, 0, 0),
          new THREE.Vector3(-heightOffset, boardHeight, 0),
        ]}
        color={verticalColor}
        lineWidth={1}
        dashed
        dashSize={0.05}
        gapSize={0.05}
      />
      <Line
        points={[
          new THREE.Vector3(-heightOffset - 0.09, 0, 0),
          new THREE.Vector3(-heightOffset + 0.09, 0, 0),
        ]}
        color={verticalColor}
        lineWidth={1.5}
      />
      <Line
        points={[
          new THREE.Vector3(-heightOffset - 0.09, boardHeight, 0),
          new THREE.Vector3(-heightOffset + 0.09, boardHeight, 0),
        ]}
        color={verticalColor}
        lineWidth={1.5}
      />
      <Text
        position={[-heightOffset - 0.12, boardHeight / 2, 0]}
        fontSize={Math.max(boardHeight * 0.075, 0.07)}
        color={verticalColor}
        anchorX="right"
        anchorY="middle"
        rotation={textRotation}
      >
        Height {labels.height}
      </Text>

      {/* Thickness dimension */}
      <Line
        points={[
          new THREE.Vector3(0, -thicknessOffset, 0),
          new THREE.Vector3(boardThickness, -thicknessOffset, 0),
        ]}
        color={horizontalColor}
        lineWidth={1}
        dashed
        dashSize={0.05}
        gapSize={0.05}
      />
      <Line
        points={[
          new THREE.Vector3(0, -thicknessOffset - 0.08, 0),
          new THREE.Vector3(0, -thicknessOffset + 0.08, 0),
        ]}
        color={horizontalColor}
        lineWidth={1.5}
      />
      <Line
        points={[
          new THREE.Vector3(boardThickness, -thicknessOffset - 0.08, 0),
          new THREE.Vector3(boardThickness, -thicknessOffset + 0.08, 0),
        ]}
        color={horizontalColor}
        lineWidth={1.5}
      />
      <Text
        position={[boardThickness / 2, -thicknessOffset - 0.18, 0]}
        fontSize={Math.max(boardHeight * 0.07, 0.065)}
        color={horizontalColor}
        anchorX="center"
        anchorY="top"
        rotation={textRotation}
      >
        Thickness {labels.thickness}
      </Text>

      {/* Blade tilt guide */}
      {bladeTilt > 0.01 && (
        <>
          <Line
            points={[bladeOrigin, bladeGuideEnd]}
            color="#facc15"
            lineWidth={1.5}
          />
          {bladeArc && <primitive object={bladeArc} />}
          <Text
            position={[
              bladeOrigin.x - Math.cos(bladeTiltRad) * (Math.min(boardThickness, boardHeight) * 0.45),
              bladeOrigin.y - Math.sin(bladeTiltRad) * (Math.min(boardThickness, boardHeight) * 0.35),
              0,
            ]}
            fontSize={Math.max(boardHeight * 0.065, 0.06)}
            color="#facc15"
            anchorX="right"
            anchorY="bottom"
            rotation={textRotation}
          >
            β {bladeTilt.toFixed(1)}°
          </Text>
        </>
      )}

      {/* Side pitch reference */}
      {sideAngle > 0.01 && (
        <>
          <Line
            points={[pitchStart, pitchEnd]}
            color="#38bdf8"
            lineWidth={1.5}
          />
          <Line
            points={[pitchStart, pitchBaseEnd]}
            color="#38bdf8"
            lineWidth={1}
            dashed
            dashSize={0.05}
            gapSize={0.05}
          />
          {pitchArc && <primitive object={pitchArc} />}
          <Text
            position={[
              pitchStart.x + Math.max(pitchBase, 0.4) * 0.55,
              Math.max(pitchHeight, boardHeight * 0.05) + 0.05,
              0,
            ]}
            fontSize={Math.max(boardHeight * 0.06, 0.055)}
            color="#38bdf8"
            anchorX="center"
            anchorY="bottom"
            rotation={textRotation}
          >
            α {sideAngle.toFixed(1)}°
          </Text>
        </>
      )}

      {/* Angle summary */}
      <group position={[annotationX, boardHeight, 0]}>
        <Text
          position={[0, 0, 0]}
          fontSize={annotationFont * 1.1}
          color="#e2e8f0"
          anchorX="left"
          anchorY="top"
          rotation={textRotation}
        >
          Saw Setup
        </Text>
        <Text
          position={[0, -annotationSpacing, 0]}
          fontSize={annotationFont}
          color="#facc15"
          anchorX="left"
          anchorY="top"
          rotation={textRotation}
        >
          β Blade Tilt {bladeTilt.toFixed(1)}°
        </Text>
        <Text
          position={[0, -annotationSpacing * 2, 0]}
          fontSize={annotationFont}
          color="#38bdf8"
          anchorX="left"
          anchorY="top"
          rotation={textRotation}
        >
          α Side Pitch {sideAngle.toFixed(1)}°
        </Text>
        <Text
          position={[0, -annotationSpacing * 3, 0]}
          fontSize={annotationFont}
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
  const [viewMode, setViewMode] = React.useState<'side' | 'top' | '3d'>('side');
  const [isHorizontalFlip, setIsHorizontalFlip] = React.useState(false);
  const [isVerticalFlip, setIsVerticalFlip] = React.useState(false);

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

  return (
    <Card className="w-full h-[500px] md:h-[600px] relative">
      <div className="absolute top-4 right-4 z-10 flex flex-wrap items-center justify-end gap-3">
        <fieldset className="flex gap-1 rounded-md border border-border bg-background/80 p-1 backdrop-blur">
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
                className={`cursor-pointer rounded px-2 py-1 text-xs font-medium transition ${
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
        >
          Show Material
        </Button>
        <Button
          variant={isHorizontalFlip ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsHorizontalFlip(!isHorizontalFlip)}
        >
          Flip Horizontal
        </Button>
        <Button
          variant={isVerticalFlip ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsVerticalFlip(!isVerticalFlip)}
        >
          Flip Vertical
        </Button>
      </div>

      <Canvas
        orthographic={viewMode !== '3d'}
        camera={{
          position: cameraPosition,
          zoom: viewMode === '3d' ? 50 : 80,
          near: 0.1,
          far: 1000,
        }}
      >
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />

        <group rotation={rotation}>
          {viewMode === '3d' ? (
            <PolygonShape3D
              numberOfSides={numberOfSides}
              diameter={scaledDiameter}
              height={scaledHeight}
              sideAngle={sideAngle}
              thickness={scaledThickness}
              showMaterial={showMaterial}
            />
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
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={10}
          enableRotate={viewMode === '3d'}
        />

        <axesHelper args={[1.5]} />
      </Canvas>

      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 p-2 rounded backdrop-blur-sm">
        {viewHelperMessage}
      </div>

      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/80 p-2 rounded backdrop-blur-sm">
        <div className="flex flex-wrap gap-3">
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
