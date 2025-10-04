'use client';

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Line } from '@react-three/drei';
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

function PolygonShape({
  numberOfSides,
  diameter,
  height,
  sideAngle,
  thickness,
  showMaterial,
}: PolygonShapeProps) {
  const radius = diameter / 2;

  // Calculate top radius based on taper
  const taperAngle = 90 - sideAngle;
  const taperAngleRad = (taperAngle * Math.PI) / 180;
  const radiusReduction = height * Math.tan(taperAngleRad);
  const topRadius = Math.max(0, radius - radiusReduction);

  // Generate polygon points
  const generatePolygonPoints = useMemo(() => {
    return (r: number, z: number) => {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i < numberOfSides; i++) {
        const angle = (i / numberOfSides) * Math.PI * 2;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        points.push(new THREE.Vector3(x, y, z));
      }
      return points;
    };
  }, [numberOfSides]);

  const bottomPoints = useMemo(() => generatePolygonPoints(radius, 0), [radius, generatePolygonPoints]);
  const topPoints = useMemo(() => generatePolygonPoints(topRadius, height), [topRadius, height, generatePolygonPoints]);

  // Create edges
  const edges = useMemo(() => {
    const lines: [THREE.Vector3, THREE.Vector3][] = [];

    // Bottom edges
    for (let i = 0; i < numberOfSides; i++) {
      const next = (i + 1) % numberOfSides;
      lines.push([bottomPoints[i], bottomPoints[next]]);
    }

    // Top edges
    if (topRadius > 0) {
      for (let i = 0; i < numberOfSides; i++) {
        const next = (i + 1) % numberOfSides;
        lines.push([topPoints[i], topPoints[next]]);
      }
    }

    // Vertical edges
    for (let i = 0; i < numberOfSides; i++) {
      if (topRadius > 0) {
        lines.push([bottomPoints[i], topPoints[i]]);
      } else {
        // Taper to a point at the top
        lines.push([bottomPoints[i], new THREE.Vector3(0, 0, height)]);
      }
    }

    return lines;
  }, [bottomPoints, topPoints, numberOfSides, topRadius, height]);

  // Create faces (semi-transparent)
  const faces = useMemo(() => {
    const geometries: THREE.BufferGeometry[] = [];

    // Side faces
    for (let i = 0; i < numberOfSides; i++) {
      const next = (i + 1) % numberOfSides;
      const geometry = new THREE.BufferGeometry();

      if (topRadius > 0) {
        // Quad face (two triangles)
        const vertices = new Float32Array([
          ...bottomPoints[i].toArray(),
          ...bottomPoints[next].toArray(),
          ...topPoints[next].toArray(),
          ...bottomPoints[i].toArray(),
          ...topPoints[next].toArray(),
          ...topPoints[i].toArray(),
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      } else {
        // Triangle face (tapered to point)
        const apex = new THREE.Vector3(0, 0, height);
        const vertices = new Float32Array([
          ...bottomPoints[i].toArray(),
          ...bottomPoints[next].toArray(),
          ...apex.toArray(),
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      }

      geometry.computeVertexNormals();
      geometries.push(geometry);
    }

    // Top face
    if (topRadius > 0) {
      const shape = new THREE.Shape();
      topPoints.forEach((point, i) => {
        if (i === 0) {
          shape.moveTo(point.x, point.y);
        } else {
          shape.lineTo(point.x, point.y);
        }
      });
      shape.closePath();

      const geometry = new THREE.ShapeGeometry(shape);
      // Rotate to horizontal and position at top
      geometry.rotateX(Math.PI / 2);
      geometry.translate(0, 0, height);
      geometries.push(geometry);
    }

    // Bottom face
    const bottomShape = new THREE.Shape();
    bottomPoints.forEach((point, i) => {
      if (i === 0) {
        bottomShape.moveTo(point.x, point.y);
      } else {
        bottomShape.lineTo(point.x, point.y);
      }
    });
    bottomShape.closePath();

    const bottomGeometry = new THREE.ShapeGeometry(bottomShape);
    bottomGeometry.rotateX(-Math.PI / 2);
    geometries.push(bottomGeometry);

    return geometries;
  }, [bottomPoints, topPoints, numberOfSides, topRadius, height]);

  return (
    <group>
      {/* Wireframe edges */}
      {edges.map((edge, i) => (
        <Line
          key={i}
          points={[edge[0], edge[1]]}
          color="#2563eb"
          lineWidth={2}
        />
      ))}

      {/* Semi-transparent faces */}
      {faces.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshBasicMaterial
            color="#3b82f6"
            transparent
            opacity={showMaterial ? 0.2 : 0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Material thickness visualization (if enabled) */}
      {showMaterial && thickness > 0 && (
        <group>
          {/* Inner wireframe */}
          {edges.map((edge, i) => {
            const scale = Math.max(0, (radius - thickness) / radius);
            const innerEdge = edge.map(point => {
              const scaled = new THREE.Vector3(
                point.x * scale,
                point.y * scale,
                point.z
              );
              return scaled;
            }) as [THREE.Vector3, THREE.Vector3];

            return (
              <Line
                key={`inner-${i}`}
                points={[innerEdge[0], innerEdge[1]]}
                color="#94a3b8"
                lineWidth={1}
                transparent
                opacity={0.5}
              />
            );
          })}
        </group>
      )}
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
    ? [2, 2, 2]      // 3D perspective view
    : [5, 0, 0];     // 2D side elevation view (looking from the side)

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
          {showMaterial ? 'Hide Material' : 'Show Material'}
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
          zoom: is3DView ? 1 : 80,
          near: 0.1,
          far: 1000,
        }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />

        <group rotation={isFlipped ? [Math.PI, 0, 0] : [0, 0, 0]}>
          <PolygonShape
            numberOfSides={numberOfSides}
            diameter={scaledDiameter}
            height={scaledHeight}
            sideAngle={sideAngle}
            thickness={scaledThickness}
            showMaterial={showMaterial}
          />
        </group>

        <Grid
          args={[10, 10]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#6b7280"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#9ca3af"
          fadeDistance={25}
          fadeStrength={1}
          infiniteGrid
        />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={1}
          maxDistance={10}
          enableRotate={is3DView}
        />

        <axesHelper args={[1]} />
      </Canvas>

      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 p-2 rounded backdrop-blur-sm">
        {is3DView
          ? 'Drag to rotate • Scroll to zoom • Double-click to reset'
          : 'Side Elevation View • Scroll to zoom • Click 3D View to rotate'
        }
      </div>
    </Card>
  );
}
