"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QRPage() {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [url, setUrl] = useState("");
  const [urlType, setUrlType] = useState<"ngrok" | "local">("local");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generate = async () => {
      try {
        const res = await fetch("/api/tunnel-url");
        const { url: participateUrl, type } = await res.json();
        setUrl(participateUrl);
        setUrlType(type);
        const dataUrl = await QRCode.toDataURL(participateUrl, {
          width: 280,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
        setQrDataUrl(dataUrl);
      } catch {
        const fallback = "http://localhost:3000";
        setUrl(fallback);
        setUrlType("local");
        const dataUrl = await QRCode.toDataURL(fallback, { width: 280, margin: 2 });
        setQrDataUrl(dataUrl);
      } finally {
        setLoading(false);
      }
    };
    generate();
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 font-sans">
      <div className="flex flex-col items-center gap-8 w-full max-w-xs">
        {/* Title */}
        <div className="text-center">
          <span className="text-5xl">🚚</span>
          <h1 className="text-white text-2xl font-bold tracking-tight mt-3">
            Truck Event
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Scan the QR and appear on the billboard!
          </p>
        </div>

        {/* QR Code */}
        <div className="bg-white p-5 rounded-3xl shadow-2xl">
          {loading ? (
            <div className="w-[280px] h-[280px] flex items-center justify-center">
              <svg className="animate-spin w-10 h-10 text-zinc-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR Code" width={280} height={280} className="rounded-xl" />
          )}
        </div>

        {/* URL display */}
        {url && (
          <div className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <p className="text-zinc-500 text-xs">Access URL</p>
              {urlType === "ngrok" ? (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">HTTPS ✓</span>
              ) : (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-2 py-0.5">Local Only</span>
              )}
            </div>
            <p className="text-white text-sm font-mono break-all">{url}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="w-full flex flex-col gap-3">
          {[
          { step: "1", text: "Scan the QR with your phone camera" },
            { step: "2", text: "Enter your name and take a photo" },
            { step: "3", text: "See yourself on the billboard! 🎉" },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-white text-black text-sm font-bold flex items-center justify-center shrink-0">
                {step}
              </span>
              <span className="text-zinc-300 text-sm">{text}</span>
            </div>
          ))}
        </div>

        {/* Link to screen page */}
        <a
          href="/screen"
          className="w-full text-center py-3 rounded-xl bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
        >
          Open Billboard Screen →
        </a>
      </div>
    </div>
  );
}
