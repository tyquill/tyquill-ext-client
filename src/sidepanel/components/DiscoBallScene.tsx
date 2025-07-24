// DiscoBallScene.tsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import DiscoBall from './DiscoBall';

const DiscoBallScene: React.FC = () => {
  return (
    <Canvas camera={{ position: [0, 0, 15], fov: 75 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      
      <DiscoBall />
    </Canvas>
  );
}

export default DiscoBallScene;