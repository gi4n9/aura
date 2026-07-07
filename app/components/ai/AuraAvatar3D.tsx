"use client";

import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================
//  GLSL Shaders – Perlin 3D vertex displacement (Stefan Gustavson)
//  Inspired by: github.com/spite/vertex-displacement-noise-3d-webgl-glsl-three-js
// ============================================================

const vertexShader = /* glsl */ `
  // ---- Classic 3D Perlin Noise (Stefan Gustavson / ashima) ----
  vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  vec3 fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

  float cnoise(vec3 P) {
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy  = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000), dot(g010,g010), dot(g100,g100), dot(g110,g110)));
    g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001), dot(g011,g011), dot(g101,g101), dot(g111,g111)));
    g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z  = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }
  // ---- End Perlin noise ----

  uniform float u_time;
  uniform float u_audioLevel;   // 0..1, driven by Web Audio analyser
  uniform float u_noiseSpeed;
  uniform float u_noiseScale;
  uniform float u_displacementStrength;
  uniform vec3  u_colorA;
  uniform vec3  u_colorB;

  varying float v_displacement;
  varying vec3  v_normal;

  void main() {
    // Sample 3D Perlin noise with animated time offset
    float noise = cnoise(normal * u_noiseScale + u_time * u_noiseSpeed);

    // Extra audio-reactive boost: audio pushes noise amplitude higher
    float strength = u_displacementStrength * (1.0 + u_audioLevel * 2.5);
    float displacement = noise * strength;

    // Displace vertex along its normal
    vec3 newPos = position + normal * displacement;

    v_displacement = noise;
    v_normal = normal;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3  u_colorA;       // base color
  uniform vec3  u_colorB;       // highlight color
  uniform float u_audioLevel;
  uniform float u_time;

  varying float v_displacement;
  varying vec3  v_normal;

  void main() {
    // Map displacement to color blend
    float t = clamp(v_displacement * 0.5 + 0.5, 0.0, 1.0);

    // Audio boost brightens the highlight color
    float brightness = 1.0 + u_audioLevel * 0.8;
    vec3 color = mix(u_colorA, u_colorB * brightness, t);

    // Subtle rim / fresnel-like lighting using normal
    float rim = 1.0 - abs(dot(normalize(v_normal), vec3(0.0, 0.0, 1.0)));
    color += rim * rim * u_colorB * 0.4;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ============================================================
//  Orb mesh – uses the ShaderMaterial above
// ============================================================
interface OrbProps {
  isSpeaking: boolean;
  isRecording: boolean;
  isLoading: boolean;
  analyser: AnalyserNode | null;
}

function OrbMesh({ isSpeaking, isRecording, isLoading, analyser }: OrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const smoothedAudio = useRef(0);

  // Uniforms memo so they aren't recreated every frame
  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_audioLevel: { value: 0 },
      u_noiseSpeed: { value: 0.22 },
      u_noiseScale: { value: 1.8 },
      u_displacementStrength: { value: 0.38 },
      u_colorA: { value: new THREE.Color("#C5853A") },
      u_colorB: { value: new THREE.Color("#F0C060") },
    }),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // --- Audio analysis ---
    let rawAudio = 0;
    if (analyser && (isSpeaking || isRecording)) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      rawAudio = sum / data.length / 255;
    }
    smoothedAudio.current += (rawAudio - smoothedAudio.current) * 0.12;
    const af = smoothedAudio.current;

    // --- Choose theme per state ---
    if (isRecording) {
      // Cyan-blue when listening
      uniforms.u_colorA.value.set("#1A8FAA");
      uniforms.u_colorB.value.set("#60E0FF");
      uniforms.u_noiseSpeed.value = 0.35 + af * 0.6;
      uniforms.u_displacementStrength.value = 0.30 + af * 0.45;
    } else if (isSpeaking) {
      // Golden-amber when speaking
      uniforms.u_colorA.value.set("#C5853A");
      uniforms.u_colorB.value.set("#FFD060");
      uniforms.u_noiseSpeed.value = 0.28 + af * 0.5;
      uniforms.u_displacementStrength.value = 0.35 + af * 0.55;
    } else if (isLoading) {
      // Purple when thinking
      const pulse = Math.sin(t * 3) * 0.5 + 0.5;
      uniforms.u_colorA.value.set("#6030AA");
      uniforms.u_colorB.value.set("#C080FF");
      uniforms.u_noiseSpeed.value = 0.4 + pulse * 0.2;
      uniforms.u_displacementStrength.value = 0.25 + pulse * 0.15;
    } else {
      // Idle – gentle golden pulse
      const idlePulse = Math.sin(t * 1.4) * 0.5 + 0.5;
      uniforms.u_colorA.value.set("#8A5C1E");
      uniforms.u_colorB.value.set("#D4A040");
      uniforms.u_noiseSpeed.value = 0.18 + idlePulse * 0.04;
      uniforms.u_displacementStrength.value = 0.22 + idlePulse * 0.06;
    }

    uniforms.u_time.value = t;
    uniforms.u_audioLevel.value = af;

    // Slow idle rotation
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.12;
      meshRef.current.rotation.x = Math.sin(t * 0.08) * 0.15;
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* High-res sphere so noise looks smooth */}
      <sphereGeometry args={[1.1, 128, 128]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// ============================================================
//  Main exported component
// ============================================================
interface AvatarProps {
  audioUrl: string | null;
  isSpeaking: boolean;
  isRecording: boolean;
  isLoading: boolean;
  onSpeakEnd: () => void;
  isMuted: boolean;
}

export default function AuraAvatar3D({
  audioUrl,
  isSpeaking,
  isRecording,
  isLoading,
  onSpeakEnd,
  isMuted,
}: AvatarProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lastPlayedUrlRef = useRef<string | null>(null);

  // Mic analyser refs
  const micStreamRef = useRef<MediaStream | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);

  // Single analyser passed to OrbMesh: speaker takes priority, else mic
  const activeAnalyser = isSpeaking ? analyserRef.current : micAnalyserRef.current;

  // --- Mute sync ---
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  // --- Playback + Web Audio analyser (Jarvis speaking) ---
  useEffect(() => {
    if (!audioUrl || !isSpeaking) return;
    if (audioUrl === lastPlayedUrlRef.current) return;
    lastPlayedUrlRef.current = audioUrl;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.crossOrigin = "anonymous";
    audio.muted = isMuted;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;

    audio.play().catch((e) => console.warn("Autoplay blocked:", e));
    audio.onended = () => {
      onSpeakEnd();
      cleanup();
    };

    const cleanup = () => {
      audioRef.current?.pause();
      audioRef.current = null;
      if (audioCtxRef.current?.state !== "closed") audioCtxRef.current?.close();
      analyserRef.current = null;
      lastPlayedUrlRef.current = null;
    };
    return cleanup;
  }, [audioUrl, isSpeaking, isMuted, onSpeakEnd]);

  // --- Mic analyser (user speaking) ---
  useEffect(() => {
    if (!isRecording) {
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      if (micCtxRef.current?.state !== "closed") micCtxRef.current?.close();
      micAnalyserRef.current = null;
      return;
    }
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
      micStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      micCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser); // intentionally NOT connected to destination
      micAnalyserRef.current = analyser;
    }).catch((e) => console.warn("Mic access denied:", e));
    return () => { cancelled = true; };
  }, [isRecording]);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 45 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        {/* Lights to complement the shader colors */}
        <ambientLight intensity={0.25} />
        <pointLight position={[4, 4, 4]} intensity={1.8} color="#D4A040" />
        <pointLight position={[-4, -3, -4]} intensity={0.7} color="#4040AA" />

        <OrbMesh
          isSpeaking={isSpeaking}
          isRecording={isRecording}
          isLoading={isLoading}
          analyser={activeAnalyser}
        />
      </Canvas>
    </div>
  );
}
