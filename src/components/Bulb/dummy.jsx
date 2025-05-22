/* eslint-disable react/no-unknown-property */
'use client';
import { useEffect, useRef, useState } from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, Lightformer } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';

// SECTION 1: IMPORTS
// Import your light bulb model
import lightBulbGLB from "./light_bulb (1).glb"; // Change this to your light bulb GLB path

import * as THREE from 'three';

extend({ MeshLineGeometry, MeshLineMaterial });

// SECTION 2: MAIN COMPONENT
// This is the container component that sets up the canvas and physics environment
export default function LightBulb({ 
  position = [0, 0, 30],  // Camera position
  gravity = [0, -40, 0],  // Gravity direction and strength
  fov = 20,               // Field of view for camera
  transparent = true,
  theme      // Whether background is transparent
}) {
  return (
    <div className="relative z-0 w-full h-full flex justify-center items-center transform scale-100 origin-center">
      <Canvas
        camera={{ position: position, fov: fov }}
        gl={{ alpha: transparent }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)}
        shadows // Enable shadows in the canvas
      >
        <ambientLight intensity={Math.PI / 4} /> {/* Reduced ambient light for better shadows */}
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={2} 
          castShadow 
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <Physics gravity={gravity} timeStep={1 / 60}>
          <Wire 
          theme={theme}/> {/* This is where the light bulb and wire are created */}
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
function Wire({ maxSpeed = 50, minSpeed = 0 , theme}) {
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

  const [isOn ,setIsOn] = useState(false)
  
  // Physics properties for segments
  const segmentProps = { 
    type: 'dynamic', 
    canSleep: true, 
    colliders: false, 
    angularDamping: 4, 
    linearDamping: 4 
  };
  
  // SECTION 5: LOAD 3D MODEL
  // Load the light bulb model
  const { nodes, materials } = useGLTF(lightBulbGLB);
  
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

  // SECTION 5.5: POSITIONING AND STRING LENGTH CONTROLS
  // BULB INITIAL POSITION - Change these values to position your bulb
  const BULB_INITIAL_X = 2;     // Horizontal position (left-right)
  const BULB_INITIAL_Y = 0;     // Vertical position (up-down) 
  const BULB_INITIAL_Z = 0;     // Depth position (forward-back)
  
  // STRING LENGTH CONTROLS
  const STRING_SEGMENT_LENGTH = 1;      // Distance between each joint (controls total string length)
  const MAX_DRAG_DISTANCE = 4;         // How far down the bulb can be pulled
  const TOTAL_STRING_LENGTH = STRING_SEGMENT_LENGTH * 3; // Total length when hanging straight
  
  // ANCHOR POSITION - Where the string attaches at the top
  const ANCHOR_X = 0;           // Anchor horizontal position
  const ANCHOR_Y = 4;           // Anchor height position  
  const ANCHOR_Z = 0;           // Anchor depth position
  const fixedAnchorPosition = new THREE.Vector3(ANCHOR_X, ANCHOR_Y, ANCHOR_Z);

  // SECTION 6: PHYSICS JOINTS SETUP
  // Setup rope joints between physics bodies - STRING_SEGMENT_LENGTH controls the distance
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], STRING_SEGMENT_LENGTH]);  
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], STRING_SEGMENT_LENGTH]);     
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], STRING_SEGMENT_LENGTH]);     
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
    // Handle dragging of the bulb with constraints
    if (dragged) {
      // Convert screen coordinates to 3D space
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      
      // Calculate the target position
      const targetPos = new THREE.Vector3(
        vec.x - dragged.x, 
        vec.y - dragged.y, 
        vec.z - dragged.z
      );
      
      // Apply constraints: only allow downward movement and limit distance
      const currentBulbPos = bulb.current.translation();
      const distanceFromAnchor = fixedAnchorPosition.distanceTo(targetPos);
      
      // Constrain X and Z to original position (no horizontal movement)
      targetPos.x = currentBulbPos.x;
      targetPos.z = currentBulbPos.z;
      
      // Constrain Y to only downward movement with maximum distance
      if (targetPos.y > fixedAnchorPosition.y) {
        // Don't allow upward movement beyond the anchor
        targetPos.y = fixedAnchorPosition.y;
      } else if (fixedAnchorPosition.y - targetPos.y > MAX_DRAG_DISTANCE) {
        // Don't allow downward movement beyond the maximum distance
        targetPos.y = fixedAnchorPosition.y - MAX_DRAG_DISTANCE;
      }
      
      // Wake up all physics bodies
      [bulb, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      
      // Move the bulb to the constrained position
      bulb.current?.setNextKinematicTranslation(targetPos);
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

  // Set curve type
  curve.curveType = 'chordal';

  return (
    <>
      {/* SECTION 10: PHYSICS BODIES SETUP */}
      <group position={[ANCHOR_X, ANCHOR_Y, ANCHOR_Z]}>
        {/* Fixed anchor point */}
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        
        {/* Joint 1 - Position based on STRING_SEGMENT_LENGTH */}
        <RigidBody position={[STRING_SEGMENT_LENGTH * 0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        
        {/* Joint 2 */}
        <RigidBody position={[STRING_SEGMENT_LENGTH, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        
        {/* Joint 3 */}
        <RigidBody position={[STRING_SEGMENT_LENGTH * 1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        
        {/* Light bulb rigid body - POSITIONED USING CONSTANTS */}
        <RigidBody 
          position={[BULB_INITIAL_X, BULB_INITIAL_Y, BULB_INITIAL_Z]} 
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
              theme(!isOn)
              setIsOn(!isOn)
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
                <>
                {console.log(nodeName)}
                <mesh 
                  key={nodeName}
                  geometry={nodes[nodeName].geometry} 
                  material={!isOn || nodeName!="Object_4"?
                    nodes[nodeName].material || materials[nodeName]:
                    new THREE.MeshStandardMaterial({
                    color: 'red',
                    emissive: new THREE.Color('orange'),
                    emissiveIntensity: 2 ,
                  })
                  }
                  castShadow    // Enable shadow casting
                  receiveShadow // Enable shadow receiving
                />
                </>
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
      
      {/* Add a ground plane to receive shadows */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
      
      {/* SECTION 14: WIRE RENDERING - FIXED BROWN COLOR */}
      <mesh ref={wire}>
        <meshLineGeometry />
        <meshLineMaterial
          color={new THREE.Color(0x8B4513)} // Brown color using THREE.Color constructor
          depthTest={false}
          resolution={isSmall ? [1000, 2000] : [1000, 1000]}
          lineWidth={1.5} // Wire thickness
          transparent={false}
          opacity={1}
        />
      </mesh>
    </>
  );
}