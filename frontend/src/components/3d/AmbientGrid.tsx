'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function GridMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    // Scroll the texture coordinates/position on the y axis (which is z axis relative to rotation)
    // To simulate forward scroll:
    meshRef.current.position.y -= 0.003;
    if (meshRef.current.position.y < -1) {
      meshRef.current.position.y = 0; // seamless reset if aligned
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-1.121997376282069, 0, 0]}
      position={[0, -6, 0]}
    >
      <planeGeometry args={[120, 120, 60, 60]} />
      <meshBasicMaterial
        color="#1E2430"
        wireframe
        transparent
        opacity={0.3}
      />
    </mesh>
  );
}

export default function AmbientGrid() {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-[-1] opacity-40">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        frameloop="always" // using frame updates for scrolling, but since it's background it can run
        dpr={[1, 1.5]}
      >
        <GridMesh />
      </Canvas>
    </div>
  );
}
