/**
 * Provenra animated promo — a Remotion composition.
 *
 * All motion is FRAME-DRIVEN (useCurrentFrame + interpolate/spring) per Remotion
 * rules; CSS transitions/animations are intentionally avoided as they don't
 * render deterministically. Rendered live in-browser via @remotion/player, so it
 * inherits the app's Fira fonts (--font-geist-mono / --font-geist-sans).
 */
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const PROMO = { fps: 30, durationInFrames: 300, width: 1280, height: 720 };

const C = {
  bg: "#0a0f1a",
  surface: "#0f1626",
  border: "#1f2a3f",
  brand: "#2dd4bf",
  fg: "#e6edf6",
  muted: "#8a99b0",
  faint: "#5a6a82",
  violet: "#a78bfa",
  amber: "#fbbf24",
};
const DISPLAY = "var(--font-geist-mono), ui-monospace, monospace";
const SANS = "var(--font-geist-sans), system-ui, sans-serif";

/* ── Layered background: gradient wash + drifting grid + vignette ───────── */
function Background() {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, PROMO.durationInFrames], [0, 60]);
  const glow = interpolate(frame, [0, 60, 240, 300], [0, 0.5, 0.5, 0.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.border}55 1px, transparent 1px), linear-gradient(90deg, ${C.border}55 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          backgroundPosition: `${drift}px ${drift}px`,
          maskImage: "radial-gradient(circle at 50% 45%, black 30%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 45%, black 30%, transparent 78%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 520px at 50% 18%, ${C.brand}${Math.round(
            glow * 40
          )
            .toString(16)
            .padStart(2, "0")} 0%, transparent 60%)`,
        }}
      />
    </AbsoluteFill>
  );
}

/* ── Scene 1: the wordmark assembling ──────────────────────────────────── */
function Wordmark() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
  const scale = interpolate(pop, [0, 1], [0.86, 1]);
  const markRot = interpolate(pop, [0, 1], [-90, 0]);
  const line = interpolate(frame, [10, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22, transform: `scale(${scale})` }}>
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: 22,
            background: `${C.brand}1f`,
            border: `2px solid ${C.brand}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C.brand,
            fontFamily: DISPLAY,
            fontSize: 52,
            fontWeight: 800,
            transform: `rotate(${markRot}deg)`,
            boxShadow: `0 0 40px -8px ${C.brand}aa`,
          }}
        >
          V
        </div>
        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: C.fg,
          }}
        >
          Vital<span style={{ color: C.brand }}>Chain</span>
        </div>
      </div>
      <div
        style={{
          marginTop: 30,
          height: 2,
          width: 520 * line,
          background: `linear-gradient(90deg, transparent, ${C.brand}, transparent)`,
        }}
      />
    </AbsoluteFill>
  );
}

/* ── Scene 2: the tagline ──────────────────────────────────────────────── */
function Tagline() {
  const frame = useCurrentFrame();
  const up = interpolate(frame, [0, 18], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const op = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [14, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", transform: `translateY(${up}px)`, opacity: op }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 58, fontWeight: 700, color: C.fg, letterSpacing: "-0.02em" }}>
          Pharma Supply Chain Intelligence
        </div>
        <div style={{ marginTop: 18, fontFamily: SANS, fontSize: 25, color: C.muted, opacity: subOp }}>
          India-first command center · CDSCO · GS1 track &amp; trace · cold chain
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ── Scene 3: the module grid ──────────────────────────────────────────── */
const MODULES = [
  "Track & Trace",
  "Cold Chain",
  "Quality / NSQ",
  "QMS — CAPA",
  "Warehouse (WMS)",
  "Inventory",
  "Recall & Compliance",
  "Verify",
];
function Modules() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 960 }}>
        <div
          style={{
            opacity: title,
            fontFamily: DISPLAY,
            fontSize: 14,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: C.faint,
            marginBottom: 22,
            textAlign: "center",
          }}
        >
          One platform · Eight modules
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
          {MODULES.map((m, i) => {
            const s = spring({ frame: frame - 8 - i * 4, fps, config: { damping: 16, mass: 0.6 } });
            return (
              <div
                key={m}
                style={{
                  opacity: s,
                  transform: `translateY(${interpolate(s, [0, 1], [18, 0])}px) scale(${interpolate(s, [0, 1], [0.9, 1])})`,
                  fontFamily: SANS,
                  fontSize: 23,
                  fontWeight: 500,
                  color: C.fg,
                  padding: "14px 22px",
                  borderRadius: 12,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  boxShadow: `0 10px 30px -16px #000`,
                }}
              >
                <span style={{ color: C.brand, marginRight: 10 }}>◢</span>
                {m}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ── Scene 4: animated stat counters ───────────────────────────────────── */
function Stat({ value, suffix, label, delay }: { value: number; suffix?: string; label: string; delay: number }) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const n = Math.round(interpolate(p, [0, 1], [0, value]));
  const op = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ textAlign: "center", opacity: op }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 72, fontWeight: 800, color: C.brand, letterSpacing: "-0.02em" }}>
        {n}
        {suffix}
      </div>
      <div style={{ fontFamily: SANS, fontSize: 20, color: C.muted, marginTop: 4 }}>{label}</div>
    </div>
  );
}
function Stats() {
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", gap: 88 }}>
        <Stat value={8} label="integrated modules" delay={0} />
        <Stat value={6} label="regulatory markets" delay={8} />
        <Stat value={100} suffix="%" label="GS1 serialized" delay={16} />
      </div>
    </AbsoluteFill>
  );
}

/* ── Scene 5: outro ────────────────────────────────────────────────────── */
function Outro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 16 } });
  const url = interpolate(frame, [16, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${interpolate(pop, [0, 1], [0.9, 1])})`, textAlign: "center" }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 76, fontWeight: 800, color: C.fg, letterSpacing: "-0.03em" }}>
          Vital<span style={{ color: C.brand }}>Chain</span>
        </div>
        <div
          style={{
            opacity: url,
            marginTop: 18,
            fontFamily: DISPLAY,
            fontSize: 24,
            color: C.brand,
            letterSpacing: "0.04em",
          }}
        >
          provenra.vercel.app
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ── Master timeline ───────────────────────────────────────────────────── */
export function ProvenraPromo() {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
      <Sequence>
        <Background />
      </Sequence>
      <Sequence from={0} durationInFrames={70} layout="none">
        <Wordmark />
      </Sequence>
      <Sequence from={66} durationInFrames={66} layout="none">
        <Tagline />
      </Sequence>
      <Sequence from={130} durationInFrames={84} layout="none">
        <Modules />
      </Sequence>
      <Sequence from={212} durationInFrames={56} layout="none">
        <Stats />
      </Sequence>
      <Sequence from={266} durationInFrames={34} layout="none">
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
}
