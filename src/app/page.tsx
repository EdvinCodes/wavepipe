"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner"; 
import { Github, Heart, History, AlertCircle } from "lucide-react"; 

import SearchInput from "@/components/SearchInput";
import VideoCard from "@/components/VideoCard";
import PlaylistCard from "@/components/PlaylistCard";
import VideoSkeleton from "@/components/VideoSkeleton";
import HistorySidebar from "@/components/HistorySidebar";
import { useHistory } from "@/hooks/useHistory";

// --- 1. DEFINICIÓN DE TIPOS ACTUALIZADA (Según tu nuevo backend) ---

interface Track {
  id: string;
  title: string;
  duration: string;
}

// Unificamos la respuesta porque tu API ahora devuelve un objeto consistente
interface SearchResult {
  title: string;
  author: string;
  thumbnail: string;
  duration: string;
  isPlaylist: boolean; // <--- El cambio clave está aquí
  totalVideos: number;
  tracks?: Track[];    // Solo si es playlist
}

export default function Home() {
  const [data, setData] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState("");
  const [downloadingFormat, setDownloadingFormat] = useState<"mp3" | "mp4" | null>(null);

  const { history, addToHistory, clearHistory, isOpen, setIsOpen } = useHistory();

  const handleSearch = async (url: string) => {
    setLoading(true);
    setData(null);
    setError(null);
    setCurrentUrl(url);

    try {
      const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Error al obtener información');
      
      setData(result); // Guardamos el resultado directo

    } catch (err: unknown) {
      let errorMessage = "Ocurrió un error inesperado";
      if (err instanceof Error) errorMessage = err.message;
      else if (typeof err === "string") errorMessage = err;

      console.error(err);
      setError(errorMessage);
      toast.error("Error finding video", { description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (format: "mp3" | "mp4") => {
    if (!currentUrl) return;

    setDownloadingFormat(format);
    const toastId = toast.loading(
      format === "mp3" ? "Extracting Audio..." : "Getting Video Stream...", 
      { description: "Starting download process..." }
    );

    // Creamos el enlace invisible para activar la descarga del backend
    const link = document.createElement('a');
    link.href = `/api/download?url=${encodeURIComponent(currentUrl)}&format=${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Guardar en Historial
    if (data) {
      addToHistory({
        title: data.title,
        thumbnail: data.thumbnail,
        format: format,
        url: currentUrl
      });
    }

    // Feedback visual
    setTimeout(() => {
      setDownloadingFormat(null);
      toast.success("Download Started! 🚀", {
        id: toastId,
        description: "Your browser should start the download shortly.",
        duration: 4000
      });
    }, 2000); 
  };

  return (
    <main className="flex flex-col items-center min-h-screen w-full max-w-4xl px-4 mx-auto text-center pt-20 relative">
      
      {/* BOTÓN DE HISTORIAL */}
      <div className="absolute top-6 right-6 z-20">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-gray-300 hover:text-white transition-all shadow-lg backdrop-blur-md"
        >
          <History size={20} />
        </button>
      </div>

      <HistorySidebar 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        history={history} 
        onClear={clearHistory}
      />

      <div className="flex-1 w-full flex flex-col items-center justify-center">
        
        <motion.div 
          layout
          className={`space-y-4 transition-all duration-500 ${data || loading ? "mt-0 mb-8" : "mb-12"}`}
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 pb-2">
            WavePipe
          </h1>
          
          <AnimatePresence>
            {!data && !loading && !error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-lg text-gray-400 max-w-lg mx-auto"
              >
                 The ultimate open-source downloader.
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <SearchInput onSearch={handleSearch} isLoading={loading} />

        <div className="w-full flex justify-center min-h-[200px] mt-4 mb-20">
          <AnimatePresence mode="wait">
            
            {loading && (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex justify-center">
                <VideoSkeleton />
              </motion.div>
            )}

            {!loading && error && (
              <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 flex items-center gap-2">
                <AlertCircle className="text-red-400" />
                <p>{error}</p>
              </motion.div>
            )}

            {/* --- RENDERIZADO CONDICIONAL ACTUALIZADO --- */}
            
            {/* Si NO es playlist y tenemos datos -> VideoCard */}
            {!loading && !error && data && !data.isPlaylist && (
              <VideoCard 
                key="video-card"
                thumbnail={data.thumbnail}
                title={data.title}
                author={data.author}
                duration={data.duration}
                onDownload={handleDownload}
                downloadingFormat={downloadingFormat}
              />
            )}

            {/* Si SÍ es playlist y tenemos datos -> PlaylistCard */}
            {!loading && !error && data && data.isPlaylist && (
              <PlaylistCard 
                key="playlist-card"
                title={data.title}
                author={data.author}
                thumbnail={data.thumbnail}
                totalVideos={data.totalVideos}
                tracks={data.tracks || []} // Aseguramos array aunque venga undefined
                onAddToHistory={addToHistory}
              />
            )}

          </AnimatePresence>
        </div>
      </div>

      <footer className="w-full py-6 mt-auto border-t border-white/5 bg-black/20 backdrop-blur-sm absolute bottom-0 left-0 right-0 lg:static lg:bg-transparent lg:border-none">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <span>Developed with</span>
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }} 
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Heart size={14} className="text-red-500 fill-red-500" />
          </motion.div>
          <span>by</span>
          <a 
            href="https://github.com/edvincodes" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-white font-medium hover:text-blue-400 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full border border-white/10"
          >
            <Github size={14} />
            Edvin
          </a>
        </div>
      </footer>

    </main>
  );
}