import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// --- DEFINICIÓN DE TIPOS ---

// Tipos de respuesta para el Frontend
type VideoInfo = {
  type: 'video';
  title: string;
  author: string;
  thumbnail: string;
  duration: string;
};

type PlaylistInfo = {
  type: 'playlist';
  title: string;
  author: string;
  thumbnail: string;
  totalVideos: number;
  tracks: { id: string; title: string; duration: string }[];
};

// Interfaz para los datos crudos que vienen de yt-dlp (evita el uso de 'any')
interface RawTrack {
  id: string;
  title: string;
  duration: number;
}

// Auxiliar: Segundos a MM:SS
const formatDuration = (seconds: number): string => {
  if (!seconds) return "00:00";
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  if (hh) {
    return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
  }
  return `${mm}:${ss}`;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Falta la URL' }, { status: 400 });
  }

  try {
    // 1. DETECCIÓN DE SISTEMA OPERATIVO (Crucial para Docker vs Windows)
    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
    const ytDlpPath = path.join(process.cwd(), 'bin', binaryName);

    console.log(`[API Info] Usando motor: ${ytDlpPath}`);

    // 2. ARGUMENTOS
    const args = [
      '--dump-single-json', // Devuelve un JSON limpio
      '--flat-playlist',    // Rápido para listas
      '--no-warnings',
      '--no-call-home',
      url
    ];

    if (url.includes('list=')) {
        args.push('--yes-playlist');
    }

    // 3. EJECUCIÓN DEL PROCESO
    const child = spawn(ytDlpPath, args);

    const chunks: Buffer[] = [];
    const errorChunks: Buffer[] = [];

    child.stdout.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => errorChunks.push(Buffer.from(chunk)));

    await new Promise((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) resolve(true);
        else {
           // Si hay datos en stdout, a veces ignoramos el código de error no-fatal
           if (chunks.length > 0) resolve(true);
           else {
             const errorMsg = Buffer.concat(errorChunks).toString('utf-8');
             reject(new Error(`yt-dlp error code ${code}: ${errorMsg}`));
           }
        }
      });
      child.on('error', (err) => reject(err));
    });

    const fullOutput = Buffer.concat(chunks).toString('utf-8');
    
    // 4. PARSEO DE JSON
    let details;
    try {
        if (!fullOutput) throw new Error("Salida vacía de yt-dlp");
        details = JSON.parse(fullOutput);
    } catch {
        console.error("Error parseando JSON. Output recibido:", fullOutput.substring(0, 200));
        throw new Error("La respuesta de YouTube no fue un JSON válido.");
    }

    if (!details) {
        throw new Error("No se recibieron detalles del vídeo.");
    }

    // 5. MAPEO DE DATOS (Video vs Playlist)

    if (details._type === 'playlist' || (details.entries && details.entries.length > 0)) {
      
      const playlistData: PlaylistInfo = {
        type: 'playlist',
        title: details.title || "Playlist",
        author: details.uploader || details.channel || "YouTube",
        thumbnail: details.thumbnails?.[details.thumbnails.length - 1]?.url 
                   || details.entries?.[0]?.thumbnails?.[0]?.url 
                   || "https://i.ytimg.com/img/no_thumbnail.jpg", 
        totalVideos: details.entry_count || details.entries?.length || 0,
        tracks: (details.entries || []).map((item: RawTrack) => ({
          id: item.id,
          title: item.title,
          duration: formatDuration(item.duration)
        }))
      };
      
      return NextResponse.json(playlistData);
    
    } else {
      const videoData: VideoInfo = {
        type: 'video',
        title: details.title,
        author: details.uploader || details.channel || "Desconocido",
        thumbnail: details.thumbnail || details.thumbnails?.[0]?.url,
        duration: formatDuration(details.duration),
      };

      return NextResponse.json(videoData);
    }

  } catch (error: unknown) {
    // Manejo de error tipado 'unknown' para el linter
    let errorMessage = "Error desconocido";
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }

    console.error('[API Error]:', errorMessage);
    
    return NextResponse.json({ 
      error: 'Error al obtener datos.',
      details: errorMessage 
    }, { status: 500 });
  }
}