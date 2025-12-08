import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execFileAsync = util.promisify(execFile);

interface VideoInfo {
  title: string;
  author: string;
  thumbnail: string;
  duration: string;
  isPlaylist: boolean;
  totalVideos?: number;
}

interface TrackInfo {
  id: string;
  title: string;
  duration: string;
}

const formatDuration = (seconds: number): string => {
  if (!seconds) return '00:00';
  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = seconds % 60;
  return hh
    ? `${hh}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`
    : `${mm}:${ss.toString().padStart(2, '0')}`;
};

const isValidUrl = (url: string) => {
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url);
};

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
  if (!isValidUrl(url)) return NextResponse.json({ error: 'URL no válida' }, { status: 400 });

  const isWindows = process.platform === 'win32';
  const binName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
  const ytPath = path.join(process.cwd(), 'bin', binName);

  if (!fs.existsSync(ytPath)) {
    return NextResponse.json({ error: 'yt-dlp no encontrado en el servidor' }, { status: 500 });
  }

  // --- ARREGLO DEL BLOQUEO DE YOUTUBE ---
  const args = [
    '--dump-single-json',
    '--flat-playlist',
    '--no-warnings',
    
    // TRUCO 1: Falsificar ser un navegador real
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  
    
    url,
  ];

  if (url.includes('list=')) args.push('--yes-playlist');

  try {
    // Aumentamos el buffer por si la respuesta JSON es gigante
    const { stdout } = await execFileAsync(ytPath, args, { maxBuffer: 1024 * 1024 * 50 });
    
    if (!stdout) throw new Error("Salida vacía de yt-dlp");

    const data = JSON.parse(stdout);

    const isPlaylist = data._type === 'playlist' || !!data.entries;

    // Buscamos la mejor miniatura de forma segura
    const thumbnail =
      data.thumbnails?.at(-1)?.url ??
      data.entries?.[0]?.thumbnails?.[0]?.url ??
      data.thumbnail ?? 
      '';

    const info: VideoInfo = {
      title: data.title,
      author: data.uploader || data.channel || 'YouTube',
      thumbnail,
      duration: isPlaylist
        ? formatDuration(
            data.entries?.reduce((sum: number, t: any) => sum + (t.duration || 0), 0)
          )
        : formatDuration(data.duration),
      isPlaylist,
      totalVideos: isPlaylist ? data.entry_count || data.entries?.length || 0 : 0,
    };

    if (isPlaylist) {
      const tracks: TrackInfo[] =
        data.entries?.map((t: any) => ({
          id: t.id,
          title: t.title,
          duration: formatDuration(t.duration),
        })) || [];

      return NextResponse.json({ ...info, tracks });
    }

    return NextResponse.json(info);
  } catch (err: any) {
    // Mejoramos el log de error para que Render nos diga la verdad
    const errorMsg = err.stderr || err.message || 'Error desconocido';
    console.error('API Info Error:', errorMsg);
    
    return NextResponse.json(
      { error: 'Falló al obtener info', details: errorMsg },
      { status: 500 }
    );
  }
}