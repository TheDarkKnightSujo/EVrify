import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';

const CarModel = () => {
  const { scene } = useGLTF('/car_model.glb');
  
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Make the car black
          if (child.material) {
            child.material = child.material.clone();
            if (child.material.color) {
              child.material.color.set('#111111');
            }
            child.material.roughness = 0.4;
            child.material.metalness = 0.6;
          }
        }
      });
    }
  }, [scene]);

  return <primitive object={scene} scale={1.2} position={[0, -0.65, 0]} />;
};

const ChargingBase = () => {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    // Throbbing effect (0 to 1)
    const intensity = (Math.sin(time * 4) + 1) / 2;
    
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 0.5 + intensity * 2;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 1 + intensity * 3;
    }
  });

  return (
    <group position={[0, -1, 0]}>
      {/* Dark base pad */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[2.5, 2.6, 0.1, 64]} />
        <meshStandardMaterial color="#0A1510" />
      </mesh>
      
      {/* Glowing ring */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.4, 64]} />
        <meshStandardMaterial 
          ref={materialRef}
          color="#4CAF7D" 
          emissive="#4CAF7D"
          emissiveIntensity={2}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Throbbing green light */}
      <pointLight 
        ref={lightRef}
        color="#4CAF7D" 
        position={[0, 0.2, 0]} 
        distance={6} 
        intensity={2} 
      />
    </group>
  );
};

const EVChargingScene = () => {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas camera={{ position: [5, 3, 5], fov: 45 }}>
        <color attach="background" args={['#F4F0E6']} />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        <Environment preset="city" />
        
        <Suspense fallback={null}>
          <CarModel />
          <ChargingBase />
        </Suspense>
        
        {/* Controls */}
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          autoRotate 
          autoRotateSpeed={1.5} 
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  );
};

export default EVChargingScene;
