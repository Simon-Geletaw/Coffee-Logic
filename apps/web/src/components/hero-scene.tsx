"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type SceneProps = { running: boolean; onReady: () => void; onFailure: () => void };
const COUNT = 140;

function createBean() {
  const geometry = new THREE.SphereGeometry(1, 40, 28);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const seam = x - 0.085 * Math.sin(y * 3.2);
    const groove = Math.exp(-Math.pow(seam / 0.085, 2)) * Math.max(0, z);
    const texture = Math.sin(x * 63 + y * 71) * Math.sin(z * 87 - y * 39);
    positions.setXYZ(i, x * 0.65, y * 0.94, z * 0.43 - groove * 0.21 + texture * 0.008);
    color.setHSL(0.065 + texture * 0.008, 0.37, 0.22 + texture * 0.015 - groove * 0.105);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

const steamFragment = `
  varying vec2 vUv;
  uniform float time;
  float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p) {
    vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);
  }
  void main() {
    vec2 p=vUv*4.0-vec2(time*0.025,time*0.08);
    float n=noise(p)*0.55+noise(p*2.1)*0.3+noise(p*4.3)*0.15;
    float edge=pow(max(0.,1.-length((vUv-.5)*2.)),2.);
    gl_FragColor=vec4(.78,.67,.48,smoothstep(.35,.85,n)*edge*.22);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function CoffeeScene({ onReady, onFailure }: Omit<SceneProps, "running">) {
  const { gl, viewport } = useThree();
  const cloud = useRef<THREE.InstancedMesh>(null);
  const mainBean = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const firstFrame = useRef(false);
  const input = useRef({ x: 0, y: 0, scroll: 0 });
  const geometry = useMemo(createBean, []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.48, metalness: 0 }), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const steam = useMemo(() => ({ time: { value: 0 } }), []);
  const seeds = useMemo(() => Array.from({ length: COUNT }, (_, i) => {
    const random = (n: number) => THREE.MathUtils.euclideanModulo(Math.sin(i * 127.1 + n * 311.7) * 43758.5453, 1);
    return { angle: random(1) * Math.PI * 2, radius: 1.7 + random(2) * 3.8, z: -1.3 - random(3) * 4, size: 0.06 + random(4) * 0.19, speed: 0.025 + random(5) * 0.045, spin: random(6) * 6 };
  }), []);

  useEffect(() => {
    const element = gl.domElement;
    const loss = (event: Event) => { event.preventDefault(); onFailure(); };
    const move = (event: PointerEvent) => {
      input.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
      input.current.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    const scroll = () => { input.current.scroll = Math.min(window.scrollY / window.innerHeight, 1); };
    element.addEventListener("webglcontextlost", loss);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      element.removeEventListener("webglcontextlost", loss);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
    };
  }, [gl, onFailure]);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    elapsed.current += dt;
    const t = elapsed.current;
    if (!firstFrame.current) { firstFrame.current = true; onReady(); }
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, input.current.x * 0.12, 3, dt);
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, input.current.y * 0.08, 3, dt);
      group.current.position.y = THREE.MathUtils.damp(group.current.position.y, input.current.scroll * 0.6, 3, dt);
    }
    if (mainBean.current) {
      mainBean.current.rotation.set(-0.22 + Math.sin(t * 0.23) * 0.12, Math.sin(t * 0.2) * 0.45, -0.55 + Math.sin(t * 0.18) * 0.12);
      mainBean.current.position.y = Math.sin(t * 0.4) * 0.13;
    }
    if (cloud.current) {
      seeds.forEach((seed, i) => {
        const angle = seed.angle + t * seed.speed;
        dummy.position.set(Math.cos(angle) * seed.radius, Math.sin(angle) * seed.radius * 0.8, seed.z);
        dummy.rotation.set(seed.spin + t * 0.12, seed.angle + t * 0.16, angle);
        dummy.scale.setScalar(seed.size);
        dummy.updateMatrix();
        cloud.current!.setMatrixAt(i, dummy.matrix);
      });
      cloud.current.instanceMatrix.needsUpdate = true;
    }
    steam.time.value = t;
  });

  return (
    <>
      <color attach="background" args={["#10231b"]} />
      <fog attach="fog" args={["#10231b", 11, 20]} />
      <hemisphereLight args={["#eadcc3", "#10231b", 1.1]} />
      <directionalLight position={[-3, 5, 6]} color="#ffddb0" intensity={3.6} />
      <directionalLight position={[6, 2, -1]} color="#e5ab57" intensity={5} />
      <directionalLight position={[1, -4, 4]} color="#688b77" intensity={0.8} />
      <group ref={group} position={[viewport.width * 0.23, 0, 0]}>
        <mesh ref={mainBean} geometry={geometry} material={material} scale={1.75} />
        <instancedMesh ref={cloud} args={[geometry, material, COUNT]} frustumCulled={false} />
        <mesh position={[0, 0, -5]}>
          <planeGeometry args={[11, 11]} />
          <shaderMaterial uniforms={steam} vertexShader="varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}" fragmentShader={steamFragment} transparent depthWrite={false} />
        </mesh>
      </group>
    </>
  );
}

function Unavailable({ onFailure }: { onFailure: () => void }) {
  useEffect(onFailure, [onFailure]);
  return null;
}

export default function HeroScene({ running, onReady, onFailure }: SceneProps) {
  return (
    <Canvas camera={{ position: [0, 0, 10], fov: 38 }} dpr={[1, 1.5]} frameloop={running ? "always" : "never"} gl={{ antialias: true, alpha: false, powerPreference: "low-power" }} fallback={<Unavailable onFailure={onFailure} />}>
      <CoffeeScene onReady={onReady} onFailure={onFailure} />
    </Canvas>
  );
}
