import { NextResponse } from "next/server";

export async function GET() {
  // 1. .env.local에 TUNNEL_URL이 있으면 우선 사용
  if (process.env.TUNNEL_URL) {
    return NextResponse.json({ url: process.env.TUNNEL_URL, type: "ngrok" });
  }

  // 2. ngrok
  try {
    const res = await fetch("http://127.0.0.1:4040/api/tunnels", {
      cache: "no-store",
    });
    const data = await res.json();
    const tunnel = data.tunnels?.find(
      (t: { proto: string; public_url: string }) => t.proto === "https"
    );
    if (tunnel) {
      return NextResponse.json({ url: tunnel.public_url, type: "ngrok" });
    }
  } catch {
    // ngrok이 실행 중이 아닌 경우 로컬 IP로 fallback
  }

  // fallback: 로컬 IP
  const os = await import("os");
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return NextResponse.json({
          url: `http://${iface.address}:3000`,
          type: "local",
        });
      }
    }
  }

  return NextResponse.json({ url: "http://localhost:3000", type: "local" });
}
