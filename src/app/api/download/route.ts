import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const format = request.nextUrl.searchParams.get("format") || "mp3";

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

  // 1. Obtener el título rápidamente
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
    console.warn("No se pudo obtener título, usando nombre genérico");
  }

  // 2. Configurar la "Tubería" (Streaming a stdout)
  const args = [
    "--no-warnings",
    "--output",
    "-", // <--- MAGIA: Escupir datos directamente por consola, no crear archivos
    "--user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ];

  if (hasCookies) args.push("--cookies", cookiesPath);

  if (format === "mp3") {
    // Audio: Extraemos audio al vuelo
    args.push(
      "--extract-audio",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
    );
  } else {
    // Video: Para streaming en MP4 sin fallos de FFmpeg, pedimos el mejor archivo ya pre-mezclado por Youtube (suele ser 720p)
    args.push("--format", "best[ext=mp4]/best");
  }

  args.push(url);

  console.log(`[Piping] Iniciando streaming directo para: ${userFilename}`);

  try {
    // 3. Arrancamos el proceso
    const ytProcess = spawn(ytPath, args);

    ytProcess.stderr.on("data", (data) => {
      // Ignoramos los logs de descarga normal para no saturar la consola
      const msg = data.toString();
      if (!msg.includes("[download]")) {
        console.log("YT-DLP Log:", msg);
      }
    });

    // 4. Creamos el stream que enviará los datos a medida que yt-dlp los escupe
    const responseStream = new ReadableStream({
      start(controller) {
        // Cada vez que yt-dlp descarga un trozo, se lo mandamos al usuario
        ytProcess.stdout.on("data", (chunk) => controller.enqueue(chunk));

        // Cuando termine, cerramos el grifo
        ytProcess.stdout.on("end", () => controller.close());

        ytProcess.on("error", (err) => controller.error(err));
      },
      cancel() {
        // Si el usuario cancela la descarga en el navegador, MATAMOS el proceso
        console.log(
          `[Piping] Descarga cancelada por el usuario. Matando proceso...`,
        );
        ytProcess.kill("SIGKILL");
      },
    });

    // 5. Devolvemos la respuesta
    const headers = new Headers();
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(userFilename)}"`,
    );
    headers.set("Content-Type", format === "mp3" ? "audio/mpeg" : "video/mp4");
    // Nota: No podemos mandar el "Content-Length" porque no sabemos cuánto pesa hasta que termina de bajar
    headers.set("Transfer-Encoding", "chunked");

    return new NextResponse(responseStream, { headers });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    console.error("Error Piping:", errorMessage);
    return NextResponse.json(
      { error: "Fallo en el streaming", details: errorMessage },
      { status: 500 },
    );
  }
}
