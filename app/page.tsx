"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Step = "form" | "camera" | "preview" | "done";
type ToastType = "info" | "error" | "success";

async function cropTo9x16(video: HTMLVideoElement): Promise<Blob> {
  const W = 540, H = 960;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const targetRatio = 9 / 16;
  const srcRatio = vw / vh;
  let sx = 0, sy = 0, sw = vw, sh = vh;
  if (srcRatio > targetRatio) {
    sw = vh * targetRatio;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / targetRatio;
    sy = (vh - sh) / 2;
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H);

  // Reduce quality until file is under 500KB (handles complex outdoor backgrounds)
  const MAX_SIZE = 500 * 1024;
  let quality = 0.85;
  while (quality >= 0.3) {
    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", quality)
    );
    if (blob.size <= MAX_SIZE) return blob;
    quality -= 0.1;
  }

  // Last resort: downscale to 360x640
  const smallCanvas = document.createElement("canvas");
  smallCanvas.width = 360;
  smallCanvas.height = 640;
  smallCanvas.getContext("2d")!.drawImage(canvas, 0, 0, 360, 640);
  return new Promise<Blob>((res) =>
    smallCanvas.toBlob((b) => res(b!), "image/jpeg", 0.7)
  );
}

export default function Home() {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [uploading, setUploading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const showToast = (msg: string, type: ToastType = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      setStep("camera"); 
    } catch {
      showToast("Please allow camera access.", "error");
    }
  };


  useEffect(() => {
    if (step === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [step]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const takePicture = async () => {
    if (!videoRef.current) return;
    const blob = await cropTo9x16(videoRef.current);
    setPreviewBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
    stopCamera();
    setStep("preview");
  };

  const retake = async () => {
    URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setPreviewBlob(null);
    await startCamera();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return showToast("Please enter your name.", "error");
    if (!agreed) return showToast("Please agree to the privacy policy.", "error");
    await startCamera();
  };

  const handleUpload = async () => {
    if (!previewBlob) return;
    setUploading(true);
    showToast("Uploading your photo...", "info");

    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(fileName, previewBlob, { contentType: "image/jpeg" });

    if (uploadError) {
      setUploading(false);
      return showToast(`Upload failed: ${uploadError.message}`, "error");
    }

    const { data: urlData } = supabase.storage.from("photos").getPublicUrl(fileName);
    const { error: dbError } = await supabase
      .from("users")
      .insert({ name: name.trim(), photo_url: urlData.publicUrl });

    setUploading(false);
    if (dbError) return showToast(`Save failed: ${dbError.message}`, "error");

    setStep("done");
    showToast("You're on the billboard! 🎉", "success");
  };

  useEffect(() => () => stopCamera(), []);

  const toastBg =
    toast?.type === "error" ? "bg-red-500 text-white"
    : toast?.type === "success" ? "bg-emerald-500 text-white"
    : "bg-zinc-800 text-zinc-100";

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 font-sans">
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-lg whitespace-nowrap ${toastBg}`}>
          {toast.msg}
        </div>
      )}

      {step === "form" && (
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <span className="inline-block text-4xl mb-3">🚚</span>
            <h1 className="text-white text-2xl font-bold tracking-tight">Truck Event</h1>
            <p className="text-zinc-400 text-sm mt-1">Take a photo and appear on the billboard!</p>
          </div>
          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-300 text-sm font-medium" htmlFor="name">Name</label>
              <input
                id="name" type="text" placeholder="John Doe" value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 px-4 py-3 text-base outline-none focus:border-white transition-colors"
              />
            </div>
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="sr-only" />
                <div className={`w-5 h-5 rounded-md border transition-colors flex items-center justify-center ${agreed ? "bg-white border-white" : "bg-transparent border-zinc-600 group-hover:border-zinc-400"}`}>
                  {agreed && (
                    <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-zinc-400 text-sm leading-5">I agree to the collection and use of my personal information (name, photo).</span>
            </label>
            <button type="submit" className="mt-2 w-full rounded-xl bg-white text-black font-semibold py-3.5 text-base transition-all hover:bg-zinc-200 active:scale-95">
              📷 Take a Photo
            </button>
          </form>
        </div>
      )}

      {step === "camera" && (
        <div className="w-full max-w-sm flex flex-col items-center gap-5">
          <p className="text-zinc-400 text-sm">Fit your face inside the circle 😊</p>
          <div className="relative w-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-700" style={{ aspectRatio: "9/16" }}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />

            {/* 어두운 마스크 — 원 바깥을 어둡게 */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 178" preserveAspectRatio="none">
              <defs>
                <mask id="circle-mask">
                  <rect width="100" height="178" fill="white" />
                  <ellipse cx="50" cy="62" rx="50" ry="50" fill="black" />
                </mask>
              </defs>
              <rect width="100" height="178" fill="black" fillOpacity="0.55" mask="url(#circle-mask)" />
              {/* 원 테두리 */}
              <ellipse cx="50" cy="62" rx="50" ry="50" fill="none" stroke="white" strokeWidth="0.8" strokeDasharray="3 2" />
            </svg>

            {/* 얼굴 위치 가이드 텍스트 */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
              <span className="text-white/70 text-xs bg-black/40 rounded-full px-3 py-1">
                👆 Align your face inside the circle
              </span>
            </div>
          </div>
          <button onClick={takePicture} className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl active:scale-90 transition-transform">
            <div className="w-12 h-12 rounded-full border-4 border-black" />
          </button>
          <button onClick={() => { stopCamera(); setStep("form"); }} className="text-zinc-500 text-sm">Cancel</button>
        </div>
      )}

      {step === "preview" && (
        <div className="w-full max-w-sm flex flex-col items-center gap-5">
          <p className="text-white font-semibold text-lg">Use this photo?</p>
          <div className="w-full rounded-2xl overflow-hidden border border-zinc-700" style={{ aspectRatio: "9/16" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="preview" className="w-full h-full object-cover scale-x-[-1]" />
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={retake} className="flex-1 py-3.5 rounded-xl bg-zinc-800 text-zinc-200 font-semibold hover:bg-zinc-700 active:scale-95 transition-all">
              Retake
            </button>
            <button onClick={handleUpload} disabled={uploading} className="flex-1 py-3.5 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-50">
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Uploading...
                </span>
              ) : "Post to Billboard 🚚"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="text-7xl animate-bounce">🎉</div>
          <h2 className="text-white text-2xl font-bold">You&apos;re on the billboard!</h2>
          <p className="text-zinc-400 text-sm">Check out the truck display 🚚</p>
          {previewUrl && (
            <div className="w-40 rounded-xl overflow-hidden border border-zinc-700" style={{ aspectRatio: "9/16" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="uploaded" className="w-full h-full object-cover scale-x-[-1]" />
            </div>
          )}
          <a
            href="/screen"
            className="w-full max-w-xs py-4 rounded-xl bg-white text-black font-bold text-base text-center transition-all hover:bg-zinc-200 active:scale-95"
          >
            🎬 View Billboard
          </a>
          <button
            onClick={() => { setStep("form"); setName(""); setAgreed(false); URL.revokeObjectURL(previewUrl); setPreviewUrl(""); }}
            className="px-8 py-3 rounded-xl bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
