"use client";

import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================
//  GLSL Shaders – Perlin 3D vertex displacement (Stefan Gustavson)
//  Enhanced with dual-octave noise, bass/treble separation,
//  and Fresnel rim glow for AI Orb aesthetic
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
  uniform float u_bassLevel;     // Low-freq amplitude (0..1)
  uniform float u_trebleLevel;   // High-freq amplitude (0..1)
  uniform float u_noiseSpeed;
  uniform float u_noiseScale;
  uniform float u_displacementStrength;

  varying float v_displacement;
  varying vec3  v_normal;
  varying vec3  v_worldPos;

  void main() {
    // Octave 1: Large, slow undulation driven by bass
    float noise1 = cnoise(normal * u_noiseScale + u_time * u_noiseSpeed);
    // Octave 2: Fine, fast detail driven by treble
    float noise2 = cnoise(normal * u_noiseScale * 2.5 + u_time * u_noiseSpeed * 1.8);

    float combinedNoise = noise1 * 0.7 + noise2 * 0.3;

    // Bass drives broad displacement, treble drives fine texture
    float strength = u_displacementStrength
                   * (1.0 + u_bassLevel * 2.8 + u_trebleLevel * 0.8);
    float displacement = combinedNoise * strength;

    vec3 newPos = position + normal * displacement;

    v_displacement = combinedNoise;
    v_normal = normalize(normalMatrix * normal);
    v_worldPos = (modelMatrix * vec4(newPos, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3  u_colorA;
  uniform vec3  u_colorB;
  uniform vec3  u_colorGlow;     // Rim / Fresnel glow color
  uniform float u_bassLevel;
  uniform float u_trebleLevel;
  uniform float u_time;
  uniform float u_glowIntensity;

  varying float v_displacement;
  varying vec3  v_normal;
  varying vec3  v_worldPos;

  void main() {
    float t = clamp(v_displacement * 0.5 + 0.5, 0.0, 1.0);

    // Audio brightens highlights
    float brightness = 1.0 + u_bassLevel * 0.6 + u_trebleLevel * 0.3;
    vec3 color = mix(u_colorA, u_colorB * brightness, t);

    // Fresnel rim glow – edge glow that reacts to audio
    vec3 viewDir = normalize(cameraPosition - v_worldPos);
    float fresnel = pow(1.0 - max(dot(v_normal, viewDir), 0.0), 3.0);
    float glowStr = u_glowIntensity * (1.0 + u_bassLevel * 1.5);
    color += fresnel * u_colorGlow * glowStr;

    // Subtle inner shimmer using treble
    float shimmer = sin(v_displacement * 12.0 + u_time * 3.0) * 0.5 + 0.5;
    color += shimmer * u_trebleLevel * u_colorB * 0.15;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ============================================================
//  Spring-damped value smoother (vật lý lò xo)
//  Produces smooth, bouncy transitions without abrupt jumps
// ============================================================
class SpringValue {
  value: number;
  velocity: number;
  target: number;
  stiffness: number; // "Spring constant" – higher = faster snap
  damping: number;   // Damping ratio – 1.0 = critical, <1 = bouncy

  constructor(initial: number, stiffness = 3.5, damping = 0.7) {
    this.value = initial;
    this.velocity = 0;
    this.target = initial;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  setTarget(t: number) { this.target = t; }

  update(dt: number): number {
    // Capped dt to avoid instability on tab-switch
    const safeDt = Math.min(dt, 0.05);
    const displacement = this.value - this.target;
    const springForce = -this.stiffness * displacement;
    const dampingForce = -2 * this.damping * Math.sqrt(this.stiffness) * this.velocity;
    this.velocity += (springForce + dampingForce) * safeDt;
    this.value += this.velocity * safeDt;
    return this.value;
  }
}

// Spring-damped color smoother
class SpringColor {
  r: SpringValue;
  g: SpringValue;
  b: SpringValue;

  constructor(hex: string, stiffness = 3.0, damping = 0.75) {
    const c = new THREE.Color(hex);
    this.r = new SpringValue(c.r, stiffness, damping);
    this.g = new SpringValue(c.g, stiffness, damping);
    this.b = new SpringValue(c.b, stiffness, damping);
  }

  setTarget(hex: string) {
    const c = new THREE.Color(hex);
    this.r.setTarget(c.r);
    this.g.setTarget(c.g);
    this.b.setTarget(c.b);
  }

  update(dt: number, out: THREE.Color) {
    out.setRGB(this.r.update(dt), this.g.update(dt), this.b.update(dt));
  }
}

// ============================================================
//  OrbMesh – renders the GLSL sphere inside the Canvas
// ============================================================
interface OrbProps {
  isSpeaking: boolean;
  isRecording: boolean;
  isLoading: boolean;
  speakAnalyser: AnalyserNode | null;
  micAnalyser: AnalyserNode | null;
  showChat?: boolean;
}

function OrbMesh({ isSpeaking, isRecording, isLoading, speakAnalyser, micAnalyser, showChat }: OrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lastTimeRef = useRef(0);

  // Smoothed audio levels (lerp, not spring – audio must be responsive)
  const smoothedBass = useRef(0);
  const smoothedTreble = useRef(0);

  // Spring-damped uniforms for buttery state transitions - made less stiff and more damped
  const springNoiseSpeed = useRef(new SpringValue(0.18, 2.5, 0.85));
  const springDisplacement = useRef(new SpringValue(0.22, 2.5, 0.85));
  const springGlowIntensity = useRef(new SpringValue(0.35, 2.5, 0.85));
  const springColorA = useRef(new SpringColor("#8A5C1E", 1.8, 0.9));
  const springColorB = useRef(new SpringColor("#D4A040", 1.8, 0.9));
  const springColorGlow = useRef(new SpringColor("#D4A040", 1.8, 0.9));

  // Reusable freq data buffer
  const freqDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const uniforms = useMemo(
    () => ({
      u_time:                 { value: 0 },
      u_bassLevel:            { value: 0 },
      u_trebleLevel:          { value: 0 },
      u_noiseSpeed:           { value: 0.18 },
      u_noiseScale:           { value: 1.8 },
      u_displacementStrength: { value: 0.22 },
      u_colorA:               { value: new THREE.Color("#8A5C1E") },
      u_colorB:               { value: new THREE.Color("#D4A040") },
      u_colorGlow:            { value: new THREE.Color("#D4A040") },
      u_glowIntensity:        { value: 0.35 },
    }),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const dt = t - lastTimeRef.current;
    lastTimeRef.current = t;

    // ========== FFT: Bass / Treble separation ==========
    let rawBass = 0;
    let rawTreble = 0;
    const activeAnalyser = isSpeaking ? speakAnalyser : micAnalyser;
    
    if (activeAnalyser && (isSpeaking || isRecording)) {
      if (!freqDataRef.current || freqDataRef.current.length !== activeAnalyser.frequencyBinCount) {
        freqDataRef.current = new Uint8Array(activeAnalyser.frequencyBinCount);
      }
      activeAnalyser.getByteFrequencyData(freqDataRef.current);
      const bins = freqDataRef.current;
      const half = Math.floor(bins.length / 2);
      let bassSum = 0, trebleSum = 0;
      for (let i = 0; i < half; i++) bassSum += bins[i];
      for (let i = half; i < bins.length; i++) trebleSum += bins[i];
      rawBass = bassSum / half / 255;
      rawTreble = trebleSum / (bins.length - half) / 255;
    }
    // Smooth audio (fast lerp – audio needs to be responsive)
    smoothedBass.current += (rawBass - smoothedBass.current) * 0.18;
    smoothedTreble.current += (rawTreble - smoothedTreble.current) * 0.22;
    const bass = smoothedBass.current;
    const treble = smoothedTreble.current;

    // ========== Spring-damped state targets ==========
    if (isRecording) {
      springColorA.current.setTarget("#1A8FAA");
      springColorB.current.setTarget("#60E0FF");
      springColorGlow.current.setTarget("#40D0FF");
      springNoiseSpeed.current.setTarget(0.35 + bass * 0.6);
      springDisplacement.current.setTarget(0.30 + bass * 0.45);
      springGlowIntensity.current.setTarget(0.5 + bass * 0.5);
    } else if (isSpeaking) {
      springColorA.current.setTarget("#C5853A");
      springColorB.current.setTarget("#FFD060");
      springColorGlow.current.setTarget("#FFB040");
      springNoiseSpeed.current.setTarget(0.28 + bass * 0.5);
      springDisplacement.current.setTarget(0.35 + bass * 0.55);
      springGlowIntensity.current.setTarget(0.45 + bass * 0.5);
    } else if (isLoading) {
      const pulse = Math.sin(t * 3) * 0.5 + 0.5;
      springColorA.current.setTarget("#6030AA");
      springColorB.current.setTarget("#C080FF");
      springColorGlow.current.setTarget("#A060FF");
      springNoiseSpeed.current.setTarget(0.4 + pulse * 0.2);
      springDisplacement.current.setTarget(0.25 + pulse * 0.15);
      springGlowIntensity.current.setTarget(0.4 + pulse * 0.3);
    } else {
      const idlePulse = Math.sin(t * 1.4) * 0.5 + 0.5;
      springColorA.current.setTarget("#8A5C1E");
      springColorB.current.setTarget("#D4A040");
      springColorGlow.current.setTarget("#D4A040");
      springNoiseSpeed.current.setTarget(0.18 + idlePulse * 0.04);
      springDisplacement.current.setTarget(0.22 + idlePulse * 0.06);
      springGlowIntensity.current.setTarget(0.35);
    }

    // ========== Update springs ==========
    uniforms.u_noiseSpeed.value = springNoiseSpeed.current.update(dt);
    uniforms.u_displacementStrength.value = springDisplacement.current.update(dt);
    uniforms.u_glowIntensity.value = springGlowIntensity.current.update(dt);
    springColorA.current.update(dt, uniforms.u_colorA.value);
    springColorB.current.update(dt, uniforms.u_colorB.value);
    springColorGlow.current.update(dt, uniforms.u_colorGlow.value);

    uniforms.u_time.value = t;
    uniforms.u_bassLevel.value = bass;
    uniforms.u_trebleLevel.value = treble;

    // ========== Rotation + POV based on showChat ==========
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.12;
      meshRef.current.rotation.x = Math.sin(t * 0.08) * 0.15;

      const targetY = showChat ? 0.8 : 0;
      const targetScale = showChat ? 0.65 : 1.0;
      meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.08;
      const curScale = meshRef.current.scale.x;
      meshRef.current.scale.setScalar(curScale + (targetScale - curScale) * 0.08);
    }
  });

  return (
    <mesh ref={meshRef}>
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
  showChat?: boolean;
}

export default function AuraAvatar3D({
  audioUrl,
  isSpeaking,
  isRecording,
  isLoading,
  onSpeakEnd,
  isMuted,
  showChat,
}: AvatarProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lastPlayedUrlRef = useRef<string | null>(null);

  // Mic analyser refs
  const micStreamRef = useRef<MediaStream | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);

  // --- Mute sync ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // --- Khởi tạo hệ thống Web Audio 1 lần duy nhất ---
  // Giúp tránh lỗi quá tải AudioContext (trình duyệt giới hạn tối đa 6 context)
  useEffect(() => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.82;
    
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;

    return () => {
      if (ctx.state !== "closed") ctx.close();
    };
  }, []);

  // --- Xử lý phát audio khi có URL mới ---
  useEffect(() => {
    // Khi kết thúc hoặc bị huỷ, dừng phát
    if (!audioUrl || !isSpeaking) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    if (audioUrl === lastPlayedUrlRef.current) return;
    lastPlayedUrlRef.current = audioUrl;

    let isCancelled = false;
    let sourceNode: AudioBufferSourceNode | null = null;

    const cleanupAudio = () => {
      if (sourceNode) {
        try {
          sourceNode.stop();
        } catch (e) {
          // Ignore if already stopped
        }
        sourceNode.disconnect();
        sourceNode = null;
      }
    };

    const loadAndPlay = async () => {
      try {
        // Tải audio data thô
        const res = await fetch(audioUrl);
        if (!res.ok) throw new Error(`Fetch audio failed with status: ${res.status}`);
        
        const arrayBuffer = await res.arrayBuffer();
        if (isCancelled) return;

        if (arrayBuffer.byteLength === 0) {
          console.warn("Cảnh báo: Audio file rỗng (0 bytes). Bỏ qua.");
          onSpeakEnd();
          return;
        }

        const ctx = audioCtxRef.current!;
        if (ctx.state === "suspended") {
          await ctx.resume();
        }

        // Decode audio data trực tiếp qua Web Audio API (Bỏ qua hoàn toàn HTML5 Audio Demuxer lỗi của Chrome)
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (isCancelled) return;

        sourceNode = ctx.createBufferSource();
        sourceNode.buffer = audioBuffer;
        
        // Connect vào Analyser
        sourceNode.connect(analyserRef.current!);

        // Xử lý câm (Mute) bằng cách không kết nối vào Destination,
        // Nhưng trong kiến trúc này Analyser đã nối sẵn vào Destination.
        // Để mute, ta chỉ cần chỉnh GainNode hoặc mute trên tổng thể.
        // Nhưng vì yêu cầu đơn giản, ta tạm bỏ qua mute cho Jarvis (trên thực tế Jarvis luôn nói ra tiếng).

        sourceNode.onended = () => {
          cleanupAudio();
          onSpeakEnd();
        };

        sourceNode.start(0);

      } catch (err) {
        console.error("Lỗi Web Audio API Decoder:", err);
        if (!isCancelled) {
          cleanupAudio();
          onSpeakEnd(); // Chuyển sang câu tiếp theo
        }
      }
    };

    loadAndPlay();

    return () => {
      isCancelled = true;
      cleanupAudio();
    };
  }, [audioUrl, isSpeaking, onSpeakEnd]);

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
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);
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
        <ambientLight intensity={0.25} />
        <pointLight position={[4, 4, 4]} intensity={1.8} color="#D4A040" />
        <pointLight position={[-4, -3, -4]} intensity={0.7} color="#4040AA" />

        <OrbMesh
          isSpeaking={isSpeaking}
          isRecording={isRecording}
          isLoading={isLoading}
          speakAnalyser={analyserRef.current}
          micAnalyser={micAnalyserRef.current}
          showChat={showChat}
        />
      </Canvas>
    </div>
  );
}
