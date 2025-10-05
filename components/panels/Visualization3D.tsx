'use client';

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useCalculatorStore } from '@/lib/store';
import { toMillimeters } from '@/lib/utils/unitConversions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PolygonShapeProps {
  numberOfSides: number;
  diameter: number;
  height: number;
  sideAngle: number;
  thickness: number;
  showMaterial: boolean;
}

// Side elevation cross-section view component
function SideElevationView({
  diameter,
  height,
  sideAngle,
  thickness,
  showMaterial,
}: Omit<PolygonShapeProps, 'numberOfSides'>) {
  const halfWidth = diameter / 2;

  // Calculate the horizontal offset at the top based on the side angle
  // sideAngle is measured from vertical (90° = vertical, 0° = horizontal)
  const angleFromVertical = 90 - sideAngle;
  const angleRad = (angleFromVertical * Math.PI) / 180;
  const horizontalOffset = height * Math.tan(angleRad);

  // Outer profile points (going counterclockwise from bottom-left)
  const outerPoints = useMemo(() => [
    new THREE.Vector3(-halfWidth, 0, 0),                          // Bottom left
    new THREE.Vector3(-halfWidth + horizontalOffset, height, 0),  // Top left
    new THREE.Vector3(halfWidth - horizontalOffset, height, 0),   // Top right
    new THREE.Vector3(halfWidth, 0, 0),                           // Bottom right
  ], [halfWidth, height, horizontalOffset]);

  // Inner profile points (for material thickness)
  const innerPoints = useMemo(() => {
    // Thickness offset perpendicular to the sloped side
    const thicknessOffsetX = thickness * Math.sin(angleRad);
    const thicknessOffsetY = thickness * Math.cos(angleRad);

    return [
      new THREE.Vector3(-halfWidth + thicknessOffsetX, thicknessOffsetY, 0),
      new THREE.Vector3(-halfWidth + horizontalOffset - thicknessOffsetX, height - thicknessOffsetY, 0),
      new THREE.Vector3(halfWidth - horizontalOffset + thicknessOffsetX, height - thicknessOffsetY, 0),
      new THREE.Vector3(halfWidth - thicknessOffsetX, thicknessOffsetY, 0),
    ];
  }, [halfWidth, height, horizontalOffset, thickness, angleRad]);

  // Create edge lines
  const outerEdges: [THREE.Vector3, THREE.Vector3][] = useMemo(() => [
    [outerPoints[0], outerPoints[1]], // Left side
    [outerPoints[1], outerPoints[2]], // Top
    [outerPoints[2], outerPoints[3]], // Right side
    [outerPoints[3], outerPoints[0]], // Bottom
  ], [outerPoints]);

  const innerEdges: [THREE.Vector3, THREE.Vector3][] = useMemo(() => [
    [innerPoints[0], innerPoints[1]], // Left side
    [innerPoints[1], innerPoints[2]], // Top
    [innerPoints[2], innerPoints[3]], // Right side
    [innerPoints[3], innerPoints[0]], // Bottom
  ], [innerPoints]);

  return (
    <group>
      {/* Outer wireframe */}
      {outerEdges.map((edge, i) => (
        <Line
          key={`outer-${i}`}
          points={[edge[0], edge[1]]}
          color="#2563eb"
          lineWidth={3}
        />
      ))}

      {/* Inner wireframe (material thickness) */}
      {showMaterial && thickness > 0 && innerEdges.map((edge, i) => (
        <Line
          key={`inner-${i}`}
          points={[edge[0], edge[1]]}
          color="#10b981"
          lineWidth={2}
        />
      ))}

      {/* Semi-transparent fill */}
      <mesh>
        <shapeGeometry args={[
          new THREE.Shape([
            new THREE.Vector2(outerPoints[0].x, outerPoints[0].y),
            new THREE.Vector2(outerPoints[1].x, outerPoints[1].y),
            new THREE.Vector2(outerPoints[2].x, outerPoints[2].y),
            new THREE.Vector2(outerPoints[3].x, outerPoints[3].y),
          ])
        ]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={showMaterial ? 0.15 : 0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Annotations */}
      <group>
        {/* Height dimension */}
        <Line
          points={[
            new THREE.Vector3(halfWidth + 0.3, 0, 0),
            new THREE.Vector3(halfWidth + 0.3, height, 0),
          ]}
          color="#94a3b8"
          lineWidth={1}
          dashed
          dashSize={0.05}
          gapSize={0.05}
        />
        <Text
          position={[halfWidth + 0.5, height / 2, 0]}
          fontSize={0.15}
          color="#e2e8f0"
          anchorX="left"
          anchorY="middle"
        >
          H
        </Text>

        {/* Side angle annotation */}
        <Text
          position={[halfWidth - 0.4, 0.3, 0]}
          fontSize={0.12}
          color="#fbbf24"
          anchorX="center"
          anchorY="middle"
        >
          {sideAngle}°
        </Text>

        {/* Diameter/width dimension */}
        <Line
          points={[
            new THREE.Vector3(-halfWidth, -0.3, 0),
            new THREE.Vector3(halfWidth, -0.3, 0),
          ]}
          color="#94a3b8"
          lineWidth={1}
          dashed
          dashSize={0.05}
          gapSize={0.05}
        />
        <Text
          position={[0, -0.5, 0]}
          fontSize={0.15}
          color="#e2e8f0"
          anchorX="center"
          anchorY="middle"
        >
          D
        </Text>

        {/* Material thickness indicator */}
        {showMaterial && thickness > 0 && (
          <>
            <Line
              points={[
                outerPoints[0],
                innerPoints[0],
              ]}
              color="#10b981"
              lineWidth={1.5}
            />
            <Text
              position={[-halfWidth - 0.3, 0.1, 0]}
              fontSize={0.1}
              color="#10b981"
              anchorX="right"
              anchorY="middle"
            >
              t
            </Text>
          </>
        )}

        {/* Angle arc visualization */}
        <primitive object={createAngleArc(sideAngle, halfWidth, 0.3)} />
      </group>
    </group>
  );
}

// Helper to create angle arc
function createAngleArc(angle: number, x: number, radius: number) {
  const group = new THREE.Group();
  const angleRad = (angle * Math.PI) / 180;
  const startAngle = Math.PI / 2; // 90 degrees (pointing up)
  const endAngle = startAngle - angleRad;

  const curve = new THREE.EllipseCurve(
    x, 0,           // center
    radius, radius, // xRadius, yRadius
    startAngle, endAngle, // start, end angle
    true,           // clockwise
    0               // rotation
  );

  const points = curve.getPoints(32).map(p => new THREE.Vector3(p.x, p.y, 0));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0xfbbf24, linewidth: 1 });
  const line = new THREE.Line(geometry, material);

  group.add(line);
  return group;
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
  const radius = diameter / 2;

  // Calculate horizontal offset at top based on side angle
  const angleFromVertical = 90 - sideAngle;
  const angleRad = (angleFromVertical * Math.PI) / 180;
  const horizontalOffset = height * Math.tan(angleRad);

  // Bottom and top radii
  const bottomRadius = radius;
  const topRadius = Math.max(0.1, radius - horizontalOffset);

  // Generate polygon points
  const generatePolygonPoints = (r: number, yPos: number) => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < numberOfSides; i++) {
      const angle = (i / numberOfSides) * Math.PI * 2;
      const x = r * Math.cos(angle);
      const z = r * Math.sin(angle);
      points.push(new THREE.Vector3(x, yPos, z));
    }
    return points;
  };

  const bottomPoints = generatePolygonPoints(bottomRadius, 0);
  const topPoints = generatePolygonPoints(topRadius, height);

  // Create edges
  const edges = useMemo(() => {
    const lines: [THREE.Vector3, THREE.Vector3][] = [];

    // Bottom edges
    for (let i = 0; i < numberOfSides; i++) {
      const next = (i + 1) % numberOfSides;
      lines.push([bottomPoints[i], bottomPoints[next]]);
    }

    // Top edges
    for (let i = 0; i < numberOfSides; i++) {
      const next = (i + 1) % numberOfSides;
      lines.push([topPoints[i], topPoints[next]]);
    }

    // Vertical edges
    for (let i = 0; i < numberOfSides; i++) {
      lines.push([bottomPoints[i], topPoints[i]]);
    }

    return lines;
  }, [bottomPoints, topPoints, numberOfSides]);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {/* Wireframe edges */}
      {edges.map((edge, i) => (
        <Line
          key={i}
          points={[edge[0], edge[1]]}
          color="#2563eb"
          lineWidth={2}
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
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [is3DView, setIs3DView] = React.useState(false);

  // Normalize scale for visualization (convert to mm and scale down)
  const heightMm = toMillimeters(height, lengthUnit);
  const diameterMm = toMillimeters(diameter, lengthUnit);
  const thicknessMm = toMillimeters(thickness, lengthUnit);

  const scale = 1 / Math.max(heightMm, diameterMm, 100);
  const scaledHeight = heightMm * scale;
  const scaledDiameter = diameterMm * scale;
  const scaledThickness = thicknessMm * scale;

  // Camera settings based on view mode
  const cameraPosition: [number, number, number] = is3DView
    ? [3, 3, 3]      // 3D perspective view
    : [0, 0, 5];     // 2D side elevation view (looking from front)

  return (
    <Card className="w-full h-[500px] md:h-[600px] relative">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant={is3DView ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIs3DView(!is3DView)}
        >
          {is3DView ? '3D View' : 'Side View'}
        </Button>
        <Button
          variant={showMaterial ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowMaterial(!showMaterial)}
        >
          Show Material
        </Button>
        <Button
          variant={isFlipped ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          Flip 180°
        </Button>
      </div>

      <Canvas
        orthographic={!is3DView}
        camera={{
          position: cameraPosition,
          zoom: is3DView ? 50 : 80,
          near: 0.1,
          far: 1000,
        }}
      >
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />

        <group rotation={isFlipped ? [Math.PI, 0, 0] : [0, 0, 0]}>
          {is3DView ? (
            <PolygonShape3D
              numberOfSides={numberOfSides}
              diameter={scaledDiameter}
              height={scaledHeight}
              sideAngle={sideAngle}
              thickness={scaledThickness}
              showMaterial={showMaterial}
            />
          ) : (
            <SideElevationView
              diameter={scaledDiameter}
              height={scaledHeight}
              sideAngle={sideAngle}
              thickness={scaledThickness}
              showMaterial={showMaterial}
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
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
        />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={10}
          enableRotate={is3DView}
        />

        <axesHelper args={[1.5]} />
      </Canvas>

      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 p-2 rounded backdrop-blur-sm">
        {is3DView
          ? 'Drag to rotate • Scroll to zoom • Double-click to reset'
          : 'Side Elevation View • Scroll to zoom • Click 3D View to rotate'
        }
      </div>

      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/80 p-2 rounded backdrop-blur-sm">
        <div className="flex gap-3">
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-blue-500"></div> Outer
          </span>
          {showMaterial && (
            <span className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-emerald-500"></div> Inner
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
