import { NextResponse } from "next/server";
import os from "os";

function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

export async function GET() {
  const ip = getLocalIP();
  return NextResponse.json({ ip });
}
