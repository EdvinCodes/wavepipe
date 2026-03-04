"use client";

import { motion } from "framer-motion";
import { Music, Video, Clock, Loader2 } from "lucide-react"; // Importamos Loader2
import Image from "next/image";

interface VideoCardProps {
  thumbnail: string;
  title: string;
  author: string;
  duration: string;
  onDownload: (format: "mp3" | "mp4") => void;
  downloadingFormat: "mp3" | "mp4" | null; // <--- NUEVA PROP
}

export default function VideoCard({
  thumbnail,
  title,
  author,
  duration,
  onDownload,
  downloadingFormat, // <--- La recibimos aquí
}: VideoCardProps) {
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
              onClick={() => onDownload("mp3")}
              disabled={downloadingFormat !== null} // Deshabilita si algo está bajando
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-colors group relative overflow-hidden
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

            {/* --- BOTÓN MP4 --- */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDownload("mp4")}
              disabled={downloadingFormat !== null}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-colors group relative overflow-hidden
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
                    Mixing...
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
          </div>
        </div>
      </div>
    </motion.div>
  );
}
