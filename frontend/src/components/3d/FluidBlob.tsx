'use client';

import React, { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, Environment, Sphere } from '@react-three/drei';
import * as THREE from 'three';

const Blob = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    // Rotate slowly
    meshRef.current.rotation.x = Math.sin(time / 4);
    meshRef.current.rotation.y = Math.sin(time / 2);
    
    // Move slightly with pointer
    const x = (state.pointer.x * viewport.width) / 10;
    const y = (state.pointer.y * viewport.height) / 10;
    
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, x, 0.05);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, y, 0.05);
  });

  return (
    <Sphere ref={meshRef} args={[1.5, 64, 64]}>
      <MeshTransmissionMaterial
        backside
        backsideThickness={1}
        thickness={2}
        roughness={0}
        transmission={1}
        ior={1.5}
        chromaticAberration={0.4}
        anisotropy={0.3}
        distortion={0.5}
        distortionScale={0.5}
        temporalDistortion={0.2}
        color="#1A5DFF"
        attenuationDistance={0.5}
        attenuationColor="#00D4AA"
      />
    </Sphere>
  );
};

export default function FluidBlob() {
  return (
    <div className="w-full h-full min-h-[400px] sm:min-h-[600px] relative">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 10]} intensity={2} />
        <Environment preset="city" />
        <Blob />
      </Canvas>
    </div>
  );
}
