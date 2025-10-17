'use client';

import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text as DreiText, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useCalculatorStore } from '@/lib/store';
import { calculateAngles } from '@/lib/calculations/angles';
import { toMillimeters, formatNumber, getUnitLabel, type LengthUnit } from '@/lib/utils/unitConversions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface SceneMetrics {
  height: number;
  outerBottomRadius: number;
  outerTopRadius: number;
  innerBottomRadius: number;
  innerTopRadius: number;
  wallThickness: number;
  scale: number;
  physical: {
    heightMm: number;
    diameterMm: number;
    thicknessMm: number;
    topOpeningMm: number;
    bottomFootprintMm: number;
  };
  clampedThickness: boolean;
}

interface BoardInstance {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  explodeNormal: [number, number, number];
  labelPosition: [number, number, number];
  outerBottom: [number, number, number];
  outerTop: [number, number, number];
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
    gradient.addColorStop(0, '#8b5a2b');
    gradient.addColorStop(0.5, '#c28c4b');
    gradient.addColorStop(1, '#e0b97f');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 18;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.6));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.3));
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.MirroredRepeatWrapping;
    texture.repeat.set(3, 1.6);
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function computeSceneMetrics(
  height: number,
  diameter: number,
  thickness: number,
  sideAngle: number,
  lengthUnit: LengthUnit
): SceneMetrics {
  const heightMm = Math.max(20, toMillimeters(height, lengthUnit));
  const diameterMm = Math.max(20, toMillimeters(diameter, lengthUnit));
  const rawThicknessMm = Math.max(0, toMillimeters(thickness, lengthUnit));

  const outerBottomRadiusMm = diameterMm / 2;
  const taperAngle = Math.max(0, 90 - sideAngle);
  const taperOffsetMm = heightMm * Math.tan(THREE.MathUtils.degToRad(taperAngle));
  const outerTopRadiusMm = Math.max(outerBottomRadiusMm - taperOffsetMm, outerBottomRadiusMm * 0.28);

  const maxWallMm = outerBottomRadiusMm * 0.95;
  const minWallMm = Math.max(2, outerBottomRadiusMm * 0.04);
  const effectiveWallMm = Math.min(Math.max(rawThicknessMm, minWallMm), maxWallMm);
  const clampedThickness = Math.abs(effectiveWallMm - rawThicknessMm) > 0.5;

  const innerBottomRadiusMm = Math.max(outerBottomRadiusMm - effectiveWallMm, outerBottomRadiusMm * 0.05);
  const innerTopRadiusMm = Math.max(outerTopRadiusMm - effectiveWallMm, outerTopRadiusMm * 0.05);

  const characteristic = Math.max(heightMm, outerBottomRadiusMm * 2, 500);
  const scale = 1 / characteristic;

  return {
    height: heightMm * scale,
    outerBottomRadius: outerBottomRadiusMm * scale,
    outerTopRadius: outerTopRadiusMm * scale,
    innerBottomRadius: innerBottomRadiusMm * scale,
    innerTopRadius: innerTopRadiusMm * scale,
    wallThickness: effectiveWallMm * scale,
    scale,
    clampedThickness,
    physical: {
      heightMm,
      diameterMm,
      thicknessMm: effectiveWallMm,
      topOpeningMm: outerTopRadiusMm * 2,
      bottomFootprintMm: outerBottomRadiusMm * 2,
    },
  };
}

function buildBoardInstances(sides: number, metrics: SceneMetrics): BoardInstance[] {
  const boards: BoardInstance[] = [];
  const { height, outerBottomRadius, outerTopRadius, innerBottomRadius, innerTopRadius } = metrics;

  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const b = ((i + 1) / sides) * Math.PI * 2;

    const outerBottomA = new THREE.Vector3(Math.cos(a) * outerBottomRadius, 0, Math.sin(a) * outerBottomRadius);
    const outerBottomB = new THREE.Vector3(Math.cos(b) * outerBottomRadius, 0, Math.sin(b) * outerBottomRadius);
    const outerTopA = new THREE.Vector3(Math.cos(a) * outerTopRadius, height, Math.sin(a) * outerTopRadius);
    const outerTopB = new THREE.Vector3(Math.cos(b) * outerTopRadius, height, Math.sin(b) * outerTopRadius);

    const innerBottomA = new THREE.Vector3(Math.cos(a) * innerBottomRadius, metrics.wallThickness * 0.02, Math.sin(a) * innerBottomRadius);
    const innerBottomB = new THREE.Vector3(Math.cos(b) * innerBottomRadius, metrics.wallThickness * 0.02, Math.sin(b) * innerBottomRadius);
    const innerTopA = new THREE.Vector3(Math.cos(a) * innerTopRadius, height - metrics.wallThickness * 0.04, Math.sin(a) * innerTopRadius);
    const innerTopB = new THREE.Vector3(Math.cos(b) * innerTopRadius, height - metrics.wallThickness * 0.04, Math.sin(b) * innerTopRadius);

    const vertices = [
      outerBottomA.clone(),
      outerBottomB.clone(),
      outerTopB.clone(),
      outerTopA.clone(),
      innerBottomA.clone(),
      innerBottomB.clone(),
      innerTopB.clone(),
      innerTopA.clone(),
    ];

    const centroid = vertices.reduce((acc, v) => acc.add(v), new THREE.Vector3()).multiplyScalar(1 / vertices.length);

    const outerBottomLocal = outerBottomA.clone().sub(centroid);
    const outerTopLocal = outerTopA.clone().sub(centroid);

    const relativePositions = new Float32Array(vertices.length * 3);
    vertices.forEach((vertex, idx) => {
      const rel = vertex.sub(centroid);
      relativePositions[idx * 3] = rel.x;
      relativePositions[idx * 3 + 1] = rel.y;
      relativePositions[idx * 3 + 2] = rel.z;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(relativePositions, 3));
    geometry.setIndex([
      0, 1, 2, 0, 2, 3,
      4, 7, 6, 4, 6, 5,
      0, 4, 5, 0, 5, 1,
      3, 2, 6, 3, 6, 7,
      0, 3, 7, 0, 7, 4,
      1, 5, 6, 1, 6, 2,
    ]);

    const uvs = new Float32Array([
      0, 0,
      1, 0,
      1, 1,
      0, 1,
      0.1, 0.05,
      0.9, 0.05,
      0.9, 0.95,
      0.1, 0.95,
    ]);
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    const explodeNormal = new THREE.Vector3(centroid.x, 0, centroid.z).normalize();
    if (!Number.isFinite(explodeNormal.lengthSq()) || explodeNormal.lengthSq() === 0) {
      explodeNormal.set(0, 0, 0);
    }

    const labelPosition = centroid.clone().add(new THREE.Vector3(0, metrics.height * 1.05, 0));

    boards.push({
      geometry,
      position: [centroid.x, centroid.y, centroid.z],
      explodeNormal: [explodeNormal.x, explodeNormal.y, explodeNormal.z],
      labelPosition: [labelPosition.x, labelPosition.y, labelPosition.z],
      outerBottom: [outerBottomLocal.x, outerBottomLocal.y, outerBottomLocal.z],
      outerTop: [outerTopLocal.x, outerTopLocal.y, outerTopLocal.z],
    });
  }

  return boards;
}

function buildRimGeometry(radius: number, y: number, sides: number) {
  const points: number[] = [];
  for (let i = 0; i <= sides; i++) {
    const t = (i / sides) * Math.PI * 2;
    points.push(Math.cos(t) * radius, y, Math.sin(t) * radius);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}

function FinalAssembly({ boards, woodTexture, explode }: { boards: BoardInstance[]; woodTexture: THREE.Texture | null; explode: number; }) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#d6ae78',
        roughness: 0.42,
        metalness: 0.08,
        map: woodTexture ?? undefined,
      }),
    [woodTexture]
  );

  return (
    <group>
      {boards.map((board, idx) => {
        const [cx, cy, cz] = board.position;
        const [nx, ny, nz] = board.explodeNormal;
        return (
          <mesh
            key={`board-${idx}`}
            geometry={board.geometry}
            position={[cx + nx * explode, cy + ny * explode, cz + nz * explode]}
            castShadow
            receiveShadow
            material={material}
          />
        );
      })}
    </group>
  );
}

function DimensionLabels({ boards, angle, metrics }: { boards: BoardInstance[]; angle: { bladeTilt: number; miterGauge: number }; metrics: SceneMetrics; }) {
  if (!boards.length) return null;
  const firstLabel = boards[0].labelPosition;
  return (
    <group>
      <DreiText
        position={[firstLabel[0], firstLabel[1], firstLabel[2]]}
        fontSize={metrics.height * 0.08}
        color="#f3f4f6"
        anchorX="center"
        anchorY="bottom"
      >
        Blade Tilt β {angle.bladeTilt.toFixed(1)}°
      </DreiText>
      <DreiText
        position={[firstLabel[0], firstLabel[1] - metrics.height * 0.08, firstLabel[2]]}
        fontSize={metrics.height * 0.07}
        color="#cbd5f5"
        anchorX="center"
        anchorY="bottom"
      >
        Miter Gauge γ {angle.miterGauge.toFixed(1)}°
      </DreiText>
    </group>
  );
}

function SideAngleHighlight({
  metrics,
  board,
  explode,
}: {
  metrics: SceneMetrics;
  board: BoardInstance | null;
  explode: number;
}) {
  const anchorBase = useMemo(() => {
    if (!board) return null;
    const [bx, by, bz] = board.outerBottom;
    const [cx, cy, cz] = board.position;
    return new THREE.Vector3(cx + bx, cy + by, cz + bz);
  }, [board]);

  const topBase = useMemo(() => {
    if (!board) return null;
    const [tx, ty, tz] = board.outerTop;
    const [cx, cy, cz] = board.position;
    return new THREE.Vector3(cx + tx, cy + ty, cz + tz);
  }, [board]);

  const explodeOffset = useMemo(() => {
    if (!board) return new THREE.Vector3();
    const [nx, ny, nz] = board.explodeNormal;
    return new THREE.Vector3(nx, ny, nz).multiplyScalar(explode);
  }, [board, explode]);

  const anchor = useMemo(() => anchorBase?.clone().add(explodeOffset), [anchorBase, explodeOffset]);
  const top = useMemo(() => topBase?.clone().add(explodeOffset), [topBase, explodeOffset]);

  const angleData = useMemo(() => {
    if (!anchor || !top) return null;
    const vertical = new THREE.Vector3(0, 1, 0);
    const boardVector = top.clone().sub(anchor);
    if (boardVector.lengthSq() < 1e-6) return null;

    const boardDir = boardVector.clone().normalize();
    const axis = new THREE.Vector3().crossVectors(vertical, boardDir);
    if (axis.lengthSq() < 1e-10) return null;
    axis.normalize();

    const actualAngle = THREE.MathUtils.radToDeg(vertical.angleTo(boardDir));
    const angleRad = THREE.MathUtils.degToRad(actualAngle);

    const verticalLength = boardVector.length();
    const radius = Math.min(metrics.height * 0.6, verticalLength * 0.8);
    const segments = 40;
    const arcPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = (angleRad * i) / segments;
      const quat = new THREE.Quaternion().setFromAxisAngle(axis, t);
      const rotated = vertical.clone().multiplyScalar(radius).applyQuaternion(quat);
      arcPoints.push(anchor.clone().add(rotated));
    }

    const verticalPoint = anchor.clone().add(vertical.clone().multiplyScalar(verticalLength));
    const labelPoint = arcPoints[Math.min(arcPoints.length - 1, Math.floor(arcPoints.length * 0.7))] ?? top.clone();

    return {
      actualAngle,
      arcPoints,
      verticalPoint,
      topPoint: top,
      labelPoint,
    };
  }, [anchor, top, metrics.height]);

  if (!anchor || !angleData) return null;

  const { actualAngle, arcPoints, verticalPoint, topPoint, labelPoint } = angleData;

  return (
    <group>
      <Line points={[anchor, verticalPoint]} color="#38bdf8" lineWidth={1.6} />
      <Line points={[anchor, topPoint]} color="#f97316" lineWidth={2.2} />
      <Line points={arcPoints} color="#38bdf8" lineWidth={1.4} />
      <DreiText
        position={labelPoint}
        fontSize={metrics.height * 0.075}
        color="#e0f2fe"
        anchorX="center"
        anchorY="bottom"
      >
        α {actualAngle.toFixed(1)}°
      </DreiText>
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

  const [explode, setExplode] = useState(0);
  const [showRims, setShowRims] = useState(true);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const metrics = useMemo(
    () => computeSceneMetrics(height, diameter, thickness, sideAngle, lengthUnit),
    [height, diameter, thickness, sideAngle, lengthUnit]
  );

  const cameraPosition = useMemo<[number, number, number]>(() => {
    const radius = Math.max(metrics.outerBottomRadius, metrics.height) * 4.2;
    return [0, metrics.height * 0.75, radius];
  }, [metrics.height, metrics.outerBottomRadius]);

  const cameraTarget = useMemo<[number, number, number]>(() => [0, metrics.height * 0.55, 0], [metrics.height]);

  const boards = useMemo(
    () => buildBoardInstances(numberOfSides, metrics),
    [numberOfSides, metrics]
  );

  const rimTop = useMemo(
    () => buildRimGeometry(metrics.outerTopRadius, metrics.height, numberOfSides),
    [metrics.outerTopRadius, metrics.height, numberOfSides]
  );
  const rimBottom = useMemo(
    () => buildRimGeometry(metrics.outerBottomRadius, 0, numberOfSides),
    [metrics.outerBottomRadius, numberOfSides]
  );

  const woodTexture = useWoodTexture();
  const angles = useMemo(
    () => calculateAngles(numberOfSides, sideAngle),
    [numberOfSides, sideAngle]
  );

  const unitLabel = getUnitLabel(lengthUnit);
  const physical = metrics.physical;

  const resetCamera = useCallback(() => {
    setExplode(0);
    const controls = controlsRef.current;
    if (!controls) return;
    controls.reset();
    const [px, py, pz] = cameraPosition;
    const [tx, ty, tz] = cameraTarget;
    controls.object.position.set(px, py, pz);
    controls.target.set(tx, ty, tz);
    controls.update();
  }, [cameraPosition, cameraTarget]);

  const handleControlsRef = useCallback((value: OrbitControlsImpl | null) => {
    if (!value) return;
    controlsRef.current = value;
    const [px, py, pz] = cameraPosition;
    const [tx, ty, tz] = cameraTarget;
    value.object.position.set(px, py, pz);
    value.target.set(tx, ty, tz);
    value.update();
    value.saveState();
  }, [cameraPosition, cameraTarget]);

  useEffect(() => {
    setExplode(0);
  }, [numberOfSides, height, diameter, thickness, sideAngle]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const [px, py, pz] = cameraPosition;
    const [tx, ty, tz] = cameraTarget;
    controls.object.position.set(px, py, pz);
    controls.target.set(tx, ty, tz);
    controls.update();
    controls.saveState();
  }, [cameraPosition, cameraTarget]);

  return (
    <Card className="relative w-full h-[420px] sm:h-[540px] md:h-[640px] overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900">
      <div className="absolute inset-x-4 top-4 z-20 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Label htmlFor="explode-range" className="text-xs uppercase tracking-wide text-slate-200">
            Exploded View
          </Label>
          <input
            id="explode-range"
            type="range"
            min={0}
            max={0.6}
            step={0.02}
            value={explode}
            onChange={(event) => setExplode(Number(event.target.value))}
            className="h-1 w-36 rounded-full accent-amber-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="rim-toggle"
            type="checkbox"
            checked={showRims}
            onChange={(event) => setShowRims(event.target.checked)}
            className="h-3.5 w-3.5 accent-amber-400"
          />
          <Label htmlFor="rim-toggle" className="text-xs uppercase tracking-wide text-slate-200">
            Show Rim Guides
          </Label>
        </div>
        <Button variant="ghost" size="sm" onClick={resetCamera} className="ml-auto h-8 px-3 text-xs">
          Reset View
        </Button>
      </div>

      <Canvas
        shadows
        camera={{
          position: cameraPosition,
          fov: 32,
          near: 0.01,
          far: 50,
        }}
      >
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[3, 5, 3]}
          intensity={0.9}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-3, 2, -2]} intensity={0.35} />

        <group rotation={[0, Math.PI / numberOfSides - Math.PI / 2, 0]} position={[0, -metrics.height * 0.04, 0]}>
          <FinalAssembly boards={boards} woodTexture={woodTexture} explode={explode} />

          {boards.length > 0 && (
            <SideAngleHighlight
              metrics={metrics}
              board={boards[0]}
              explode={explode}
            />
          )}

          {showRims && (
            <>
              <lineSegments geometry={rimTop}>
                <lineBasicMaterial color="#fbbf24" linewidth={2} transparent opacity={0.6} />
              </lineSegments>
              <lineSegments geometry={rimBottom}>
                <lineBasicMaterial color="#38bdf8" linewidth={2} transparent opacity={0.4} />
              </lineSegments>
            </>
          )}
          <DimensionLabels boards={boards} angle={angles} metrics={metrics} />

          <mesh
            receiveShadow
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -metrics.height * 0.02 - 0.001, 0]}
          >
            <planeGeometry args={[5, 5]} />
            <meshStandardMaterial color="#0b1220" roughness={0.9} metalness={0} />
          </mesh>
        </group>

        <OrbitControls
          ref={handleControlsRef}
          enablePan={false}
          maxPolarAngle={Math.PI * 0.48}
          minDistance={Math.max(metrics.height * 0.7, metrics.outerBottomRadius * 1.6)}
          maxDistance={Math.max(metrics.height, metrics.outerBottomRadius) * 8}
        />
      </Canvas>

      <div className="absolute inset-x-4 bottom-4 z-20 flex flex-wrap gap-4 rounded-lg border border-white/10 bg-black/25 px-4 py-3 text-slate-200 backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Project Summary</p>
          <p className="text-sm text-slate-100">
            {formatNumber(physical.heightMm / 25.4, 2)} in tall × {formatNumber(physical.bottomFootprintMm / 25.4, 2)} in footprint · {formatNumber(physical.topOpeningMm / 25.4, 2)} in top opening
          </p>
          <p className="text-xs text-slate-300">
            Wall thickness {formatNumber(physical.thicknessMm / 25.4, 2)} in · Blade tilt β {angles.bladeTilt.toFixed(1)}° · Miter γ {angles.miterGauge.toFixed(1)}°
          </p>
          {metrics.clampedThickness && (
            <p className="text-[10px] text-rose-300">
              Note: Thickness was increased slightly to keep the vessel structural in the preview.
            </p>
          )}
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Units</p>
          <p className="text-sm text-slate-100">
            {numberOfSides} sides · {formatNumber(height, 2)} × {formatNumber(diameter, 2)} × {formatNumber(thickness, 2)} {unitLabel}
          </p>
          <p className="text-xs text-slate-300">
            Exploded offset {(explode / metrics.scale).toFixed(0)} mm outward
          </p>
        </div>
      </div>
    </Card>
  );
}
