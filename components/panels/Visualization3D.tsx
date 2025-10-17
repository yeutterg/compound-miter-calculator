'use client';

import React, { useMemo, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Line, Text, Billboard, Edges } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useCalculatorStore } from '@/lib/store';
import { calculateAngles } from '@/lib/calculations/angles';
import { toMillimeters, formatNumber, getUnitLabel } from '@/lib/utils/unitConversions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// Camera controller component to update zoom dynamically
function CameraController({ zoom }: { zoom: number }) {
  const { camera } = useThree();

  useEffect(() => {
    if (camera) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
  }, [zoom, camera]);

  return null;
}

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
function useWoodTexture() {
  return React.useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#8c5930');
    gradient.addColorStop(0.5, '#b07941');
    gradient.addColorStop(1, '#d5b385');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const random = (Math.random() - 0.5) * 12;
      data[i] = Math.min(255, Math.max(0, data[i] + random));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + random * 0.6));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + random * 0.3));
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.MirroredRepeatWrapping;
    texture.repeat.set(2, 1);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

interface BoardMetrics {
  outerRadiusBottom: number;
  outerRadiusTop: number;
  innerRadiusBottom: number;
  innerRadiusTop: number;
  segmentAngle: number;
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
  // sideAngle is the angle FROM VERTICAL (90° = vertical, 45° = 45° lean inward from vertical)
  // To get horizontal offset: if the wall leans 45° from vertical, tan(45°) gives offset per unit height
  const sideAngleRad = THREE.MathUtils.degToRad(sideAngle);
  const horizontalOffset = wallHeight * Math.tan(sideAngleRad);
  const topHalfWidth = Math.max(halfWidth - horizontalOffset, halfWidth * 0.2);

  const innerOffsetX = thickness * Math.sin(sideAngleRad);
  const innerOffsetY = thickness * Math.cos(sideAngleRad);

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
    if (sideAngle >= 89.99) return null;
    const radius = Math.max(Math.min(halfWidth * 0.45, wallHeight * 0.35), 0.12);
    // Arc goes from vertical (π/2) down by sideAngle radians
    return createAngleArc2D(
      bottomRight.clone(),
      radius,
      Math.PI / 2, // Start from vertical (90°)
      Math.PI / 2 - THREE.MathUtils.degToRad(sideAngle), // End at sideAngle from vertical
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
            points={[bottomRight, new THREE.Vector3(bottomRight.x, bottomRight.y + wallHeight, 0)]}
            color="#38bdf8"
            lineWidth={1.2}
            dashed
            dashSize={0.05}
            gapSize={0.05}
          />
          <Text
            position={[bottomRight.x + Math.max(halfWidth * 0.15, 0.25), bottomRight.y + Math.max(wallHeight * 0.35, 0.25), 0]}
            fontSize={annotationFont * 0.85}
            color="#38bdf8"
            anchorX="left"
            anchorY="middle"
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

function createPolygonGeometry(
  bottom: THREE.Vector3[],
  top: THREE.Vector3[]
) {
  const positions: number[] = [];
  const indices: number[] = [];
  const vertexCount = bottom.length;

  bottom.forEach(point => {
    positions.push(point.x, point.y, point.z);
  });
  top.forEach(point => {
    positions.push(point.x, point.y, point.z);
  });

  const shape2D = bottom.map(point => new THREE.Vector2(point.x, point.z));
  const faces = THREE.ShapeUtils.triangulateShape(shape2D, []);

  faces.forEach(([a, b, c]) => {
    indices.push(c, b, a);
  });

  faces.forEach(([a, b, c]) => {
    indices.push(a + vertexCount, b + vertexCount, c + vertexCount);
  });

  for (let i = 0; i < vertexCount; i++) {
    const next = (i + 1) % vertexCount;
    indices.push(i, next, i + vertexCount);
    indices.push(next, next + vertexCount, i + vertexCount);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

interface Workpiece3DProps extends PolygonShapeProps {
  metrics: BoardMetrics;
  tableTopY: number;
}

function Workpiece3D({
  numberOfSides,
  height,
  thickness,
  showMaterial,
  metrics,
  tableTopY,
}: Workpiece3DProps) {
  const woodTexture = useWoodTexture();

  const outerBottom = useMemo(
    () => buildPolygonPoints(numberOfSides, metrics.outerRadiusBottom, tableTopY),
    [numberOfSides, metrics.outerRadiusBottom, tableTopY]
  );

  const outerTop = useMemo(
    () => buildPolygonPoints(numberOfSides, metrics.outerRadiusTop, tableTopY + height),
    [numberOfSides, metrics.outerRadiusTop, tableTopY, height]
  );

  const outerGeometry = useMemo(
    () => createPolygonGeometry(outerBottom, outerTop),
    [outerBottom, outerTop]
  );

  const innerGeometry = useMemo(() => {
    if (thickness <= 0) return null;
    const { innerRadiusBottom, innerRadiusTop } = metrics;
    if (innerRadiusBottom <= 0 || innerRadiusTop <= 0) return null;
    const bufferOffset = Math.min(height * 0.04, thickness * 0.75);
    const innerBottom = buildPolygonPoints(numberOfSides, innerRadiusBottom, tableTopY + bufferOffset);
    const innerTop = buildPolygonPoints(numberOfSides, innerRadiusTop, tableTopY + height - bufferOffset);
    return createPolygonGeometry(innerBottom, innerTop);
  }, [metrics, numberOfSides, tableTopY, height, thickness]);

  return (
    <group>
      <mesh
        geometry={outerGeometry}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#c99757"
          roughness={0.62}
          metalness={0.08}
          map={woodTexture ?? undefined}
        />
      </mesh>
      <Edges geometry={outerGeometry} threshold={20} />

      {showMaterial && innerGeometry && (
        <mesh geometry={innerGeometry}>
          <meshStandardMaterial
            color="#0f766e"
            roughness={0.45}
            metalness={0.1}
            transparent
            opacity={0.35}
          />
          <Edges geometry={innerGeometry} color="#0f766e" threshold={25} />
        </mesh>
      )}
    </group>
  );
}

interface CompoundAngleMarkersProps {
  metrics: BoardMetrics;
  height: number;
  sideAngle: number;
  bladeTilt: number;
  miterGauge: number;
  tableRadius: number;
  tableThickness: number;
}

function CompoundAngleMarkers({
  metrics,
  height,
  sideAngle,
  bladeTilt,
  miterGauge,
  tableRadius,
  tableThickness,
}: CompoundAngleMarkersProps) {
  const tableSurface = 0;
  const sideAngleRad = THREE.MathUtils.degToRad(sideAngle);
  const bladeTiltRad = THREE.MathUtils.degToRad(bladeTilt);
  const miterGaugeRad = THREE.MathUtils.degToRad(miterGauge);

  const alphaArc = useMemo(() => {
    const radius = Math.max(Math.min(metrics.outerRadiusBottom * 0.55, height * 0.55), 0.12);
    const pivot = new THREE.Vector3(metrics.outerRadiusBottom, tableSurface, 0);
    const points: THREE.Vector3[] = [];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = sideAngleRad * (i / steps);
      points.push(new THREE.Vector3(
        pivot.x + Math.cos(t) * radius,
        pivot.y + Math.sin(t) * radius,
        0,
      ));
    }
    const topPoint = new THREE.Vector3(metrics.outerRadiusTop, tableSurface + height, 0);
    return { points, pivot, topPoint, radius };
  }, [metrics.outerRadiusBottom, metrics.outerRadiusTop, sideAngleRad, height, tableSurface]);

  const miterArc = useMemo(() => {
    const radius = Math.max(tableRadius * 1.05, metrics.outerRadiusBottom * 1.3, 0.35);
    const y = tableSurface + Math.max(tableThickness * 0.08, 0.01);
    const points: THREE.Vector3[] = [];
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const t = miterGaugeRad * (i / steps);
      points.push(new THREE.Vector3(
        Math.sin(t) * radius,
        y,
        Math.cos(t) * radius,
      ));
    }
    const end = new THREE.Vector3(
      Math.sin(miterGaugeRad) * radius,
      y,
      Math.cos(miterGaugeRad) * radius,
    );
    return { points, y, radius, end };
  }, [miterGaugeRad, tableRadius, metrics.outerRadiusBottom, tableSurface, tableThickness]);

  const bladeArc = useMemo(() => {
    const pivot = new THREE.Vector3(0, tableSurface + height * 0.75, -tableRadius * 0.2);
    const radius = Math.max(height * 0.35, tableRadius * 0.5);
    const steps = 32;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = bladeTiltRad * (i / steps);
      points.push(new THREE.Vector3(
        pivot.x,
        pivot.y + Math.sin(t) * radius,
        pivot.z + Math.cos(t) * radius,
      ));
    }
    const end = new THREE.Vector3(
      pivot.x,
      pivot.y + Math.sin(bladeTiltRad) * radius,
      pivot.z + Math.cos(bladeTiltRad) * radius,
    );
    return { pivot, points, end, radius };
  }, [bladeTiltRad, height, tableRadius, tableSurface]);

  return (
    <group>
      <Line points={alphaArc.points} color="#38bdf8" lineWidth={1.7} />
      <Line
        points={[
          new THREE.Vector3(metrics.outerRadiusBottom, tableSurface, 0),
          alphaArc.topPoint,
        ]}
        color="#38bdf8"
        lineWidth={1.3}
      />
      <Billboard
        position={alphaArc.pivot.clone().add(new THREE.Vector3(alphaArc.radius * 0.65, alphaArc.radius * 0.6, 0))}
        follow={false}
        lockX
        lockY
        lockZ
      >
        <Text fontSize={Math.max(height * 0.045, 0.05)} color="#38bdf8" anchorX="center" anchorY="middle">
          α {sideAngle.toFixed(1)}°
        </Text>
      </Billboard>

      <Line points={miterArc.points} color="#c7d2fe" lineWidth={1.7} />
      <Line
        points={[
          new THREE.Vector3(0, miterArc.y, Math.max(tableRadius, 0.2)),
          miterArc.end,
        ]}
        color="#c7d2fe"
        lineWidth={1.1}
      />
      <Billboard
        position={new THREE.Vector3(miterArc.radius * 0.65 * Math.sin(miterGaugeRad * 0.6), miterArc.y + tableThickness * 0.6, miterArc.radius * 0.65 * Math.cos(miterGaugeRad * 0.6))}
        follow={false}
        lockX
        lockY
        lockZ
      >
        <Text fontSize={Math.max(height * 0.045, 0.05)} color="#c7d2fe" anchorX="center" anchorY="middle">
          γ {miterGauge.toFixed(1)}°
        </Text>
      </Billboard>

      <Line points={bladeArc.points} color="#facc15" lineWidth={1.6} />
      <Line
        points={[
          bladeArc.pivot,
          bladeArc.end,
        ]}
        color="#facc15"
        lineWidth={1.1}
      />
      <Billboard
        position={bladeArc.pivot.clone().add(new THREE.Vector3(0, bladeArc.radius * 0.75, bladeArc.radius * 0.45))}
        follow={false}
        lockX
        lockY
        lockZ
      >
        <Text fontSize={Math.max(height * 0.045, 0.05)} color="#facc15" anchorX="center" anchorY="middle">
          β {bladeTilt.toFixed(1)}°
        </Text>
      </Billboard>
    </group>
  );
}

interface SawAssemblyProps {
  tableRadius: number;
  tableThickness: number;
  baseHeight: number;
  bladeTiltRad: number;
  miterGaugeRad: number;
  boardHeight: number;
  children?: React.ReactNode;
}

function SawAssembly({
  tableRadius,
  tableThickness,
  baseHeight,
  bladeTiltRad,
  miterGaugeRad,
  boardHeight,
  children,
}: SawAssemblyProps) {
  const fenceThickness = Math.max(tableRadius * 0.08, 0.04);
  const fenceHeight = Math.max(boardHeight + tableThickness * 0.6, tableThickness * 6);
  const bladeRadius = Math.max(boardHeight * 0.7, tableRadius * 0.9, 0.35);
  const bladeThickness = Math.max(tableRadius * 0.1, 0.06);

  return (
    <group>
      <mesh position={[0, -tableThickness - baseHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[tableRadius * 3.2, baseHeight, tableRadius * 2.4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.25} />
      </mesh>
      <mesh position={[0, -tableThickness / 2, 0]} receiveShadow>
        <boxGeometry args={[tableRadius * 2.4, tableThickness, tableRadius * 2]} />
        <meshStandardMaterial color="#1f2937" roughness={0.55} metalness={0.22} />
      </mesh>
      <group rotation={[0, miterGaugeRad, 0]}>
        <mesh position={[0, -tableThickness / 2, 0]} receiveShadow>
          <cylinderGeometry args={[tableRadius, tableRadius, tableThickness, 64]} />
          <meshStandardMaterial color="#475569" roughness={0.45} metalness={0.5} />
        </mesh>
        <mesh position={[0, tableThickness / 2 + fenceHeight / 2, -tableRadius * 0.95]} receiveShadow>
          <boxGeometry args={[tableRadius * 2.05, fenceHeight, fenceThickness]} />
          <meshStandardMaterial color="#111827" roughness={0.5} metalness={0.2} />
        </mesh>

        {children}

        <group position={[0, tableThickness / 2 + boardHeight * 0.75, -tableRadius * 0.2]}>
          <group rotation={[0, 0, -bladeTiltRad]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[bladeRadius, bladeRadius, bladeThickness * 0.35, 48]} />
              <meshStandardMaterial color="#facc15" emissive="#d97706" emissiveIntensity={0.18} roughness={0.3} metalness={0.85} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[bladeRadius * 0.92, bladeThickness * 0.13, 10, 48]} />
              <meshStandardMaterial color="#fef08a" emissive="#b45309" emissiveIntensity={0.18} roughness={0.25} metalness={0.8} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[bladeThickness * 0.35, bladeThickness * 0.35, bladeThickness * 0.6, 24]} />
              <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.6} />
            </mesh>
          </group>
        </group>

        <mesh position={[0, tableThickness / 2 + boardHeight * 0.85, bladeThickness * 1.4]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[bladeThickness * 0.45, bladeThickness * 0.45, bladeRadius * 1.35, 12]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.22} />
        </mesh>
        <mesh position={[0, tableThickness / 2 + boardHeight * 1.05, bladeThickness * 1.4]}>
          <boxGeometry args={[bladeThickness * 0.9, bladeThickness * 3.6, bladeThickness * 0.9]} />
          <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.25} />
        </mesh>
        <mesh position={[0, tableThickness / 2 + boardHeight * 1.35, bladeThickness * 1.4]} rotation={[Math.PI / 5, 0, 0]}>
          <boxGeometry args={[bladeThickness * 0.7, bladeThickness * 1.7, bladeThickness * 0.7]} />
          <meshStandardMaterial color="#64748b" roughness={0.4} metalness={0.22} />
        </mesh>
      </group>
    </group>
  );
}

interface CompoundSawSceneProps extends PolygonShapeProps {
  bladeTilt: number;
  miterGauge: number;
}

function CompoundSawScene({
  numberOfSides,
  diameter,
  height,
  sideAngle,
  thickness,
  showMaterial,
  bladeTilt,
  miterGauge,
}: CompoundSawSceneProps) {
  const metrics = useMemo<BoardMetrics>(() => {
    const outerRadiusBottom = Math.max(diameter / 2, 0.12);
    const segmentAngle = Math.PI / numberOfSides;
    const outerApothemBottom = outerRadiusBottom * Math.cos(segmentAngle);
    const innerApothemBottom = Math.max(outerApothemBottom - thickness, outerApothemBottom * 0.2);
    const innerRadiusBottom = Math.max(innerApothemBottom / Math.cos(segmentAngle), outerRadiusBottom * 0.2);

    const angleFromVertical = Math.max(90 - sideAngle, 0);
    const taperOffset = height * Math.tan(THREE.MathUtils.degToRad(angleFromVertical));
    const maxTaper = outerRadiusBottom * 0.45;
    const outerRadiusTop = Math.max(outerRadiusBottom - Math.min(taperOffset, maxTaper), outerRadiusBottom * 0.4);

    const outerApothemTop = outerRadiusTop * Math.cos(segmentAngle);
    const innerApothemTop = Math.max(outerApothemTop - thickness, outerApothemTop * 0.25);
    const innerRadiusTop = Math.max(innerApothemTop / Math.cos(segmentAngle), outerRadiusTop * 0.3);

    return {
      outerRadiusBottom,
      outerRadiusTop,
      innerRadiusBottom,
      innerRadiusTop,
      segmentAngle,
    };
  }, [diameter, height, numberOfSides, sideAngle, thickness]);

  const tableRadius = Math.max(metrics.outerRadiusBottom * 1.35, height * 0.35, 0.35);
  const tableThickness = Math.max(height * 0.08, 0.08);
  const baseHeight = Math.max(tableThickness * 1.1, 0.12);

  const bladeTiltRad = THREE.MathUtils.degToRad(bladeTilt);
  const miterGaugeRad = THREE.MathUtils.degToRad(miterGauge);

  return (
    <group>
      <SawAssembly
        tableRadius={tableRadius}
        tableThickness={tableThickness}
        baseHeight={baseHeight}
        bladeTiltRad={bladeTiltRad}
        miterGaugeRad={miterGaugeRad}
        boardHeight={height}
      >
        <group position={[0, 0, 0]}>
          <Workpiece3D
            numberOfSides={numberOfSides}
            diameter={diameter}
            height={height}
            sideAngle={sideAngle}
            thickness={thickness}
            showMaterial={showMaterial}
            metrics={metrics}
            tableTopY={0}
          />
        </group>
      </SawAssembly>

      <CompoundAngleMarkers
        metrics={metrics}
        height={height}
        sideAngle={sideAngle}
        bladeTilt={bladeTilt}
        miterGauge={miterGauge}
        tableRadius={tableRadius}
        tableThickness={tableThickness}
      />

      <spotLight
        position={[tableRadius * 2.4, height * 2.4, tableRadius * 2.8]}
        angle={Math.PI / 5}
        penumbra={0.6}
        intensity={1.1}
      />
      <pointLight
        position={[-tableRadius * 1.8, height * 1.6, -tableRadius * 2]}
        intensity={0.6}
      />
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
  const [zoom, setZoom] = React.useState(10);
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

  // Text should stay upright and facing the camera
  // When flipped, we need to counter-rotate the text to keep it readable
  const textRotation: [number, number, number] = [
    0, // X rotation - always face forward
    isHorizontalFlip ? Math.PI : 0, // Y rotation - flip with horizontal flip
    isVerticalFlip ? Math.PI : 0, // Z rotation - rotate 180° when vertically flipped
  ];

  const viewHelperMessage = viewMode === '3d'
    ? 'Drag to orbit the saw • Scroll to zoom • Double-click to reset'
    : viewMode === 'top'
      ? 'Top View • Scroll to zoom • Switch views above'
      : 'Side Elevation View • Scroll to zoom • Switch views above';

  const handleResetView = React.useCallback(() => {
    setShowMaterial(false);
    setIsHorizontalFlip(false);
    setIsVerticalFlip(false);
    setViewMode('3d');
    setZoom(10);
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
      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2 bg-background/80 p-3 rounded backdrop-blur-sm">
        <Label className="text-xs font-medium">Zoom</Label>
        <input
          type="range"
          min="10"
          max="200"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="slider-vertical"
          style={{
            width: '160px',
            height: '300px',
            transform: 'rotate(270deg)',
            transformOrigin: 'center',
            cursor: 'pointer'
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
        <CameraController zoom={cameraZoom} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 7.5]} intensity={0.8} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />
        <pointLight position={[0, 5, 0]} intensity={0.4} />

        <group rotation={rotation}>
          {viewMode === '3d' ? (
            <CompoundSawScene
              numberOfSides={numberOfSides}
              diameter={scaledDiameter}
              height={scaledHeight}
              sideAngle={sideAngle}
              thickness={scaledThickness}
              showMaterial={showMaterial}
              bladeTilt={angles.bladeTilt}
              miterGauge={angles.miterGauge}
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
          cellThickness={0.4}
          cellColor="#1f2937"
          sectionSize={1}
          sectionThickness={0.8}
          sectionColor="#334155"
          fadeDistance={20}
          fadeStrength={1}
          infiniteGrid
          position={[0, -0.45, 0]}
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
      </Canvas>

      <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 text-[10px] sm:text-xs text-muted-foreground bg-background/80 p-1.5 sm:p-2 rounded backdrop-blur-sm">
        {viewHelperMessage}
      </div>

      <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 text-[10px] sm:text-xs text-muted-foreground bg-background/80 p-1.5 sm:p-2 rounded backdrop-blur-sm">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 rounded-sm bg-amber-600"></div> Workpiece body
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 rounded-sm bg-slate-600"></div> Saw base & table
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 rounded-sm bg-amber-300"></div> β Blade tilt arc
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 rounded-sm bg-indigo-300"></div> γ Miter gauge arc
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 rounded-sm bg-sky-400"></div> α Side pitch reference
          </span>
        </div>
      </div>
    </Card>
  );
}
