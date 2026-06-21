'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

function Globe({ trustScore = 85 }: { trustScore?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  const count = 500;
  
  // Distribute points on sphere using Fibonacci sphere algorithm
  const nodes = useMemo(() => {
    const temp = [];
    const activeThreshold = Math.max(0.08, trustScore / 100); // trust score percentage
    
    for (let i = 0; i < count; i++) {
      // Fibonacci sphere mapping
      const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
      const radius = Math.sqrt(1 - y * y); // radius at y

      const phi = i * 2.399963229728653; // golden angle in radians

      const x = Math.cos(phi) * radius;
      const z = Math.sin(phi) * radius;

      // Determine if active node based on trust ratio
      const isActive = Math.random() < activeThreshold;

      temp.push({
        x: x * 1.8, // scale factor
        y: y * 1.8,
        z: z * 1.8,
        isActive,
        speed: 1.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2
      });
    }
    return temp;
  }, [trustScore]);

  // Set initial instance matrices and colors
  useEffect(() => {
    if (!meshRef.current) return;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    nodes.forEach((node, i) => {
      dummy.position.set(node.x, node.y, node.z);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      if (node.isActive) {
        color.set('#3B82F6'); // Brand color
      } else {
        color.set('#555B66'); // Muted color
      }
      meshRef.current!.setColorAt(i, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [nodes]);

  // Handle mouse move listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalise coordinates to [-1, 1]
      pointerRef.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (!meshRef.current || !groupRef.current) return;

    // Dampened pointer rotation
    pointerRef.current.x = THREE.MathUtils.lerp(pointerRef.current.x, pointerRef.current.targetX, 0.08);
    pointerRef.current.y = THREE.MathUtils.lerp(pointerRef.current.y, pointerRef.current.targetY, 0.08);

    // Apply rotation based on pointer + subtle auto rotation
    groupRef.current.rotation.y = pointerRef.current.x * 0.5 + time * 0.08;
    groupRef.current.rotation.x = -pointerRef.current.y * 0.5;

    // Animate active nodes scale
    const dummy = new THREE.Object3D();
    nodes.forEach((node, i) => {
      dummy.position.set(node.x, node.y, node.z);
      
      let scale = 1.0;
      if (node.isActive) {
        // scale pulse sin(time * 2 + nodeIndex) mapped to 1.0 -> 1.8
        scale = 1.0 + Math.sin(time * node.speed + node.phase) * 0.4;
      }
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={meshRef}
        args={[null as any, null as any, count]}
      >
        <sphereGeometry args={[0.035, 6, 6]} />
        <meshBasicMaterial transparent opacity={0.8} />
      </instancedMesh>
    </group>
  );
}

export default function TrustGlobe({ trustScore = 85 }: { trustScore?: number }) {
  return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center relative select-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        frameloop="always"
        dpr={[1, 1.5]}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={1.0} />
        <Globe trustScore={trustScore} />
      </Canvas>
    </div>
  );
}
