/* eslint-disable react/no-unknown-property */
'use client';
import { useEffect, useRef, useState } from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import { useGLTF, useTexture, Environment, Lightformer } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';

// SECTION 1: IMPORTS
// Import your light bulb model and any textures
import lightBulbGLB from "./light_bulb (1).glb"; // Change this to your light bulb GLB path
import wireTexture from "./lanyard.png"; // Change this to your wire texture path

import * as THREE from 'three';

extend({ MeshLineGeometry, MeshLineMaterial });

// SECTION 2: MAIN COMPONENT
// This is the container component that sets up the canvas and physics environment
export default function LightBulb({ 
  position = [0, 0, 30],  // Camera position
  gravity = [0, -40, 0],  // Gravity direction and strength
  fov = 20,               // Field of view for camera
  transparent = true      // Whether background is transparent
}) {
  return (
    <div className="relative z-0 w-full h-full flex justify-center items-center transform scale-100 origin-center">
      <Canvas
        camera={{ position: position, fov: fov }}
        gl={{ alpha: transparent }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)}
      >
        <ambientLight intensity={Math.PI} />
        <Physics gravity={gravity} timeStep={1 / 60}>
          <Wire /> {/* This is where the light bulb and wire are created */}
        </Physics>
        {/* SECTION 3: LIGHTING SETUP */}
        <Environment blur={0.75}>
          <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={10} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
        </Environment>
      </Canvas>
    </div>
  );
}

// SECTION 4: WIRE AND BULB COMPONENT
function Wire({ maxSpeed = 50, minSpeed = 0 }) {
  // References to different parts of the physics setup
  const wire = useRef();       // Reference to the wire mesh
  const fixed = useRef();      // Fixed anchor point at the top
  const j1 = useRef();         // Joint 1 (physics body)
  const j2 = useRef();         // Joint 2 (physics body)
  const j3 = useRef();         // Joint 3 (physics body)
  const bulb = useRef();       // Light bulb (physics body)
  
  // Utility vectors for calculations
  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();
  
  // Physics properties for segments
  const segmentProps = { 
    type: 'dynamic', 
    canSleep: true, 
    colliders: false, 
    angularDamping: 4, 
    linearDamping: 4 
  };
  
  // SECTION 5: LOAD 3D MODEL AND TEXTURES
  // Load the light bulb model
  const { nodes, materials } = useGLTF(lightBulbGLB);
  // Load the wire texture
  const texture = useTexture(wireTexture);
  
  // Create a curve for the wire
  const [curve] = useState(() => 
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(), 
      new THREE.Vector3(), 
      new THREE.Vector3(), 
      new THREE.Vector3()
    ])
  );
  
  // State for drag interactions
  const [dragged, drag] = useState(false);
  const [hovered, hover] = useState(false);
  
  // State for responsive design
  const [isSmall, setIsSmall] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 1024
  );

  // SECTION 6: PHYSICS JOINTS SETUP
  // Setup rope joints between physics bodies
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);  // Connect fixed point to j1
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);     // Connect j1 to j2
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);     // Connect j2 to j3
  useSphericalJoint(j3, bulb, [[0, 0, 0], [0, 1.50, 0]]); // Connect j3 to the bulb

  // SECTION 7: CURSOR EFFECTS
  // Change cursor on hover and drag
  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab';
      return () => void (document.body.style.cursor = 'auto');
    }
  }, [hovered, dragged]);

  // SECTION 8: RESPONSIVE HANDLING
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsSmall(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // SECTION 9: ANIMATION LOOP
  // This runs every frame, updating the physics and visuals
  useFrame((state, delta) => {
    // Handle dragging of the bulb
    if (dragged) {
      // Convert screen coordinates to 3D space
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      
      // Wake up all physics bodies
      [bulb, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      
      // Move the bulb with pointer
      bulb.current?.setNextKinematicTranslation({ 
        x: vec.x - dragged.x, 
        y: vec.y - dragged.y, 
        z: vec.z - dragged.z 
      });
    }
    
    // Update wire positions and physics
    if (fixed.current) {
      // Smooth physics positions for a more natural movement
      [j1, j2].forEach((ref) => {
        if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
        const clampedDistance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())));
        ref.current.lerped.lerp(ref.current.translation(), delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed)));
      });
      
      // Update curve points for the wire
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.lerped);
      curve.points[2].copy(j1.current.lerped);
      curve.points[3].copy(fixed.current.translation());
      
      // Set the points for the wire geometry
      wire.current.geometry.setPoints(curve.getPoints(32));
      
      // Add a swinging damping effect to the bulb
      ang.copy(bulb.current.angvel());
      rot.copy(bulb.current.rotation());
      bulb.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
    }
  });

  // Set curve type and texture wrapping
  curve.curveType = 'chordal';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  return (
    <>
      {/* SECTION 10: PHYSICS BODIES SETUP */}
      <group position={[0, 4, 0]}>
        {/* Fixed anchor point */}
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        
        {/* Joint 1 */}
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        
        {/* Joint 2 */}
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        
        {/* Joint 3 */}
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        
        {/* Light bulb rigid body */}
        <RigidBody 
          position={[2, 0, 0]} 
          ref={bulb} 
          {...segmentProps} 
          type={dragged ? 'kinematicPosition' : 'dynamic'}
        >
          {/* Collider for the light bulb */}
          <CuboidCollider args={[0.5, 0.75, 0.5]} /> {/* Adjust these args to match your light bulb size */}
          
          {/* SECTION 11: 3D MODEL SETUP */}
          <group
            // SECTION 12: MODEL SIZING AND POSITIONING
            scale={0.5} // Adjust this value to resize the model
            position={[0, 1.5, 0]} // Adjust position to center the model
            // Rotate the model 180 degrees around X-axis to flip it upside down
            rotation={[Math.PI/2,0,0]} // Use [Math.PI, 0, 0] to rotate 180° around X-axis
            
            // SECTION 13: INTERACTION HANDLERS
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e) => {
              e.target.releasePointerCapture(e.pointerId);
              drag(false);
            }}
            onPointerDown={(e) => {
              e.target.setPointerCapture(e.pointerId);
              drag(new THREE.Vector3().copy(e.point).sub(vec.copy(bulb.current.translation())));
            }}
          >
            {/* REPLACE THIS SECTION with your light bulb model parts */}
            {/* Example (you'll need to adjust based on your actual model structure): */}
            {Object.keys(nodes).map((nodeName) => {
              // Skip non-mesh nodes
              if (!nodes[nodeName].geometry) return null;
              
              return (
                <mesh 
                  key={nodeName}
                  geometry={nodes[nodeName].geometry} 
                  material={nodes[nodeName].material || materials[nodeName]}
                />
              );
            })}
            
            {/* Alternative if you know the specific parts of your model: */}
            {/* <mesh geometry={nodes.bulbBase.geometry} material={materials.metal} />
            <mesh geometry={nodes.glass.geometry}>
              <meshPhysicalMaterial transparent opacity={0.5} roughness={0} transmission={1} />
            </mesh>
            <mesh geometry={nodes.filament.geometry}>
              <meshStandardMaterial emissive="#ffaa00" emissiveIntensity={2} />
            </mesh> */}
          </group>
        </RigidBody>
      </group>
      
      {/* SECTION 14: WIRE RENDERING */}
      <mesh ref={wire}>
        <meshLineGeometry />
        <meshLineMaterial
          color="black" // Change the color of the wire
          depthTest={false}
          resolution={isSmall ? [1000, 2000] : [1000, 1000]}
          useMap
          map={texture}
          repeat={[-4, 1]}
          lineWidth={0.8} // Adjust thickness of the wire
        />
      </mesh>
    </>
  );
}