"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Environment, Lightformer, MeshDistortMaterial } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

/**
 * The hallmark 3D: a liquid, Perlin-noise-displaced blob (drei's
 * MeshDistortMaterial over a high-detail icosphere) glowing under bloom, in the
 * icy/peach accent. The camera dollies back as you scroll (their tunnel-style
 * scroll-driven move), and the blob parallaxes to the pointer.
 *
 * Dynamically imported with `ssr:false` from a Client Component, so none of it
 * runs during prerender — no hydration error surface.
 *
 * `animate=false` (reduced motion): no distortion travel, no camera move, no
 * parallax; frameloop parks on demand.
 */

function LiquidBlob({ animate }: { animate: boolean }) {
  return (
    <mesh>
      {/* high segment count so the noise displacement reads as smooth liquid
          (MeshDistortMaterial displaces vertices, so it needs the resolution) */}
      <sphereGeometry args={[1.6, 96, 96]} />
      <MeshDistortMaterial
        color="#a1ecff"
        emissive="#2a6f86"
        emissiveIntensity={0.35}
        roughness={0.12}
        metalness={0.35}
        distort={animate ? 0.42 : 0.3}
        speed={animate ? 1.6 : 0}
        radius={1}
      />
    </mesh>
  );
}

/** Faint drifting particle field for parallax depth. */
function Dust({ count = 90 }: { count?: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    let s = 1337;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rand() - 0.5) * 12;
      arr[i * 3 + 1] = (rand() - 0.5) * 8;
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
      <pointsMaterial size={0.022} color="#cfe2ff" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

/** Pointer parallax (window-level, since the canvas is click-through). */
function Rig({ animate, children }: { animate: boolean; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
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
    const px = pointer.current.x * 0.3;
    const py = pointer.current.y * 0.2;
    group.current.rotation.y += (px - group.current.rotation.y) * 0.05;
    group.current.rotation.x += (-py - group.current.rotation.x) * 0.05;
  });
  return <group ref={group}>{children}</group>;
}

/** Scroll-driven camera dolly — pulls back + drifts up as the hero scrolls away. */
function ScrollDolly({ animate }: { animate: boolean }) {
  const camera = useThree((s) => s.camera);
  useFrame(() => {
    if (!animate) return;
    const max = typeof window !== "undefined" ? window.innerHeight : 1;
    const p = Math.min(1, (typeof window !== "undefined" ? window.scrollY : 0) / max);
    const targetZ = 5 + p * 3.5; // dolly back 5 → 8.5
    const targetY = p * 1.2; // drift up
    camera.position.z += (targetZ - camera.position.z) * 0.08;
    camera.position.y += (targetY - camera.position.y) * 0.08;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function HeroScene({ animate = true }: { animate?: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 42 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true }}
      frameloop={animate ? "always" : "demand"}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} color="#ffab98" />
      <pointLight position={[-4, -1, 3]} intensity={45} color="#a1ecff" distance={14} decay={2} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 3, 3]} scale={[6, 3, 1]} color="#ffab98" />
        <Lightformer form="rect" intensity={1.6} position={[-4, 0, 2]} scale={[3, 6, 1]} color="#a1ecff" />
        <Lightformer form="ring" intensity={1.1} position={[4, -1, -2]} scale={3} color="#ffffff" />
      </Environment>

      <Rig animate={animate}>
        {animate ? (
          <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.8}>
            <LiquidBlob animate={animate} />
          </Float>
        ) : (
          <LiquidBlob animate={animate} />
        )}
        <Dust />
      </Rig>

      <ScrollDolly animate={animate} />

      <EffectComposer>
        <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.2} luminanceSmoothing={0.4} />
      </EffectComposer>
    </Canvas>
  );
}
