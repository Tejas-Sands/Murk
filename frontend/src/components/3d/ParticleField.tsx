'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Particles() {
  const pointsRef = useRef<THREE.Points>(null);
  const lineRef = useRef<THREE.LineSegments>(null);

  const count = 1200;

  // Generate random points with Gaussian cluster toward center
  const [positions, initialPositions] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const initPos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Box range [-30, 30]
      // Gaussian distribution style (summing random numbers)
      const x = ((Math.random() + Math.random() + Math.random() - 1.5) / 1.5) * 30;
      const y = ((Math.random() + Math.random() + Math.random() - 1.5) / 1.5) * 30;
      const z = ((Math.random() + Math.random() + Math.random() - 1.5) / 1.5) * 30;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      initPos[i * 3] = x;
      initPos[i * 3 + 1] = y;
      initPos[i * 3 + 2] = z;
    }
    return [pos, initPos];
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (!pointsRef.current) return;

    const positionsAttr = pointsRef.current.geometry.attributes.position;
    const array = positionsAttr.array as Float32Array;

    const lineIndices: number[] = [];
    const maxDistanceSq = 8 * 8;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // slow drift using sin/cos
      const offsetSpeed = 0.0003;
      array[idx] = initialPositions[idx] + Math.sin(time * 0.1 + initialPositions[idx]) * 0.8;
      array[idx + 1] = initialPositions[idx + 1] + Math.cos(time * 0.15 + initialPositions[idx + 1]) * 0.8;
      array[idx + 2] = initialPositions[idx + 2] + Math.sin(time * 0.12 + initialPositions[idx + 2]) * 0.8;
    }
    positionsAttr.needsUpdate = true;

    // Find line connections
    for (let i = 0; i < count; i++) {
      const idxA = i * 3;
      const ax = array[idxA];
      const ay = array[idxA + 1];
      const az = array[idxA + 2];

      // Optimisation: check connections with subsequent points
      let connectionsCount = 0;
      for (let j = i + 1; j < count; j++) {
        if (connectionsCount > 3) break; // Limit connections per point to maintain low draw call count
        const idxB = j * 3;
        const bx = array[idxB];
        const by = array[idxB + 1];
        const bz = array[idxB + 2];

        const dx = ax - bx;
        const dy = ay - by;
        const dz = az - bz;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < maxDistanceSq) {
          lineIndices.push(i, j);
          connectionsCount++;
        }
      }
    }

    if (lineRef.current) {
      lineRef.current.geometry.setAttribute(
        'position',
        pointsRef.current.geometry.getAttribute('position')
      );
      lineRef.current.geometry.setIndex(lineIndices);
      lineRef.current.geometry.index!.needsUpdate = true;
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color="#3B82F6"
          transparent
          opacity={0.5}
          sizeAttenuation
        />
      </points>

      <lineSegments ref={lineRef}>
        <bufferGeometry />
        <lineBasicMaterial
          color="#3B82F6"
          transparent
          opacity={0.08}
        />
      </lineSegments>
    </group>
  );
}

export default function ParticleField() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
      <Canvas
        camera={{ position: [0, 0, 28], fov: 65 }}
        frameloop="always"
        dpr={[1, 1.5]}
        style={{ background: 'transparent' }}
      >
        <Particles />
      </Canvas>
    </div>
  );
}
