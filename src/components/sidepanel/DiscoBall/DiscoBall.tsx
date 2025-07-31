// DiscoBall.tsx
import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const DiscoBall: React.FC = () => {
  // useRef에 3D 객체 타입을 명시합니다.
  const groupRef = useRef<THREE.Group>(null!);
  const pointsRef = useRef<THREE.BufferGeometry>(null!);

  const particleCount = 2000;
  const radius = 5;

  const particlePositions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const angleIncrement = Math.PI * 2 * goldenRatio;

    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      const inclination = Math.acos(1 - 2 * t);
      const azimuth = angleIncrement * i;

      const x = radius * Math.sin(inclination) * Math.cos(azimuth);
      const y = radius * Math.sin(inclination) * Math.sin(azimuth);
      const z = radius * Math.cos(inclination);
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    
    return positions;
  }, [particleCount, radius]);

  useFrame((_, delta) => {
    // ref의 current가 null이 아님을 보장 (null! 사용)
    groupRef.current.rotation.y += delta / 4;
    groupRef.current.rotation.x += delta / 10;
  });
  
  useEffect(() => {
    if(pointsRef.current) {
      pointsRef.current.setDrawRange(0, particleCount);
    }
  }, [particleCount]);

  return (
    <group ref={groupRef} dispose={null}>
      <points>
        <bufferGeometry ref={pointsRef}>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particlePositions}
            itemSize={3}
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={"#FFFFFF"}
          size={0.15}
          blending={THREE.AdditiveBlending}
          transparent={true}
          sizeAttenuation={true}
        />
      </points>
    </group>
  );
}

export default DiscoBall;