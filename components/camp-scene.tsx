"use client"

import { Suspense, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Environment, Text } from "@react-three/drei"
import type * as THREE from "three"

function CampText() {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1
      ref.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1 + 1.5
    }
  })

  return (
    <Text
      ref={ref}
      position={[0, 1.5, 0]}
      fontSize={0.5}
      color="#C5E17E"
      font="/fonts/Geist_Bold.json"
      anchorX="center"
      anchorY="middle"
    >
      PEcoin Camp
    </Text>
  )
}

function CampEnvironment() {
  return (
    <>
      <Environment preset="sunset" />
      <mesh position={[0, 10, -15]} scale={5}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#6ABECD" />
      </mesh>
    </>
  )
}

interface CampSceneProps {
  className?: string
}

export function CampScene({ className = "" }: CampSceneProps) {
  return (
    <div className={`h-64 w-full rounded-2xl overflow-hidden ${className}`}>
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <mesh position={[0, -1, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#C5E17E" />
          </mesh>
          <CampText />
          <CampEnvironment />
          <OrbitControls enableZoom={false} enablePan={false} />
        </Suspense>
      </Canvas>
    </div>
  )
}
