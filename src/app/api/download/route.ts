import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import { promisify } from "util";
import { progressMap } from "@/lib/progressStore";

const unlinkAsync = promisify(fs.unlink);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const format = request.nextUrl.searchParams.get("format") || "mp3";
  const quality = request.nextUrl.searchParams.get("quality") || "720";
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  const progressId = request.nextUrl.searchParams.get("progressId");

  // Función para extraer el porcentaje de la consola de yt-dlp
  const reportProgress = (chunk: Buffer | string) => {
    if (!progressId) return;
    const text = chunk.toString();

    // Nueva RegEx más agresiva: busca cualquier número (con decimales) seguido de %
    const match = text.match(/([\d\.]+)%/);

    if (match && match[1]) {
      const value = match[1];
      // Evitamos actualizar si es el mismo valor para no saturar el mapa
      if (progressMap.get(progressId) !== `${value}%`) {
        progressMap.set(progressId, `${value}%`);
      }
    }
  };

  if (!url)
    return NextResponse.json({ error: "URL requerida" }, { status: 400 });

  const isWindows = process.platform === "win32";
  const binName = isWindows ? "yt-dlp.exe" : "yt-dlp";
  const ytPath = path.join(process.cwd(), "bin", binName);

  if (!fs.existsSync(ytPath)) {
    return NextResponse.json(
      { error: "Binario no encontrado" },
      { status: 500 },
    );
  }

  const cookiesPath = path.join(process.cwd(), "cookies.txt");
  const hasCookies = fs.existsSync(cookiesPath);

  // 1. Obtener título
  let userFilename = `download.${format}`;
  try {
    const titleArgs = ["--print", "title", "--no-warnings", "--rm-cache-dir"];
    if (hasCookies) titleArgs.push("--cookies", cookiesPath);
    titleArgs.push(url);

    const titleProcess = spawn(ytPath, titleArgs);
    let titleData = "";
    for await (const chunk of titleProcess.stdout)
      titleData += chunk.toString();
    const cleanTitle = titleData.trim().replace(/[^\w\s\-\.]/gi, "") || "video";
    userFilename = `${cleanTitle}.${format}`;
  } catch {
    console.warn("No se pudo obtener título.");
  }

  // --- DECISIÓN DEL SISTEMA HÍBRIDO ---
  // IMPORTANTE: Si hay "start" o "end", FORZAMOS la Vía Premium (Disco) porque
  // FFmpeg necesita escribir en el disco para recortar con precisión.
  const isPremiumQuality =
    ((quality === "1080" || quality === "2160") && format === "mp4") ||
    !!start ||
    !!end;

  if (isPremiumQuality) {
    console.log(
      `[Híbrido] Iniciando VÍA PREMIUM (Disco+FFmpeg) para: ${userFilename}`,
    );

    const tempId = Math.random().toString(36).substring(7);
    const tempDir = os.tmpdir();
    const tempFilePathTemplate = path.join(
      tempDir,
      `wavepipe_${tempId}.%(ext)s`,
    );
    // FIX: Ahora soporta generar MP3 recortados correctamente
    const expectedFilePath = path.join(
      tempDir,
      `wavepipe_${tempId}.${format === "mp3" ? "mp3" : "mp4"}`,
    );

    const args = [
      "--no-warnings",
      "--rm-cache-dir",
      "--output",
      tempFilePathTemplate,
      "--embed-thumbnail",
      "--add-metadata",
    ];

    if (hasCookies) args.push("--cookies", cookiesPath);

    if (format === "mp3") {
      args.push(
        "--extract-audio",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
      );
    } else {
      args.push(
        "--format",
        `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${quality}][ext=mp4]/best`,
      );
      args.push("--merge-output-format", "mp4");
    }

    // --- EL FIX DEL RECORTE ---
    if (start || end) {
      const s = start || "0";
      const e = end || "inf";
      args.push("--download-sections", `*${s}-${e}`);
      // CLAVE: Obliga a FFmpeg a cortar el vídeo exactamente donde le pedimos
      args.push("--force-keyframes-at-cuts");
    }

    args.push(url);

    try {
      await new Promise((resolve, reject) => {
        let errorLog = "";
        const process = spawn(ytPath, args);

        // --- NUEVO: Capturamos el progreso ---
        process.stdout.on("data", reportProgress);
        process.stderr.on("data", (chunk) => {
          reportProgress(chunk); // A veces yt-dlp manda el progreso por stderr
          errorLog += chunk.toString();
        });

        process.on("close", (code) => {
          if (progressId) progressMap.set(progressId, "DONE"); // Avisamos que terminó
          if (code === 0) resolve(true);
          else reject(new Error(`yt-dlp código ${code}. Detalle: ${errorLog}`));
        });
        process.on("error", reject);
      });

      if (!fs.existsSync(expectedFilePath))
        throw new Error("Archivo no generado.");

      const stats = fs.statSync(expectedFilePath);
      const fileStream = fs.createReadStream(expectedFilePath);

      const headers = new Headers();
      headers.set(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(userFilename)}"`,
      );
      headers.set(
        "Content-Type",
        format === "mp3" ? "audio/mpeg" : "video/mp4",
      );
      headers.set("Content-Length", stats.size.toString());

      const responseStream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", async () => {
            controller.close();
            try {
              if (fs.existsSync(expectedFilePath))
                await unlinkAsync(expectedFilePath);
            } catch {}
          });
          fileStream.on("error", async (err) => {
            controller.error(err);
            try {
              if (fs.existsSync(expectedFilePath))
                await unlinkAsync(expectedFilePath);
            } catch {}
          });
        },
        cancel: async () => {
          fileStream.destroy();
          try {
            if (fs.existsSync(expectedFilePath))
              await unlinkAsync(expectedFilePath);
          } catch {}
        },
      });

      return new NextResponse(responseStream, { headers });
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : "Error desconocido";
      console.error(errMsg);
      try {
        if (fs.existsSync(expectedFilePath))
          await unlinkAsync(expectedFilePath);
      } catch {}
      return NextResponse.json(
        { error: "Fallo en descarga premium", details: errMsg },
        { status: 500 },
      );
    }
  } else {
    // --- VÍA RÁPIDA (Streaming / Piping) ---
    console.log(
      `[Híbrido] Iniciando VÍA RÁPIDA (Piping) para: ${userFilename}`,
    );

    const args = ["--no-warnings", "--rm-cache-dir", "--output", "-"];

    if (hasCookies) args.push("--cookies", cookiesPath);

    if (format === "mp3") {
      args.push(
        "--extract-audio",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
      );
    } else {
      args.push("--format", `best[height<=${quality}][ext=mp4]/best`);
    }

    // Nota: Ya no hay recortes aquí, todo recorte es forzado a la Vía Premium

    args.push(url);

    try {
      const ytProcess = spawn(ytPath, args);

      const responseStream = new ReadableStream({
        start(controller) {
          ytProcess.stdout.on("data", (chunk) => {
            reportProgress(chunk); // <--- NUEVO: Reportamos progreso al vuelo
            controller.enqueue(chunk);
          });
          ytProcess.stdout.on("end", () => {
            if (progressId) progressMap.set(progressId, "DONE");
            controller.close();
          });
          ytProcess.on("error", (err) => controller.error(err));
        },
        cancel() {
          ytProcess.kill("SIGKILL");
        },
      });

      const headers = new Headers();
      headers.set(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(userFilename)}"`,
      );
      headers.set(
        "Content-Type",
        format === "mp3" ? "audio/mpeg" : "video/mp4",
      );
      headers.set("Transfer-Encoding", "chunked");

      return new NextResponse(responseStream, { headers });
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : "Error desconocido";
      return NextResponse.json(
        { error: "Fallo en el streaming", details: errMsg },
        { status: 500 },
      );
    }
  }
}
