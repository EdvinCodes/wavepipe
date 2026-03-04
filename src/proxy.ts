import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// NOTA: Este rate-limiter usa memoria en proceso. En producción con múltiples
// instancias (Render, Vercel) cada instancia tiene su propio contador.
// Para un rate-limit robusto en producción, usa Upstash Redis.
const ipRequestCount = new Map<string, { count: number; lastReset: number }>();

const RATE_LIMIT = 15;
const WINDOW_TIME_MS = 60 * 60 * 1000; // 1 hora

// FIX: Limpieza periódica para evitar crecimiento ilimitado de memoria
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 min
let lastCleanup = Date.now();

function cleanupStaleEntries(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const windowStart = now - WINDOW_TIME_MS;
  for (const [ip, data] of ipRequestCount.entries()) {
    if (data.lastReset < windowStart) {
      ipRequestCount.delete(ip);
    }
  }
}

export function middleware(request: NextRequest) {
  if (
    !request.nextUrl.pathname.startsWith("/api/download") &&
    !request.nextUrl.pathname.startsWith("/api/info")
  ) {
    return NextResponse.next();
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "IP_DESCONOCIDA";

  const now = Date.now();
  const windowStart = now - WINDOW_TIME_MS;

  // FIX: Limpiar entradas antiguas para evitar memory leak
  cleanupStaleEntries(now);

  const requestData = ipRequestCount.get(ip);

  if (!requestData || requestData.lastReset < windowStart) {
    ipRequestCount.set(ip, { count: 1, lastReset: now });
  } else {
    requestData.count += 1;

    if (requestData.count > RATE_LIMIT) {
      console.warn(`[RATE LIMIT] IP bloqueada temporalmente: ${ip}`);
      return NextResponse.json(
        {
          error: "Has superado el límite de descargas.",
          details: `Por favor, espera un rato antes de volver a descargar (Límite: ${RATE_LIMIT} por hora).`,
        },
        { status: 429 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
