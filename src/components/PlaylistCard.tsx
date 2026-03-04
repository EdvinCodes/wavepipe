"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Square,
  CheckSquare,
  Music,
  Video,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

// Interfaz para definir qué datos enviamos al historial (Adiós 'any')
interface HistoryPayload {
  title: string;
  thumbnail: string;
  format: "mp3" | "mp4";
  url: string;
}

interface Track {
  id: string;
  title: string;
  duration: string;
}

interface PlaylistCardProps {
  title: string;
  author: string;
  thumbnail: string;
  totalVideos: number;
  tracks: Track[];
  onAddToHistory: (item: HistoryPayload) => void; // <--- Tipado estricto
}

export default function PlaylistCard({
  title,
  author,
  thumbnail,
  totalVideos,
  tracks,
  onAddToHistory,
}: PlaylistCardProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    tracks.map((t) => t.id),
  );
  const [format, setFormat] = useState<"mp3" | "mp4">("mp3");
  const [isDownloading, setIsDownloading] = useState(false);
  const [progressText, setProgressText] = useState("");

  const toggleTrack = (id: string) => {
    if (isDownloading) return;
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    if (isDownloading) return;
    if (selectedIds.length === tracks.length) setSelectedIds([]);
    else setSelectedIds(tracks.map((t) => t.id));
  };

  const triggerIsolatedDownload = (url: string) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);

    // Aumentamos el timeout a 5 minutos (300000ms) para vídeos largos o 4K
    // Esto evita que la descarga se corte silenciosamente
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 300000);
  };

  const handleBatchDownload = async () => {
    if (selectedIds.length === 0) return;

    setIsDownloading(true);
    toast.info("Queue Started", {
      description:
        "Files will appear one by one. Please allow 5-10s for the server to process each file.",
      duration: 5000,
    });

    for (let i = 0; i < selectedIds.length; i++) {
      const id = selectedIds[i];
      const currentNumber = i + 1;
      const total = selectedIds.length;
      const track = tracks.find((t) => t.id === id);

      setProgressText(`Requesting ${currentNumber}/${total}...`);

      const videoUrl = `https://www.youtube.com/watch?v=${id}`;
      const downloadUrl = `/api/download?url=${encodeURIComponent(videoUrl)}&format=${format}`;

      triggerIsolatedDownload(downloadUrl);

      // GUARDAR EN HISTORIAL (Ahora con tipos correctos)
      if (track) {
        onAddToHistory({
          title: track.title,
          thumbnail: thumbnail,
          format: format,
          url: videoUrl,
        });
      }

      toast.success(`Processing "${track?.title.substring(0, 20)}..."`, {
        description: "Download will start automatically in a moment.",
        duration: 2000,
      });

      if (i < total - 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    setProgressText("All requests sent!");
    toast.success("All requests sent!", {
      description:
        "Your browser will handle the rest. Check your downloads folder shortly.",
    });

    setTimeout(() => {
      setIsDownloading(false);
      setProgressText("");
    }, 3000);
  };

  const isAllSelected =
    selectedIds.length === tracks.length && tracks.length > 0;

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.03 } },
  };
  const item = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-5xl mt-8 overflow-hidden glass rounded-3xl flex flex-col lg:flex-row lg:h-[600px] shadow-2xl"
    >
      <div className="w-full lg:w-1/3 p-6 flex flex-col items-center bg-black/20 border-b lg:border-b-0 lg:border-r border-white/10 z-10 relative">
        <div className="relative w-32 h-32 lg:w-48 lg:h-48 mb-4 shadow-2xl rounded-2xl overflow-hidden group shrink-0">
          <Image
            src={thumbnail}
            alt={title}
            fill
            sizes="(max-width: 768px) 150px, 300px"
            className="object-cover"
          />
        </div>
        <h2 className="text-lg lg:text-xl font-bold text-white mb-1 line-clamp-2 text-center">
          {title}
        </h2>
        <p className="text-xs lg:text-sm text-gray-400 mb-6 text-center">
          {author} • {totalVideos} videos
        </p>

        <div className="w-full space-y-4 mt-auto">
          <div className="bg-black/40 p-1 rounded-xl flex relative">
            <motion.div
              className="absolute top-1 bottom-1 bg-white/10 rounded-lg shadow-sm"
              initial={false}
              animate={{
                left: format === "mp3" ? "4px" : "50%",
                width: "calc(50% - 4px)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <button
              onClick={() => !isDownloading && setFormat("mp3")}
              className={`flex-1 py-2 text-sm font-bold z-10 flex items-center justify-center gap-2 transition-colors ${format === "mp3" ? "text-white" : "text-gray-500"}`}
            >
              <Music size={14} /> MP3
            </button>
            <button
              onClick={() => !isDownloading && setFormat("mp4")}
              className={`flex-1 py-2 text-sm font-bold z-10 flex items-center justify-center gap-2 transition-colors ${format === "mp4" ? "text-white" : "text-gray-500"}`}
            >
              <Video size={14} /> MP4
            </button>
          </div>

          <button
            onClick={handleBatchDownload}
            disabled={selectedIds.length === 0 || isDownloading}
            className={`w-full py-4 px-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 relative overflow-hidden
              ${
                isDownloading
                  ? "bg-gray-800 text-gray-300 cursor-wait"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isDownloading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">{progressText}</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>
                  Download{" "}
                  {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
                </span>
              </>
            )}
          </button>

          <button
            onClick={toggleAll}
            disabled={isDownloading}
            className="text-xs text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2 w-full py-2"
          >
            {isAllSelected ? <CheckSquare size={14} /> : <Square size={14} />}
            {isAllSelected ? "Deselect All" : "Select All"}
          </button>
        </div>
      </div>

      <div className="w-full lg:w-2/3 flex flex-col bg-black/10 min-h-[400px] lg:min-h-0 relative">
        <div className="p-4 border-b border-white/5 flex justify-between items-center text-[10px] lg:text-xs font-semibold text-gray-400 uppercase tracking-wider bg-black/20 backdrop-blur-md sticky top-0 z-20">
          <span>Track Selection</span>
          <span>Time</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          <motion.ul variants={container} initial="hidden" animate="show">
            {tracks.map((track) => {
              const isSelected = selectedIds.includes(track.id);
              return (
                <motion.li
                  key={track.id}
                  variants={item}
                  onClick={() => toggleTrack(track.id)}
                  className={`flex items-center justify-between p-3 lg:p-4 rounded-xl cursor-pointer transition-all border border-transparent
                    ${isSelected ? "bg-white/10 border-white/5 shadow-inner" : "hover:bg-white/5 opacity-70 hover:opacity-100"} active:scale-[0.99] touch-manipulation`}
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div
                      className={`shrink-0 transition-colors ${isSelected ? "text-blue-400" : "text-gray-600"}`}
                    >
                      {isSelected ? (
                        <CheckSquare size={22} />
                      ) : (
                        <Square size={22} />
                      )}
                    </div>
                    <span
                      className={`text-sm lg:text-base font-medium truncate max-w-[180px] sm:max-w-[300px] lg:max-w-[400px] ${isSelected ? "text-white" : "text-gray-300"}`}
                    >
                      {track.title}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono shrink-0 ml-2">
                    {track.duration}
                  </span>
                </motion.li>
              );
            })}
          </motion.ul>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/40 to-transparent pointer-events-none lg:hidden" />
      </div>
    </motion.div>
  );
}
