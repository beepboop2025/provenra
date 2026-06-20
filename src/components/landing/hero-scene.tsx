"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, Lightformer } from "@react-three/drei";
import { MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";

/**
 * The hero's WebGL motif: a glass capsule (the pharmaceutical "pack") suspended
 * inside a thin orbiting ring (its chain of custody), refracting a warm key
 * light and a clinical-teal rim over near-black.
 *
 * This whole module is dynamically imported with `ssr: false` from a Client
 * Component, so none of it runs during prerender — the discipline that keeps
 * the page free of the hydration errors the reference site shipped.
 *
 * `animate=false` (reduced-motion) renders a single static frame: no Float, no
 * per-frame parallax, frameloop parked on demand.
 */

function GlassCapsule() {
  return (
    <mesh rotation={[0.5, 0.2, 0.9]} castShadow>
      <capsuleGeometry args={[0.62, 1.5, 24, 48]} />
      <MeshTransmissionMaterial
        // sample count kept low — transmission is the expensive material
        samples={6}
        resolution={256}
        thickness={1.1}
        roughness={0.06}
        ior={1.42}
        chromaticAberration={0.28}
        anisotropicBlur={0.4}
        distortion={0.2}
        distortionScale={0.3}
        temporalDistortion={0.1}
        color="#eadbcb"
        attenuationColor="#7fe6d6"
        attenuationDistance={2.4}
        backside
      />
    </mesh>
  );
}

function ChainRing({ animate }: { animate: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (animate && ref.current) ref.current.rotation.z += dt * 0.12;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2.4, 0, 0]}>
      <torusGeometry args={[2.05, 0.018, 16, 160]} />
      <meshStandardMaterial
        color="#c8a98f"
        metalness={0.9}
        roughness={0.25}
        emissive="#3a2c20"
        emissiveIntensity={0.4}
      />
    </mesh>
  );
}

/** Faint drifting particle field for parallax depth. */
function Dust({ count = 90 }: { count?: number }) {
  const positions = useMemo(() => {
    // Deterministic pseudo-random (seeded) so it never causes layout surprises.
    const arr = new Float32Array(count * 3);
    let s = 1337;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rand() - 0.5) * 11;
      arr[i * 3 + 1] = (rand() - 0.5) * 7;
      arr[i * 3 + 2] = (rand() - 0.5) * 5 - 1;
    }
    return arr;
  }, [count]);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  return (
    <points geometry={geom}>
      <pointsMaterial size={0.022} color="#e9d9c8" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

function Rig({ animate, children }: { animate: boolean; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  // The canvas is click-through (pointer-events:none) so the CTAs over it stay
  // clickable — which means R3F's own pointer is never updated. Track the
  // cursor at the window level instead.
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (!animate) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [animate]);

  useFrame(() => {
    if (!animate || !group.current) return;
    const px = pointer.current.x * 0.25;
    const py = pointer.current.y * 0.18;
    group.current.rotation.y += (px - group.current.rotation.y) * 0.05;
    group.current.rotation.x += (-py - group.current.rotation.x) * 0.05;
  });
  return <group ref={group}>{children}</group>;
}

export default function HeroScene({ animate = true }: { animate?: boolean }) {
  const content = (
    <>
      <ChainRing animate={animate} />
      {animate ? (
        <Float speed={1.4} rotationIntensity={0.5} floatIntensity={0.9}>
          <GlassCapsule />
        </Float>
      ) : (
        <GlassCapsule />
      )}
      <Dust />
    </>
  );

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 42 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true }}
      frameloop={animate ? "always" : "demand"}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Self-contained light rig — baked from Lightformers, no external HDRI. */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 5]} intensity={1.2} color="#f4e3d4" />
      <pointLight position={[-4, -2, 2]} intensity={40} color="#2dd4bf" distance={12} decay={2} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 3, 3]} scale={[6, 3, 1]} color="#f4e3d4" />
        <Lightformer form="rect" intensity={1.4} position={[-4, 0, 2]} scale={[3, 6, 1]} color="#2dd4bf" />
        <Lightformer form="ring" intensity={1.2} position={[4, -1, -2]} scale={3} color="#c8a98f" />
      </Environment>

      <Rig animate={animate}>{content}</Rig>
    </Canvas>
  );
}
