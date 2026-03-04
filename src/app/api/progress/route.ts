import { NextRequest } from "next/server";
import { progressMap } from "@/lib/progressStore";

const MAX_SSE_DURATION_MS = 5 * 60 * 1000; // 5 minutos máximo por conexión SSE

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return new Response("Falta el ID", { status: 400 });

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const stream = new ReadableStream({
    async start(controller) {
      // FIX: Race condition — si la descarga ya terminó antes de que el cliente
      // se conectara al SSE, enviamos DONE inmediatamente y cerramos.
      const initialProgress = progressMap.get(id);
      if (initialProgress === "DONE" || initialProgress === "ERROR") {
        controller.enqueue(`data: ${initialProgress}\n\n`);
        progressMap.delete(id);
        controller.close();
        return;
      }

      // Mensaje inicial para abrir la línea
      controller.enqueue(`data: 0%\n\n`);

      // FIX: Timeout máximo para evitar conexiones SSE zombi que nunca cierran
      const maxTimeout = setTimeout(() => {
        clearInterval(interval);
        progressMap.delete(id);
        try {
          controller.enqueue(`data: ERROR\n\n`);
          controller.close();
        } catch {
          // El stream ya puede estar cerrado
        }
      }, MAX_SSE_DURATION_MS);

      const interval = setInterval(() => {
        const currentProgress = progressMap.get(id);
        if (currentProgress) {
          try {
            controller.enqueue(`data: ${currentProgress}\n\n`);
          } catch {
            clearInterval(interval);
            clearTimeout(maxTimeout);
            return;
          }

          if (
            currentProgress === "100%" ||
            currentProgress === "DONE" ||
            currentProgress === "ERROR"
          ) {
            clearInterval(interval);
            clearTimeout(maxTimeout);
            progressMap.delete(id);
            try {
              controller.close();
            } catch {
              /* ya cerrado */
            }
          }
        }
      }, 500);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        clearTimeout(maxTimeout);
        progressMap.delete(id);
      });
    },
  });

  return new Response(stream, { headers });
}
