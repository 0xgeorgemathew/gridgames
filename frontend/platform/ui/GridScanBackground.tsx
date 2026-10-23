'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import './grid-background.css'
import * as THREE from 'three'
import { createGridScanClock } from './grid-scan-clock'
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  ChromaticAberrationEffect,
} from 'postprocessing'

const vert = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const frag = `
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec2 uSkew;
uniform float uTilt;
uniform float uYaw;
uniform float uLineThickness;
uniform vec3 uLinesColor;
uniform vec3 uScanColor;
uniform float uGridScale;
uniform float uLineStyle;
uniform float uScanOpacity;
uniform float uScanDirection;
uniform float uNoise;
uniform float uBloomOpacity;
uniform float uScanGlow;
uniform float uScanSoftness;
uniform float uPhaseTaper;
uniform float uScanDuration;
uniform float uScanDelay;
uniform vec2 uScanRange;
varying vec2 vUv;


float smoother01(float a, float b, float x){
  float t = clamp((x - a) / max(1e-5, (b - a)), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    // Portrait orientation detection and coordinate correction
    float isPortrait = iResolution.x < iResolution.y ? 1.0 : 0.0;

    // Landscape: normalize by height (original)
    vec2 pLandscape = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    // Portrait: normalize by width, then rotate 90°
    vec2 pPortrait = (2.0 * fragCoord - iResolution.xy) / iResolution.x;
    pPortrait = vec2(-pPortrait.y, pPortrait.x);

    vec2 p = mix(pLandscape, pPortrait, isPortrait);

    vec3 ro = vec3(0.0);
    vec3 rd = normalize(vec3(p, 2.0));

    float cR = cos(uTilt), sR = sin(uTilt);
    rd.xy = mat2(cR, -sR, sR, cR) * rd.xy;

    float cY = cos(uYaw), sY = sin(uYaw);
    rd.xz = mat2(cY, -sY, sY, cY) * rd.xz;

    vec2 skew = clamp(uSkew, vec2(-0.7), vec2(0.7));
    rd.xy += skew * rd.z;

    vec3 color = vec3(0.0);
  float minT = 1e20;
  float gridScale = max(1e-5, uGridScale);
    float fadeStrength = 2.0;
    vec2 gridUV = vec2(0.0);

  float hitIsY = 1.0;
    for (int i = 0; i < 4; i++)
    {
        float isY = float(i < 2);
        float pos = mix(-0.2, 0.2, float(i)) * isY + mix(-0.5, 0.5, float(i - 2)) * (1.0 - isY);
        float num = pos - (isY * ro.y + (1.0 - isY) * ro.x);
        float den = isY * rd.y + (1.0 - isY) * rd.x;
        float t = num / den;
        vec3 h = ro + rd * t;

        float depthBoost = smoothstep(0.0, 3.0, h.z);
        h.xy += skew * 0.15 * depthBoost;

    bool use = t > 0.0 && t < minT;
    gridUV = use ? mix(h.zy, h.xz, isY) / gridScale : gridUV;
    minT = use ? t : minT;
    hitIsY = use ? isY : hitIsY;
    }

    vec3 hit = ro + rd * minT;
    float dist = length(hit - ro);

  // The tunnel geometry stays rigid while the scan light travels through it.
  float fx = fract(gridUV.x);
  float fy = fract(gridUV.y);
  float ax = min(fx, 1.0 - fx);
  float ay = min(fy, 1.0 - fy);
  float wx = fwidth(gridUV.x);
  float wy = fwidth(gridUV.y);
  float halfPx = max(0.0, uLineThickness) * 0.5;

  float tx = halfPx * wx;
  float ty = halfPx * wy;

  float aax = wx;
  float aay = wy;

  float lineX = 1.0 - smoothstep(tx, tx + aax, ax);
  float lineY = 1.0 - smoothstep(ty, ty + aay, ay);
  if (uLineStyle > 0.5) {
    float dashRepeat = 4.0;
    float dashDuty = 0.5;
    float vy = fract(gridUV.y * dashRepeat);
    float vx = fract(gridUV.x * dashRepeat);
    float dashMaskY = step(vy, dashDuty);
    float dashMaskX = step(vx, dashDuty);
    if (uLineStyle < 1.5) {
      lineX *= dashMaskY;
      lineY *= dashMaskX;
    } else {
      float dotRepeat = 6.0;
      float dotWidth = 0.18;
      float cy = abs(fract(gridUV.y * dotRepeat) - 0.5);
      float cx = abs(fract(gridUV.x * dotRepeat) - 0.5);
      float dotMaskY = 1.0 - smoothstep(dotWidth, dotWidth + fwidth(gridUV.y * dotRepeat), cy);
      float dotMaskX = 1.0 - smoothstep(dotWidth, dotWidth + fwidth(gridUV.x * dotRepeat), cx);
      lineX *= dotMaskY;
      lineY *= dotMaskX;
    }
  }
  float primaryMask = max(lineX, lineY);

  vec2 gridUV2 = (hitIsY > 0.5 ? hit.xz : hit.zy) / gridScale;
  float fx2 = fract(gridUV2.x);
  float fy2 = fract(gridUV2.y);
  float ax2 = min(fx2, 1.0 - fx2);
  float ay2 = min(fy2, 1.0 - fy2);
  float wx2 = fwidth(gridUV2.x);
  float wy2 = fwidth(gridUV2.y);
  float tx2 = halfPx * wx2;
  float ty2 = halfPx * wy2;
  float aax2 = wx2;
  float aay2 = wy2;
  float lineX2 = 1.0 - smoothstep(tx2, tx2 + aax2, ax2);
  float lineY2 = 1.0 - smoothstep(ty2, ty2 + aay2, ay2);
  if (uLineStyle > 0.5) {
    float dashRepeat2 = 4.0;
    float dashDuty2 = 0.5;
    float vy2m = fract(gridUV2.y * dashRepeat2);
    float vx2m = fract(gridUV2.x * dashRepeat2);
    float dashMaskY2 = step(vy2m, dashDuty2);
    float dashMaskX2 = step(vx2m, dashDuty2);
    if (uLineStyle < 1.5) {
      lineX2 *= dashMaskY2;
      lineY2 *= dashMaskX2;
    } else {
      float dotRepeat2 = 6.0;
      float dotWidth2 = 0.18;
      float cy2 = abs(fract(gridUV2.y * dotRepeat2) - 0.5);
      float cx2 = abs(fract(gridUV2.x * dotRepeat2) - 0.5);
      float dotMaskY2 = 1.0 - smoothstep(dotWidth2, dotWidth2 + fwidth(gridUV2.y * dotRepeat2), cy2);
      float dotMaskX2 = 1.0 - smoothstep(dotWidth2, dotWidth2 + fwidth(gridUV2.x * dotRepeat2), cx2);
      lineX2 *= dotMaskY2;
      lineY2 *= dotMaskX2;
    }
  }
    float altMask = max(lineX2, lineY2);

    float edgeDistX = min(abs(hit.x - (-0.5)), abs(hit.x - 0.5));
    float edgeDistY = min(abs(hit.y - (-0.2)), abs(hit.y - 0.2));
    float edgeDist = mix(edgeDistY, edgeDistX, hitIsY);
    float edgeGate = 1.0 - smoothstep(gridScale * 0.5, gridScale * 2.0, edgeDist);
    altMask *= edgeGate;

  float lineMask = max(primaryMask, altMask);

    float fade = exp(-dist * fadeStrength);

    float combinedPulse = 0.0;
    float combinedAura = 0.0;
    // Hidden scans do no pulse/aura work.
    if (uScanOpacity > 0.0) {
    float dur = max(0.05, uScanDuration);
    float del = max(0.0, uScanDelay);
    float scanZMax = 2.0;
    float widthScale = max(0.1, uScanGlow);
    float sigma = max(0.001, 0.18 * widthScale * uScanSoftness);
    float sigmaA = sigma * 2.0;

    float cycle = dur + del;
    float tCycle = mod(iTime, cycle);
    float scanPhase = clamp((tCycle - del) / dur, 0.0, 1.0);
    float phase = scanPhase;
    if (uScanDirection > 0.5 && uScanDirection < 1.5) {
      phase = 1.0 - phase;
    } else if (uScanDirection > 1.5) {
      float t2 = mod(max(0.0, iTime - del), 2.0 * dur);
      phase = (t2 < dur) ? (t2 / dur) : (1.0 - (t2 - dur) / dur);
    }
    float scanZ = mix(uScanRange.x, uScanRange.y, phase);
    float dz = abs(hit.z - scanZ);
    // Make wave smaller and less pronounced when restricted to the back
    float widthMult = uScanRange.y - uScanRange.x < 1.0 ? 0.3 : 1.0;
    float currentSigma = sigma * widthMult;
    float currentSigmaA = sigmaA * widthMult;
    
    float lineBand = exp(-0.5 * (dz * dz) / max(0.001, (currentSigma * currentSigma)));
    float taper = clamp(uPhaseTaper, 0.0, 0.49);
    float headW = taper;
    float tailW = taper;
    float headFade = smoother01(0.0, headW, phase);
    float tailFade = 1.0 - smoother01(1.0 - tailW, 1.0, phase);
    float phaseWindow = headFade * tailFade;
    float pulseBase = lineBand * phaseWindow;
    combinedPulse += pulseBase * clamp(uScanOpacity, 0.0, 1.0);
    float auraBand = exp(-0.5 * (dz * dz) / max(0.001, (currentSigmaA * currentSigmaA)));
    combinedAura += (auraBand * 0.25) * phaseWindow * clamp(uScanOpacity, 0.0, 1.0);
    }

  float lineVis = lineMask;
  vec3 gridCol = uLinesColor * lineVis * fade;
  vec3 scanCol = uScanColor * combinedPulse;
  vec3 scanAura = uScanColor * combinedAura;

    color = gridCol + scanCol + scanAura;

  float n = fract(sin(dot(gl_FragCoord.xy + vec2(iTime * 123.4), vec2(12.9898,78.233))) * 43758.5453123);
  color += (n - 0.5) * uNoise;
  color = clamp(color, 0.0, 1.0);
  float alpha = clamp(max(lineVis, combinedPulse), 0.0, 1.0);
  float gx = 1.0 - smoothstep(tx * 2.0, tx * 2.0 + aax * 2.0, ax);
  float gy = 1.0 - smoothstep(ty * 2.0, ty * 2.0 + aay * 2.0, ay);
  float halo = max(gx, gy) * fade;
  alpha = max(alpha, halo * clamp(uBloomOpacity, 0.0, 1.0));
  
  // Premultiply color by alpha to solve issues where noise applies to transparent regions
  color *= alpha;
  
  // Force 1.0 alpha. The background should be purely opaque black.
  // iOS Safari ignores alpha:false on webview contexts sometimes,
  // causing milky blending against the webview container.
  fragColor = vec4(color, 1.0);
}

void main(){
  vec4 c;
  mainImage(c, vUv * iResolution.xy);
  gl_FragColor = c;
}
`

interface GridScanProps {
  linesColor?: string
  scanColor?: string
  lineThickness?: number
  gridScale?: number
  scanOpacity?: number
  scanGlow?: number
  scanSoftness?: number
  scanDuration?: number
  scanDelay?: number
  scanDirection?: number
  scanRange?: [number, number]
  chromaticAberration?: number
  noiseIntensity?: number
  bloomIntensity?: number
  sensitivity?: number
  maxFps?: number
}

function srgbColor(hex: string): THREE.Color {
  const c = new THREE.Color(hex)
  return c.convertSRGBToLinear()
}

const defaults = {
  linesColor: '#00d9ff',
  scanColor: '#00ffff',
  lineThickness: 1,
  gridScale: 0.08,
  scanOpacity: 0.5,
  scanGlow: 0.7,
  scanSoftness: 2,
  scanDuration: 2,
  scanDelay: 2,
  scanDirection: 2,
  scanRange: [0, 2] as [number, number],
  chromaticAberration: 0.003,
  noiseIntensity: 0.008,
  bloomIntensity: 0.5,
  sensitivity: 0.55,
  maxFps: 30,
}
type Settings = typeof defaults

function useGridScanEffect(
  containerRef: React.RefObject<HTMLDivElement | null>,
  props: GridScanProps,
  onSnapshot?: (image: string) => void,
  onFailure?: () => void
) {
  const params = { ...defaults, ...props }
  const settingsRef = useRef(params)
  const updateRef = useRef<((settings: Settings) => void) | null>(null)

  // GPU resources belong to the mounted canvas, never to changing prop/array identities.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const initial = settingsRef.current
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: 'low-power',
      })
    } catch {
      // A decorative background must never take down login/navigation.
      onSnapshot?.('')
      onFailure?.()
      return
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.NoToneMapping
    renderer.autoClear = false
    renderer.setClearColor(0x000000, 1)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    renderer.domElement.dataset.gridBackground = 'true'
    container.appendChild(renderer.domElement)
    const uniforms = {
      iResolution: { value: new THREE.Vector3() },
      iTime: { value: 0 },
      uSkew: { value: new THREE.Vector2() },
      uTilt: { value: 0 },
      uYaw: { value: 0 },
      uLineThickness: { value: initial.lineThickness },
      uLinesColor: { value: srgbColor(initial.linesColor) },
      uScanColor: { value: srgbColor(initial.scanColor) },
      uGridScale: { value: initial.gridScale },
      uLineStyle: { value: 0 },
      uScanOpacity: { value: initial.scanOpacity },
      uNoise: { value: initial.noiseIntensity },
      uBloomOpacity: { value: initial.bloomIntensity },
      uScanGlow: { value: initial.scanGlow },
      uScanSoftness: { value: initial.scanSoftness },
      uPhaseTaper: { value: 0.9 },
      uScanDuration: { value: initial.scanDuration },
      uScanDelay: { value: initial.scanDelay },
      uScanDirection: { value: initial.scanDirection },
      uScanRange: { value: new THREE.Vector2(...initial.scanRange) },
    }
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const geometry = new THREE.PlaneGeometry(2, 2)
    scene.add(new THREE.Mesh(geometry, material))
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new BloomEffect({
      intensity: 1,
      luminanceThreshold: 0,
      luminanceSmoothing: 0,
      resolutionScale: 0.5,
    })
    const chroma = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(initial.chromaticAberration, initial.chromaticAberration),
      radialModulation: true,
      modulationOffset: 0,
    })
    const effectPass = new EffectPass(camera, bloom, chroma)
    effectPass.renderToScreen = true
    composer.addPass(effectPass)

    let snapshotSent = false
    let disposed = false,
      visible = true
    let frame: number | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const clock = createGridScanClock()
    const canRender = () => !disposed && visible && !document.hidden
    const animated = () => settingsRef.current.scanOpacity > 0 && !media.matches
    const stop = () => {
      if (frame !== null) cancelAnimationFrame(frame)
      if (timer !== null) clearTimeout(timer)
      frame = null
      timer = null
    }
    const render = () => {
      const running = canRender() && animated()
      const time = clock.sample(performance.now(), running)
      if (!canRender() || uniforms.iResolution.value.x <= 0 || uniforms.iResolution.value.y <= 0) {
        clock.pause()
        return
      }
      // The hidden-scan landing view is a static grid. Preserve its look without
      // continuously animating imperceptible grain and running postprocessing.
      uniforms.iTime.value = time
      renderer.clear(true, true, true)
      composer.render()
      if (onSnapshot && !snapshotSent && uniforms.iResolution.value.x > 0) {
        snapshotSent = true
        try {
          onSnapshot(renderer.domElement.toDataURL('image/webp', 0.95))
        } catch {
          onSnapshot('')
        }
      }
    }
    const schedule = () => {
      if (!canRender() || !animated() || timer !== null || frame !== null) return
      timer = setTimeout(
        () => {
          timer = null
          if (!canRender() || !animated()) return
          frame = requestAnimationFrame(() => {
            frame = null
            render()
            schedule()
          })
        },
        1000 / Math.max(1, Math.min(24, settingsRef.current.maxFps))
      )
    }
    const refresh = () => {
      stop()
      render()
      schedule()
    }
    const update = (settings: Settings) => {
      settingsRef.current = settings
      uniforms.uLineThickness.value = settings.lineThickness
      uniforms.uLinesColor.value.copy(srgbColor(settings.linesColor))
      uniforms.uScanColor.value.copy(srgbColor(settings.scanColor))
      uniforms.uGridScale.value = settings.gridScale
      uniforms.uScanOpacity.value = settings.scanOpacity
      uniforms.uNoise.value = settings.noiseIntensity
      uniforms.uBloomOpacity.value = settings.bloomIntensity
      uniforms.uScanGlow.value = settings.scanGlow
      uniforms.uScanSoftness.value = settings.scanSoftness
      uniforms.uScanDuration.value = settings.scanDuration
      uniforms.uScanDelay.value = settings.scanDelay
      uniforms.uScanDirection.value = settings.scanDirection
      uniforms.uScanRange.value.set(...settings.scanRange)
      bloom.blendMode.opacity.value = Math.max(0, settings.bloomIntensity)
      chroma.offset.set(settings.chromaticAberration, settings.chromaticAberration)
      refresh()
    }
    updateRef.current = update
    const resize = () => {
      const width = Math.max(1, container.clientWidth),
        height = Math.max(1, container.clientHeight)
      // At most one device pixel per CSS pixel and 1.5M background pixels total.
      // Shader derivative antialiasing and half-resolution bloom retain the grid/glow.
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, 1, Math.sqrt(1500000 / (width * height)))
      )
      renderer.setSize(width, height)
      composer.setSize(width, height)
      uniforms.iResolution.value.set(width, height, renderer.getPixelRatio())
      refresh()
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting
        refresh()
      },
      { threshold: 0 }
    )
    observer.observe(container)
    document.addEventListener('visibilitychange', refresh)
    media.addEventListener('change', refresh)
    const contextLost = (event: Event) => {
      event.preventDefault()
      stop()
      onSnapshot?.('')
      onFailure?.()
    }
    renderer.domElement.addEventListener('webglcontextlost', contextLost)
    update(initial)
    resize()
    return () => {
      disposed = true
      stop()
      if (updateRef.current === update) updateRef.current = null
      observer.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', refresh)
      media.removeEventListener('change', refresh)
      material.dispose()
      geometry.dispose()
      composer.dispose()
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [containerRef])

  // Numeric scan endpoints prevent fresh inline arrays from retriggering GPU setup.
  useEffect(() => {
    settingsRef.current = params
    updateRef.current?.(params)
  }, [
    params.lineThickness,
    params.linesColor,
    params.scanColor,
    params.gridScale,
    params.scanOpacity,
    params.scanGlow,
    params.scanSoftness,
    params.scanDuration,
    params.scanDelay,
    params.scanDirection,
    params.scanRange[0],
    params.scanRange[1],
    params.chromaticAberration,
    params.noiseIntensity,
    params.bloomIntensity,
    params.maxFps,
  ])
}

// Four viewport/theme snapshots are enough for route return/resize without keeping
// GPU contexts or an unbounded image cache alive. The idle view is the actual shader
// raster, preserving its grid geometry, colors and glow rather than a new UI design.
const snapshots = new Map<string, string>()
function GridRenderer({
  onSnapshot,
  onFailure,
  ...props
}: GridScanProps & { onSnapshot?: (image: string) => void; onFailure?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useGridScanEffect(containerRef, props, onSnapshot, onFailure)
  return <div ref={containerRef} className="absolute inset-0" />
}
export function GridScanBackground(props: GridScanProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({
    width: 0,
    height: 0,
    visible: true,
    hidden: false,
    reduced: false,
  })
  const [snapshot, setSnapshot] = useState<{ key: string; image: string } | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const settings = { ...defaults, ...props }
  const cacheKey = JSON.stringify([
    view.width,
    view.height,
    settings.linesColor,
    settings.scanColor,
    settings.lineThickness,
    settings.gridScale,
    settings.noiseIntensity,
    settings.bloomIntensity,
    settings.chromaticAberration,
  ])
  const existing = snapshot?.key === cacheKey ? snapshot.image : snapshots.get(cacheKey)
  const active = settings.scanOpacity > 0 && !view.reduced && !view.hidden && view.visible
  const ready =
    failure !== cacheKey && view.width > 0 && view.height > 0 && !view.hidden && view.visible
  const save = useCallback(
    (image: string) => {
      snapshots.set(cacheKey, image)
      while (snapshots.size > 4) snapshots.delete(snapshots.keys().next().value!)
      setSnapshot({ key: cacheKey, image })
    },
    [cacheKey]
  )
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const measure = () =>
      setView((previous) => {
        const next = {
          ...previous,
          width: container.clientWidth,
          height: container.clientHeight,
          hidden: document.hidden,
          reduced: media.matches,
        }
        return Object.keys(next).every(
          (key) => next[key as keyof typeof next] === previous[key as keyof typeof previous]
        )
          ? previous
          : next
      })
    const resize = new ResizeObserver(measure)
    resize.observe(container)
    const observer = new IntersectionObserver((entries) =>
      setView((previous) =>
        previous.visible === entries[0].isIntersecting
          ? previous
          : { ...previous, visible: entries[0].isIntersecting }
      )
    )
    observer.observe(container)
    document.addEventListener('visibilitychange', measure)
    media.addEventListener('change', measure)
    measure()
    return () => {
      resize.disconnect()
      observer.disconnect()
      document.removeEventListener('visibilitychange', measure)
      media.removeEventListener('change', measure)
    }
  }, [])
  return (
    <div ref={containerRef} className="absolute inset-0 z-0 grid-background" aria-hidden="true">
      <div className="grid-static-fallback">
        <div className="grid-fallback-floor" />
        <div className="grid-fallback-ceiling" />
        <div className="grid-fallback-left" />
        <div className="grid-fallback-right" />
      </div>
      {existing && (
        <img src={existing} alt="" className="absolute inset-0 w-full h-full" draggable={false} />
      )}
      {ready && (active || existing === undefined) && (
        <GridRenderer
          key={cacheKey + (active ? ':active' : ':snapshot')}
          {...props}
          scanOpacity={active ? settings.scanOpacity : 0}
          onSnapshot={active ? undefined : save}
          onFailure={() => setFailure(cacheKey)}
        />
      )}
    </div>
  )
}
