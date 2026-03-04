import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Un registro en memoria simple para contar peticiones por IP.
const ipRequestCount = new Map<string, { count: number; lastReset: number }>();

// CONFIGURACIÓN DEL LÍMITE
const RATE_LIMIT = 15; // Máximo 15 descargas...
const WINDOW_TIME_MS = 60 * 60 * 1000; // ...cada 1 hora (en milisegundos)

export function middleware(request: NextRequest) {
  // 1. Solo protegemos las rutas de la API de descarga e info
  if (
    request.nextUrl.pathname.startsWith("/api/download") ||
    request.nextUrl.pathname.startsWith("/api/info")
  ) {
    // 2. Extraer la IP del usuario de forma segura (Compatible con Render, Vercel y Localhost)
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "IP_DESCONOCIDA";

    const now = Date.now();
    const windowStart = now - WINDOW_TIME_MS;

    // 3. Obtener el historial de esta IP
    const requestData = ipRequestCount.get(ip);

    if (!requestData || requestData.lastReset < windowStart) {
      // Si es su primera vez o ya pasó 1 hora, le abrimos la cuenta a 1
      ipRequestCount.set(ip, { count: 1, lastReset: now });
    } else {
      // Si ya tiene cuenta, le sumamos 1
      requestData.count += 1;

      // 4. ¿Ha superado el límite? ¡Hachazo!
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
  }

  // 5. Si todo está bien, dejamos que la petición continúe hacia tu API
  return NextResponse.next();
}

// 6. Configurar en qué rutas actúa este middleware (optimización de Next.js)
export const config = {
  matcher: "/api/:path*",
};
