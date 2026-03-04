"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Music, Video, Clock, Loader2, ChevronDown } from "lucide-react";
import Image from "next/image";

interface VideoCardProps {
  thumbnail: string;
  title: string;
  author: string;
  duration: string;
  onDownload: (
    format: "mp3" | "mp4",
    quality?: string,
    start?: string,
    end?: string,
  ) => void;
  downloadingFormat: "mp3" | "mp4" | null;
}

export default function VideoCard({
  thumbnail,
  title,
  author,
  duration,
  onDownload,
  downloadingFormat,
}: VideoCardProps) {
  const [quality, setQuality] = useState("720");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, type: "spring" }}
      className="w-full max-w-2xl mt-8 overflow-hidden glass rounded-3xl"
    >
      <div className="flex flex-col md:flex-row">
        {/* Carátula */}
        <div className="relative w-full md:w-1/2 h-48 md:h-auto group cursor-pointer overflow-hidden">
          <Image
            src={thumbnail}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-medium text-white">
            <Clock size={12} />
            {duration}
          </div>
        </div>

        {/* Info y Botones */}
        <div className="flex flex-col justify-between p-6 md:w-1/2 gap-4">
          <div>
            <h3 className="text-xl font-bold text-white line-clamp-2 leading-tight">
              {title}
            </h3>
            <p className="text-sm text-gray-400 mt-2 font-medium">{author}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            {/* --- BOTÓN MP3 --- */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDownload("mp3", "720", start, end)} // <--- Pasamos start y end
              disabled={downloadingFormat !== null}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-colors group relative overflow-hidden h-24
                ${
                  downloadingFormat === "mp3"
                    ? "bg-purple-500/40 border-purple-500"
                    : "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20"
                }`}
            >
              {downloadingFormat === "mp3" ? (
                <>
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                  <span className="text-xs font-bold text-white">
                    Cooking...
                  </span>
                </>
              ) : (
                <>
                  <Music className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
                  <span className="text-xs font-bold text-purple-200">
                    MP3 Audio
                  </span>
                </>
              )}
            </motion.button>

            {/* --- BOTÓN MP4 + SELECTORES --- */}
            <div className="flex flex-col gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onDownload("mp4", quality, start, end)} // <--- Pasamos start y end
                disabled={downloadingFormat !== null}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-colors group relative overflow-hidden h-24
                  ${
                    downloadingFormat === "mp4"
                      ? "bg-blue-500/40 border-blue-500"
                      : "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20"
                  }`}
              >
                {downloadingFormat === "mp4" ? (
                  <>
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                    <span className="text-xs font-bold text-white">
                      Streaming...
                    </span>
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
                    <span className="text-xs font-bold text-blue-200">
                      MP4 Video
                    </span>
                  </>
                )}
              </motion.button>

              {/* Selector de Calidad (se queda igual) */}
              <div className="relative">
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  disabled={downloadingFormat !== null}
                  className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 py-1.5 pl-3 pr-8 outline-none hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="2160" className="bg-gray-900">
                    4K (Ultra HD) - Lento
                  </option>
                  <option value="1080" className="bg-gray-900">
                    1080p (FHD) - Lento
                  </option>
                  <option value="720" className="bg-gray-900">
                    720p (HD) - Rápido
                  </option>
                  <option value="480" className="bg-gray-900">
                    480p (SD) - Rápido
                  </option>
                  <option value="360" className="bg-gray-900">
                    360p (Data Saver)
                  </option>
                </select>
                <ChevronDown className="absolute right-2 top-1.5 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>

              {/* NUEVO: Inputs de Corte (Trimming) */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Inicio (ej: 0:15)"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  disabled={downloadingFormat !== null}
                  className="w-1/2 bg-white/5 border border-white/10 rounded-lg text-xs text-center text-gray-300 py-1.5 outline-none hover:bg-white/10 transition-colors focus:border-blue-500/50 placeholder-gray-600"
                />
                <input
                  type="text"
                  placeholder="Fin (ej: 2:30)"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  disabled={downloadingFormat !== null}
                  className="w-1/2 bg-white/5 border border-white/10 rounded-lg text-xs text-center text-gray-300 py-1.5 outline-none hover:bg-white/10 transition-colors focus:border-blue-500/50 placeholder-gray-600"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
