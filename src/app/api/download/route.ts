import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import { promisify } from "util";

const unlinkAsync = promisify(fs.unlink);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const format = request.nextUrl.searchParams.get("format") || "mp3";
  const quality = request.nextUrl.searchParams.get("quality") || "720";

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
    const titleArgs = [
      "--print",
      "title",
      "--no-warnings",
      "--user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ];
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
  // Si piden 1080p o 4K en vídeo, necesitamos usar el disco duro + FFmpeg
  const isPremiumQuality =
    (quality === "1080" || quality === "2160") && format === "mp4";

  if (isPremiumQuality) {
    console.log(
      `[Híbrido] Iniciando VÍA PREMIUM (Disco+FFmpeg) para: ${userFilename} a ${quality}p`,
    );

    const tempId = Math.random().toString(36).substring(7);
    const tempDir = os.tmpdir();
    const tempFilePathTemplate = path.join(
      tempDir,
      `wavepipe_${tempId}.%(ext)s`,
    );
    const expectedFilePath = path.join(tempDir, `wavepipe_${tempId}.mp4`);

    const args = [
      "--no-warnings",
      "--output",
      tempFilePathTemplate,
      "--embed-thumbnail",
      "--add-metadata",
      "--user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ];

    if (hasCookies) args.push("--cookies", cookiesPath);

    // Pedimos el mejor vídeo hasta la calidad elegida + el mejor audio, y forzamos a mezclar en MP4
    args.push(
      "--format",
      `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${quality}][ext=mp4]/best`,
    );
    args.push("--merge-output-format", "mp4");
    args.push(url);

    try {
      // Esperamos a que FFmpeg termine de coser el archivo en disco
      await new Promise((resolve, reject) => {
        const process = spawn(ytPath, args);
        process.on("close", (code) => {
          if (code === 0) resolve(true);
          else reject(new Error(`yt-dlp código ${code}`));
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
      headers.set("Content-Type", "video/mp4");
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

    const args = [
      "--no-warnings",
      "--output",
      "-",
      "--user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
      args.push("--format", `best[height<=${quality}][ext=mp4]/best`);
    }

    args.push(url);

    try {
      const ytProcess = spawn(ytPath, args);

      const responseStream = new ReadableStream({
        start(controller) {
          ytProcess.stdout.on("data", (chunk) => controller.enqueue(chunk));
          ytProcess.stdout.on("end", () => controller.close());
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
