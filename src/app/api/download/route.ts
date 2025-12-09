import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import { promisify } from "util";

// Promisify para poder usar await con unlink (borrar)
const unlinkAsync = promisify(fs.unlink);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const format = request.nextUrl.searchParams.get("format") || "mp3";

  if (!url)
    return NextResponse.json({ error: "URL requerida" }, { status: 400 });

  // 1. Detectar binario
  const isWindows = process.platform === "win32";
  const binName = isWindows ? "yt-dlp.exe" : "yt-dlp";
  const ytPath = path.join(process.cwd(), "bin", binName);

  if (!fs.existsSync(ytPath)) {
    return NextResponse.json(
      { error: "Binario no encontrado" },
      { status: 500 }
    );
  }

  // --- CONFIGURACIÓN DE COOKIES ---
  const cookiesPath = path.join(process.cwd(), "cookies.txt");
  const hasCookies = fs.existsSync(cookiesPath);

  // 2. Preparar rutas temporales
  // Usamos un ID aleatorio para que si dos personas bajan a la vez no se mezclen
  const tempId = Math.random().toString(36).substring(7);
  const tempDir = os.tmpdir();
  // La plantilla de salida para yt-dlp
  const tempFilePathTemplate = path.join(tempDir, `wavepipe_${tempId}.%(ext)s`);

  // Archivo final que esperamos encontrar (mp3 o mp4)
  const expectedFilePath = path.join(
    tempDir,
    `wavepipe_${tempId}.${format === "mp3" ? "mp3" : "mp4"}`
  );

  // 3. Obtener el título (para el nombre del archivo al usuario)
  let userFilename = `download.${format}`;
  try {
    // Preparamos args para obtener título, INCLUYENDO COOKIES si existen
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
  } catch (e) {
    console.warn("No se pudo obtener título, usando nombre genérico");
  }

  // 4. Argumentos de Calidad (Metadatos y Miniatura)
  const args = [
    "--no-warnings",
    "--output",
    tempFilePathTemplate, // Guardamos en disco temporalmente
    "--embed-thumbnail", // <--- CLAVE: Incrustar carátula
    "--add-metadata", // <--- CLAVE: Incrustar Artista/Título

    // --- NUEVO: DISFRAZ ANTI-BOT ---
    "--user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ];

  if (hasCookies) {
    console.log("[Download] Usando cookies autenticadas");
    args.push("--cookies", cookiesPath);
  }

  args.push(url);

  if (format === "mp3") {
    // Audio: Mejor calidad, convertir a mp3
    args.push(
      "--extract-audio",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0"
    );
  } else {
    // Video: Descargar lo mejor y asegurar contenedor MP4
    // Esto requiere FFmpeg para mezclar video+audio
    args.push(
      "--format",
      "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
    );
    args.push("--merge-output-format", "mp4");
  }

  console.log(`[Download] Iniciando proceso para: ${userFilename}`);

  try {
    // 5. Ejecutar la descarga (esperamos a que termine de escribir el archivo)
    await new Promise((resolve, reject) => {
      const process = spawn(ytPath, args);

      // Para debuggear si falla
      process.stderr.on("data", (d) =>
        console.log("YT-DLP Error/Log:", d.toString())
      );

      process.on("close", (code) => {
        if (code === 0) resolve(true);
        else reject(new Error(`yt-dlp exited with code ${code}`));
      });
      process.on("error", (err) => reject(err));
    });

    // 6. Verificar que el archivo existe
    if (!fs.existsSync(expectedFilePath)) {
      throw new Error(
        "El archivo no se generó correctamente. ¿Tienes FFmpeg instalado?"
      );
    }

    // 7. Preparar el envío (Stream)
    const stats = fs.statSync(expectedFilePath);
    const fileStream = fs.createReadStream(expectedFilePath);

    // Cabeceras correctas
    const headers = new Headers();
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(userFilename)}"`
    );
    headers.set("Content-Type", format === "mp3" ? "audio/mpeg" : "video/mp4");
    headers.set("Content-Length", stats.size.toString());

    // 8. Crear Stream de respuesta y borrar al terminar
    const responseStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => {
          controller.close();
          // IMPORTANTE: Borrar el archivo temporal para no llenar el disco
          unlinkAsync(expectedFilePath).catch((e) =>
            console.error("Error borrando temp:", e)
          );
        });
        fileStream.on("error", (err) => {
          controller.error(err);
          unlinkAsync(expectedFilePath).catch((e) =>
            console.error("Error borrando temp:", e)
          );
        });
      },
    });

    return new NextResponse(responseStream, { headers });
  } catch (error: any) {
    console.error("Error Download:", error);
    // Intentar limpiar si falló
    try {
      if (fs.existsSync(expectedFilePath)) await unlinkAsync(expectedFilePath);
    } catch {}

    return NextResponse.json(
      { error: "Fallo en la descarga", details: error.message },
      { status: 500 }
    );
  }
}
