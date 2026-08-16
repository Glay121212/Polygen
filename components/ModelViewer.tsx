'use client';

import React, { useMemo, useState, Component, ReactNode, ErrorInfo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center } from '@react-three/drei';
import { OBJLoader } from 'three-stdlib';
import * as THREE from 'three';
import { Palette, Sun, RotateCw, Eye, Sparkles, RefreshCw } from 'lucide-react';

interface ModelViewerProps {
  objContent: string;
}

// Error Boundary for Three.js rendering
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("Canvas render error intercepted:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Preset Materials
export const MATERIAL_PRESETS = [
  { id: 'auto', name: 'AI / Multi-Color', color: '#6366f1', metalness: 0.6, roughness: 0.3, auto: true },
  { id: 'steel', name: 'Polished Steel', color: '#94a3b8', metalness: 0.9, roughness: 0.2 },
  { id: 'gold', name: 'Royal Gold', color: '#f59e0b', metalness: 0.9, roughness: 0.2 },
  { id: 'emerald', name: 'Emerald', color: '#10b981', metalness: 0.3, roughness: 0.15 },
  { id: 'ruby', name: 'Ruby', color: '#ef4444', metalness: 0.4, roughness: 0.2 },
  { id: 'neon', name: 'Cyberpunk Blue', color: '#06b6d4', metalness: 0.6, roughness: 0.2 },
  { id: 'obsidian', name: 'Obsidian', color: '#18181b', metalness: 0.8, roughness: 0.2 },
  { id: 'bronze', name: 'Bronze', color: '#d97706', metalness: 0.75, roughness: 0.35 },
  { id: 'wood', name: 'Rustic Wood', color: '#78350f', metalness: 0.05, roughness: 0.85 },
];

// Default group color palette for multi-part objects when 'auto' mode is active
const GROUP_PALETTE = [
  '#cbd5e1', // steel/light metal
  '#f59e0b', // gold/brass
  '#3b82f6', // royal blue
  '#10b981', // emerald green
  '#ef4444', // ruby red
  '#8b5cf6', // amethyst purple
  '#78350f', // leather/wood
  '#06b6d4', // cyan
];

export default function ModelViewer({ objContent }: ModelViewerProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('auto');
  const [customColor, setCustomColor] = useState<string>('#6366f1');
  const [roughness, setRoughness] = useState<number>(0.3);
  const [metalness, setMetalness] = useState<number>(0.6);
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [lighting, setLighting] = useState<'studio' | 'dramatic' | 'warm' | 'cyber'>('studio');
  const [showControls, setShowControls] = useState<boolean>(false);
  const [renderKey, setRenderKey] = useState<number>(0);

  // Parse OBJ and assign materials safely
  const object = useMemo(() => {
    if (!objContent) return null;
    try {
      const loader = new OBJLoader();
      const parsedObject = loader.parse(objContent);
      let meshCount = 0;
      const validMeshes: THREE.Mesh[] = [];

      parsedObject.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const geom = mesh.geometry;

          if (!geom || !geom.attributes.position || geom.attributes.position.count === 0) {
            return;
          }

          // Sanitize position array to prevent NaN bounding sphere errors
          const posArr = geom.attributes.position.array as Float32Array;
          let positionNeedsUpdate = false;
          for (let i = 0; i < posArr.length; i++) {
            if (isNaN(posArr[i]) || !isFinite(posArr[i]) || posArr[i] === null || posArr[i] === undefined) {
              posArr[i] = 0;
              positionNeedsUpdate = true;
            }
          }
          if (positionNeedsUpdate) {
            geom.attributes.position.needsUpdate = true;
          }

          // Sanitize normals if present
          if (geom.attributes.normal) {
            const normArr = geom.attributes.normal.array as Float32Array;
            let normNeedsUpdate = false;
            for (let i = 0; i < normArr.length; i++) {
              if (isNaN(normArr[i]) || !isFinite(normArr[i]) || normArr[i] === null) {
                normArr[i] = 0;
                normNeedsUpdate = true;
              }
            }
            if (normNeedsUpdate) {
              geom.attributes.normal.needsUpdate = true;
            }
          }

          // Sanitize colors if present
          let hasValidVertexColors = false;
          if (geom.attributes.color) {
            const colArr = geom.attributes.color.array as Float32Array;
            let colNeedsUpdate = false;
            for (let i = 0; i < colArr.length; i++) {
              if (isNaN(colArr[i]) || !isFinite(colArr[i]) || colArr[i] === null) {
                colArr[i] = 0.8;
                colNeedsUpdate = true;
              }
            }
            if (colNeedsUpdate) {
              geom.attributes.color.needsUpdate = true;
            }
            hasValidVertexColors = colArr.length >= geom.attributes.position.count * 3;
          }

          // Safely recompute bounds
          try {
            geom.computeVertexNormals();
            geom.computeBoundingBox();
            geom.computeBoundingSphere();
            if (!geom.boundingSphere || isNaN(geom.boundingSphere.radius) || !isFinite(geom.boundingSphere.radius)) {
              geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1);
            }
          } catch (e) {
            console.warn("Bounds compute fallback", e);
            geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1);
          }

          let matColor = customColor;
          let matMetal = metalness;
          let matRough = roughness;

          if (selectedPreset === 'auto') {
            if (hasValidVertexColors) {
              mesh.material = new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.3,
                metalness: 0.5,
                wireframe: isWireframe,
                side: THREE.DoubleSide,
              });
              validMeshes.push(mesh);
              meshCount++;
              return;
            } else {
              const colorIdx = meshCount % GROUP_PALETTE.length;
              const nameLower = (mesh.name || '').toLowerCase();
              if (nameLower.includes('blade') || nameLower.includes('steel') || nameLower.includes('metal')) {
                matColor = '#94a3b8';
              } else if (nameLower.includes('guard') || nameLower.includes('pommel') || nameLower.includes('gold')) {
                matColor = '#f59e0b';
              } else if (nameLower.includes('handle') || nameLower.includes('wood') || nameLower.includes('grip')) {
                matColor = '#78350f';
              } else if (nameLower.includes('gem') || nameLower.includes('crystal') || nameLower.includes('ruby')) {
                matColor = '#ef4444';
              } else {
                matColor = GROUP_PALETTE[colorIdx];
              }
            }
          } else {
            const preset = MATERIAL_PRESETS.find(p => p.id === selectedPreset);
            if (preset && !preset.auto) {
              matColor = preset.color;
              matMetal = preset.metalness;
              matRough = preset.roughness;
            }
          }

          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(matColor),
            roughness: matRough,
            metalness: matMetal,
            wireframe: isWireframe,
            side: THREE.DoubleSide,
          });

          validMeshes.push(mesh);
          meshCount++;
        }
      });

      if (validMeshes.length === 0) {
        return null;
      }

      return parsedObject;
    } catch (e) {
      console.error("Failed to parse OBJ", e);
      return null;
    }
  }, [objContent, selectedPreset, customColor, roughness, metalness, isWireframe]);

  if (!objContent) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500 text-sm p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3 text-zinc-400">
          <Sparkles size={24} />
        </div>
        <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">Your 3D model will appear here</p>
        <p className="text-xs text-zinc-400 max-w-xs">Enter a prompt on the left and click &quot;Generate 3D Model&quot; to create and preview an object.</p>
      </div>
    );
  }

  if (!object) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-red-500 text-sm p-6 text-center">
        <p className="font-semibold mb-1">Could not render 3D model</p>
        <p className="text-xs text-zinc-500 max-w-xs mb-3">The generated OBJ structure had geometry formatting issues. Please try clicking Generate again.</p>
        <button
          onClick={() => setRenderKey(k => k + 1)}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-medium hover:bg-zinc-700 flex items-center gap-1.5"
        >
          <RefreshCw size={12} />
          <span>Retry Render</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 relative group select-none">
      
      {/* 3D Canvas with Error Boundary */}
      <CanvasErrorBoundary
        key={`canvas-${renderKey}`}
        fallback={
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 text-xs gap-2">
            <p>Error displaying 3D canvas</p>
            <button
              onClick={() => setRenderKey(k => k + 1)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-medium hover:bg-zinc-700"
            >
              Reload View
            </button>
          </div>
        }
      >
        <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
          {/* Dynamic Lighting */}
          {lighting === 'studio' && (
            <>
              <ambientLight intensity={0.9} />
              <directionalLight position={[10, 10, 8]} intensity={1.8} />
              <directionalLight position={[-10, -5, -5]} intensity={0.6} color="#60a5fa" />
            </>
          )}
          {lighting === 'warm' && (
            <>
              <ambientLight intensity={0.8} color="#fef3c7" />
              <directionalLight position={[5, 12, 5]} intensity={2.0} color="#f59e0b" />
              <directionalLight position={[-8, -4, -4]} intensity={0.5} color="#fbbf24" />
            </>
          )}
          {lighting === 'cyber' && (
            <>
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 5, 5]} intensity={2.5} color="#06b6d4" />
              <directionalLight position={[-10, 5, -5]} intensity={2.5} color="#ec4899" />
            </>
          )}
          {lighting === 'dramatic' && (
            <>
              <ambientLight intensity={0.3} />
              <directionalLight position={[15, 20, 10]} intensity={2.5} />
              <directionalLight position={[-10, -10, -10]} intensity={0.2} />
            </>
          )}

          <Center>
            <primitive object={object} />
          </Center>
          <OrbitControls makeDefault autoRotate={autoRotate} autoRotateSpeed={2.5} enablePan={true} enableZoom={true} />
        </Canvas>
      </CanvasErrorBoundary>

      {/* Floating Toolbar Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          title="Toggle Auto Rotate"
          className={`p-2.5 rounded-xl backdrop-blur-md border text-xs font-medium transition-all ${
            autoRotate 
              ? 'bg-indigo-600/90 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' 
              : 'bg-zinc-900/80 text-zinc-300 border-zinc-700/80 hover:bg-zinc-800'
          }`}
        >
          <RotateCw size={15} className={autoRotate ? 'animate-spin [animation-duration:8s]' : ''} />
        </button>

        <button
          onClick={() => setIsWireframe(!isWireframe)}
          title="Toggle Wireframe"
          className={`p-2.5 rounded-xl backdrop-blur-md border text-xs font-medium transition-all ${
            isWireframe 
              ? 'bg-indigo-600/90 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' 
              : 'bg-zinc-900/80 text-zinc-300 border-zinc-700/80 hover:bg-zinc-800'
          }`}
        >
          <Eye size={15} />
        </button>

        <button
          onClick={() => setShowControls(!showControls)}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl backdrop-blur-md border text-xs font-medium transition-all ${
            showControls 
              ? 'bg-white text-zinc-900 border-white shadow-lg' 
              : 'bg-zinc-900/80 text-zinc-200 border-zinc-700/80 hover:bg-zinc-800'
          }`}
        >
          <Palette size={15} />
          <span>Colors & Materials</span>
        </button>
      </div>

      {/* Control Drawer Popover */}
      {showControls && (
        <div className="absolute top-16 right-4 w-72 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 shadow-2xl z-20 text-zinc-200 text-xs flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Material Presets */}
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Material Presets</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MATERIAL_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-[11px] ${
                    selectedPreset === preset.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-medium'
                      : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm shrink-0"
                    style={{
                      background: preset.auto 
                        ? 'linear-gradient(135deg, #3b82f6, #f59e0b, #ef4444)' 
                        : preset.color 
                    }}
                  />
                  <span className="truncate w-full text-center">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color Picker */}
          {selectedPreset !== 'auto' && (
            <div className="flex items-center justify-between bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-700/50">
              <span className="text-zinc-300 font-medium">Custom Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setSelectedPreset('custom');
                    setCustomColor(e.target.value);
                  }}
                  className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <span className="font-mono text-[11px] text-zinc-400 uppercase">{customColor}</span>
              </div>
            </div>
          )}

          {/* Lighting Mode */}
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sun size={12} />
              <span>Lighting</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(['studio', 'warm', 'cyber', 'dramatic'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setLighting(mode)}
                  className={`py-1.5 px-2 rounded-lg capitalize text-center border transition-all ${
                    lighting === mode
                      ? 'bg-zinc-100 text-zinc-900 font-semibold border-white'
                      : 'bg-zinc-800/40 text-zinc-400 border-zinc-700/40 hover:bg-zinc-800'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3 pt-1 border-t border-zinc-800">
            <div>
              <div className="flex justify-between text-zinc-400 mb-1 text-[11px]">
                <span>Metalness</span>
                <span>{Math.round(metalness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={metalness}
                onChange={(e) => setMetalness(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 bg-zinc-800 h-1 rounded-lg"
              />
            </div>
            <div>
              <div className="flex justify-between text-zinc-400 mb-1 text-[11px]">
                <span>Roughness</span>
                <span>{Math.round(roughness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={roughness}
                onChange={(e) => setRoughness(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 bg-zinc-800 h-1 rounded-lg"
              />
            </div>
          </div>

        </div>
      )}

      {/* Helper indicator */}
      <div className="absolute bottom-4 left-4 pointer-events-none bg-black/50 backdrop-blur-md text-zinc-300 text-[11px] px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
        <span>🖱️ Drag to rotate • Scroll to zoom</span>
      </div>

    </div>
  );
}


