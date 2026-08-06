'use client';

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center } from '@react-three/drei';
import { OBJLoader } from 'three-stdlib';
import * as THREE from 'three';

interface ModelViewerProps {
  objContent: string;
}

export default function ModelViewer({ objContent }: ModelViewerProps) {
  const object = useMemo(() => {
    if (!objContent) return null;
    try {
      const loader = new OBJLoader();
      const parsedObject = loader.parse(objContent);
      
      // Apply a default material to all children if they are meshes
      parsedObject.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = new THREE.MeshStandardMaterial({ 
            color: '#94a3b8', 
            roughness: 0.4, 
            metalness: 0.6,
            side: THREE.DoubleSide 
          });
        }
      });
      return parsedObject;
    } catch (e) {
      console.error("Failed to parse OBJ", e);
      return null;
    }
  }, [objContent]);

  if (!objContent) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-box mb-2 opacity-50"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
        Your 3D model will appear here
      </div>
    );
  }

  if (!object) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-red-500 text-sm p-4 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-triangle-alert mb-2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        Failed to parse 3D model. The AI might have generated an invalid OBJ file. Please try a different prompt.
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-zinc-100 dark:bg-zinc-950 rounded-xl overflow-hidden shadow-inner border border-zinc-200 dark:border-zinc-800 relative cursor-move">
      <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />
        <Center>
          <primitive object={object} />
        </Center>
        <OrbitControls makeDefault autoRotate autoRotateSpeed={2} enablePan={true} enableZoom={true} />
      </Canvas>
      <div className="absolute bottom-4 right-4 pointer-events-none bg-black/40 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md">
        Drag to rotate â Scroll to zoom
      </div>
    </div>
  );
}
