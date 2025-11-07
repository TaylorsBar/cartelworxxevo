
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useVehicleStore } from '../../store/useVehicleStore';

const RPM_AXIS = [800, 1500, 2500, 3500, 4500, 5500, 6500, 7500];
const LOAD_AXIS = [20, 30, 40, 50, 60, 70, 80, 100];

// Helper to map a value from one range to another
const mapRange = (value: number, in_min: number, in_max: number, out_min: number, out_max: number) => {
  return ((value - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;
};


const EngineTracer = () => {
  const tracerRef = useRef<THREE.Mesh>(null!);
  const { latestData } = useVehicleStore(state => ({ latestData: state.latestData }));

  useFrame(() => {
    if (tracerRef.current && latestData) {
        const { rpm, engineLoad } = latestData;
        // Clamp values to the axis ranges to keep the tracer on the map
        const clampedRpm = Math.max(RPM_AXIS[0], Math.min(rpm, RPM_AXIS[RPM_AXIS.length - 1]));
        const clampedLoad = Math.max(LOAD_AXIS[0], Math.min(engineLoad, LOAD_AXIS[LOAD_AXIS.length - 1]));

        // Map RPM/Load to the 3D plane coordinates (-5 to 5 for a plane of size 10)
        const x = mapRange(clampedRpm, RPM_AXIS[0], RPM_AXIS[RPM_AXIS.length - 1], -5, 5);
        const y = mapRange(clampedLoad, LOAD_AXIS[0], LOAD_AXIS[LOAD_AXIS.length - 1], -5, 5);
        
        // Since the plane is rotated, Z in world space corresponds to Y in plane space
        tracerRef.current.position.set(x, y, 2.5); // Start high to be visible
    }
  });

  return (
    <mesh ref={tracerRef}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshBasicMaterial color="#ff00ff" transparent opacity={0.8} />
    </mesh>
  );
};


interface TuningMap3DProps {
  title: string;
  data: number[][];
  xAxisLabels: string[];
  yAxisLabels: string[];
  onChange: (row: number, col: number, value: number) => void;
}

const HeatmapSurface: React.FC<Omit<TuningMap3DProps, 'title'>> = ({ data, xAxisLabels, yAxisLabels, onChange }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const { camera, raycaster, scene } = useThree();
  const [hovered, setHovered] = useState<{ row: number; col: number; pos: THREE.Vector3 } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedVertex, setSelectedVertex] = useState<{ index: number, row: number, col: number } | null>(null);

  const { geometry, minVal, maxVal, rows, cols } = useMemo(() => {
    const rows = data.length;
    const cols = data[0].length;
    const allValues = data.flat();
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues, minVal + 0.1); // Avoid division by zero

    const geometry = new THREE.PlaneGeometry(10, 10, cols - 1, rows - 1);
    const vertices = geometry.attributes.position.array as Float32Array;

    for (let i = 0, row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const value = data[row][col];
        const z = mapRange(value, minVal, maxVal, -1.5, 1.5);
        vertices[(row * cols + col) * 3 + 2] = z;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    return { geometry, minVal, maxVal, rows, cols };
  }, [data]);

  const colors = useMemo(() => {
    const colorArray = new Float32Array(rows * cols * 3);
    const allValues = data.flat();
    const min = Math.min(...allValues);
    const max = Math.max(...allValues, min + 0.1);
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const value = data[row][col];
        const ratio = mapRange(value, min, max, 0, 1);
        const color = new THREE.Color();
        color.setHSL((1 - ratio) * 0.7, 0.9, 0.55);
        color.toArray(colorArray, (row * cols + col) * 3);
      }
    }
    return colorArray;
  }, [data, rows, cols]);

  useEffect(() => {
    if (!geometry.attributes.color) {
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    } else {
        (geometry.attributes.color as THREE.BufferAttribute).set(colors);
        geometry.attributes.color.needsUpdate = true;
    }
  }, [colors, geometry]);


  const getVertexFromIntersection = (intersect: THREE.Intersection) => {
      if (!('face' in intersect) || !intersect.face) return null;
      const face = intersect.face;
      const vertices = (meshRef.current.geometry.attributes.position as THREE.BufferAttribute).array;
      
      const indices = [face.a, face.b, face.c];
      let closestVertex = -1;
      let minDistance = Infinity;

      indices.forEach(index => {
          const vertexPos = new THREE.Vector3().fromArray(vertices, index * 3);
          const distance = intersect.point.distanceTo(vertexPos);
          if (distance < minDistance) {
              minDistance = distance;
              closestVertex = index;
          }
      });

      if(closestVertex !== -1) {
        const col = closestVertex % cols;
        const row = Math.floor(closestVertex / cols);
        return { index: closestVertex, row, col };
      }
      return null;
  }

  const handlePointerDown = (e: any) => {
      e.stopPropagation();
      const intersects = e.intersections;
      if (intersects.length > 0) {
          const result = getVertexFromIntersection(intersects[0]);
          if (result) {
            setIsDragging(true);
            setSelectedVertex(result);
            (e.target as HTMLCanvasElement).style.cursor = 'grabbing';
          }
      }
  };

  const handlePointerUp = (e: any) => {
      e.stopPropagation();
      setIsDragging(false);
      setSelectedVertex(null);
      (e.target as HTMLCanvasElement).style.cursor = 'grab';
  };

  const handlePointerMove = (e: any) => {
      e.stopPropagation();
       if (!isDragging) {
          const intersects = e.intersections;
          if (intersects.length > 0) {
              (e.target as HTMLCanvasElement).style.cursor = 'grab';
              const result = getVertexFromIntersection(intersects[0]);
              if(result) {
                const pos = new THREE.Vector3().fromArray(geometry.attributes.position.array, result.index * 3);
                setHovered({row: result.row, col: result.col, pos});
              }
          } else {
              (e.target as HTMLCanvasElement).style.cursor = 'auto';
              setHovered(null);
          }
      } else if (isDragging && selectedVertex) {
          const { movementY } = e.nativeEvent;
          const currentZ = geometry.attributes.position.getZ(selectedVertex.index);
          const newZ = currentZ - movementY * 0.02;
          
          geometry.attributes.position.setZ(selectedVertex.index, newZ);
          geometry.attributes.position.needsUpdate = true;
          geometry.computeVertexNormals();

          const newValue = mapRange(newZ, -1.5, 1.5, minVal, maxVal);
          onChange(selectedVertex.row, selectedVertex.col, newValue);
      }
  };


  return (
    <mesh 
      ref={meshRef} 
      rotation={[-Math.PI / 2.2, 0, 0]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerOut={handlePointerUp} // If mouse leaves canvas
      onPointerMove={handlePointerMove}
    >
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
      {hovered && !isDragging && (
        <Html position={hovered.pos.clone().setZ(hovered.pos.z + 0.3)} center>
          <div className="bg-gray-800/80 text-white backdrop-blur-sm p-2 rounded text-xs shadow-lg">
            <div>RPM: {xAxisLabels[hovered.col]}</div>
            <div>Load: {yAxisLabels[hovered.row]}</div>
            <div>Value: {data[hovered.row][hovered.col].toFixed(2)}</div>
          </div>
        </Html>
      )}
    </mesh>
  );
};

const TuningMap3D: React.FC<TuningMap3DProps> = (props) => {
  return (
    <div className="h-96 lg:h-full w-full rounded-lg relative glass-panel select-none">
       <h3 className="text-md font-semibold text-center absolute top-2 left-1/2 -translate-x-1/2 z-10 font-display pointer-events-none">{props.title}</h3>
      <Canvas camera={{ position: [0, 8, 12], fov: 60 }} dpr={[1, 2]}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 15, 10]} intensity={1.5} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        <gridHelper args={[10, 10, '#888', '#444']} position={[0, -1.5, 0]}/>
        <group rotation={[Math.PI / 2.2, 0, 0]}>
            <EngineTracer />
        </group>
        <HeatmapSurface {...props} />
        <axesHelper args={[5]} />
      </Canvas>
    </div>
  );
};

export default TuningMap3D;
