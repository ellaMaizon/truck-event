// filepath: /Users/dev/my-truck-event/app/screen/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import mainImage from "../../public/images/image.png";
import "../stylesheets/screen.css";

interface PhotoEntry {
  id: string;
  name: string;
  photo_url: string;
  created_at: string;
}

interface ActivePhoto {
  entry: PhotoEntry;
  x: number;
  y: number;
  size: number;
  born: number;
}

const LIFETIME_MS = 60_000;
const MOVE_S = 1.3; // total kick+roll deceleration duration (seconds)

// Pick a random screen position (in %) keeping the ball fully visible
function randomPos(size: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxX = 100 - (size / vw) * 100 - 3;
  const maxY = 88  - (size / vh) * 100 - 3;
  return {
    x: 3 + Math.random() * Math.max(maxX, 5),
    y: 3 + Math.random() * Math.max(maxY, 5),
  };
}

// ─── Per-ball animated component ─────────────────────────────────────────────

function BallBubble({ p, opacity }: { p: ActivePhoto; opacity: number }) {
  const [pos, setPos]           = useState({ x: p.x, y: p.y });
  const [rotation, setRotation] = useState(0);
  const [moving, setMoving]     = useState(false);
  const posRef  = useRef({ x: p.x, y: p.y });
  const deadRef = useRef(false);

  useEffect(() => {
    deadRef.current = false;

    const kick = () => {
      if (deadRef.current) return;

      // pick a random destination anywhere on screen
      const aim = randomPos(p.size);
      const dx  = aim.x - posRef.current.x;
      const dy  = aim.y - posRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const spinDir = Math.random() < 0.5 ? 1 : -1;

      // final stop = aim + 18 % of kick vector (ball rolls past the "aim" point)
      const stop = {
        x: Math.min(Math.max(aim.x + dx * 0.18, 2), 94),
        y: Math.min(Math.max(aim.y + dy * 0.18, 2), 86),
      };

      // one smooth ease-out move: fast start, decelerates into stop
      setMoving(true);
      setPos(stop);
      setRotation((r) => r + spinDir * dist * 10);
      posRef.current = stop;

      // after the full transition finishes, rest then kick again
      setTimeout(() => {
        if (deadRef.current) return;
        setMoving(false);
        const wait = 3000 + Math.random() * 2000;
        setTimeout(kick, wait);
      }, MOVE_S * 1000 + 60);
    };

    const t = setTimeout(kick, 500 + Math.random() * 3000);
    return () => {
      deadRef.current = true;
      clearTimeout(t);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // single ease-out curve covers both fly and roll — no phase seam
  const moveTrans = moving
    ? `left ${MOVE_S}s cubic-bezier(0.25, 0.46, 0.45, 0.94), top ${MOVE_S}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
    : "none";

  const spinTrans = moving
    ? `transform ${MOVE_S}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
    : "none";

  return (
    <div
      className="photo-bubble"
      style={{
        left: `${pos.x}%`,
        top:  `${pos.y}%`,
        "--ball-size": `${p.size}px`,
        opacity,
        transition: `${moveTrans}, opacity 1s ease`,
      } as React.CSSProperties}
    >
      <div
        className="ball-wrapper"
        style={{ transform: `rotate(${rotation}deg)`, transition: spinTrans }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/soccer.png" alt="" className="ball-img" />
        <div className="ball-photo-circle">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.entry.photo_url} alt={p.entry.name} className="ball-photo-img" />
        </div>
      </div>
    </div>
  );
}

// ─── Main screen page ─────────────────────────────────────────────────────────
function randomPlacement(size: number) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;
  const xMax = 100 - (size / vw) * 100 - 5;
  const yMax = 85  - ((size * 1.6) / vh) * 100 - 5;
  return {
    x: 5 + Math.random() * Math.max(xMax, 10),
    y: 5 + Math.random() * Math.max(yMax, 10),
  };
}

export default function ScreenPage() {
  const [mounted, setMounted] = useState(false);
  const [photos,  setPhotos]  = useState<ActivePhoto[]>([]);
  const [waiting, setWaiting] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setPhotos((prev) => {
        const alive = prev.filter((p) => Date.now() - p.born < LIFETIME_MS);
        if (alive.length === 0) setWaiting(true);
        return alive;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    const since = new Date(Date.now() - LIFETIME_MS).toISOString();
    supabase
      .from("users")
      .select("id, name, photo_url, created_at")
      .not("photo_url", "is", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const now = Date.now();
          setPhotos(
            [...data].reverse().map((row) => {
              const size = 100 + Math.random() * 30;
              const pos  = randomPlacement(size);
              const born = row.created_at
                ? now - (now - new Date(row.created_at).getTime())
                : now;
              return { entry: row as PhotoEntry, size, born, ...pos };
            })
          );
          setWaiting(false);
        }
      });
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("screen-photos")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "users" },
        (payload) => {
          const row = payload.new as PhotoEntry;
          if (!row.photo_url) return;
          const size = 100 + Math.random() * 30;
          const pos  = randomPlacement(size);
          setWaiting(false);
          setPhotos((prev) => [...prev, { entry: row, size, born: Date.now(), ...pos }]);
        }
      )
      .subscribe((status) => { console.log("[Realtime] status:", status); });
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const since = new Date(Date.now() - LIFETIME_MS).toISOString();
      supabase
        .from("users")
        .select("id, name, photo_url, created_at")
        .not("photo_url", "is", null)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .then(({ data }) => {
          if (!data || data.length === 0) return;
          setPhotos((prev) => {
            const existingIds = new Set(prev.map((p) => p.entry.id));
            const now = Date.now();
            const newEntries = data
              .filter((row) => !existingIds.has(row.id) && row.photo_url)
              .map((row) => {
                const size = 100 + Math.random() * 30;
                const pos  = randomPlacement(size);
                const born = row.created_at
                  ? now - (now - new Date(row.created_at).getTime())
                  : now;
                return { entry: row as PhotoEntry, size, born, ...pos };
              });
            if (newEntries.length === 0) return prev;
            setWaiting(false);
            return [...prev, ...newEntries];
          });
        });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return (
    <div className="screen-container">
      <div className="screen-preload">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mainImage.src} alt="" />
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mainImage.src} alt="bg" className="screen-bg-image" />
      <div className="screen-overlay" />

      {!mounted && (
        <div className="screen-center">
          <div className="screen-truck-icon">🚚</div>
        </div>
      )}

      {mounted && waiting && (
        <div className="screen-waiting">
          <div className="screen-truck-icon">🚚</div>
          <p className="screen-waiting-title">Waiting for participants...</p>
          <p className="screen-waiting-subtitle">Scan the QR code and upload your photo!</p>
        </div>
      )}

      {mounted && photos.map((p) => {
        const elapsed   = Date.now() - p.born;
        const remaining = LIFETIME_MS - elapsed;
        const opacity   = remaining < 10_000 ? Math.max(remaining / 10_000, 0) : 1;
        return <BallBubble key={`${p.entry.id}-${p.born}`} p={p} opacity={opacity} />;
      })}
    </div>
  );
}
