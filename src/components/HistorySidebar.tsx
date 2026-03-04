"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Download, Music, Video, History } from "lucide-react";
import Image from "next/image";
import { HistoryItem } from "@/hooks/useHistory";

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onClear: () => void;
}

export default function HistorySidebar({
  isOpen,
  onClose,
  history,
  onClear,
}: HistorySidebarProps) {
  // FIX: Incluye quality en la URL de re-descarga (antes siempre era 720p)
  const handleRedownload = (item: HistoryItem) => {
    const quality = item.quality || "720";
    const link = document.createElement("a");
    link.href = `/api/download?url=${encodeURIComponent(item.url)}&format=${item.format}&quality=${quality}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0a0a0f] border-l border-white/10 shadow-2xl z-50 flex flex-col"
          >
            {/* Cabecera */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2 text-white">
                <History className="text-blue-400" />
                <h2 className="text-xl font-bold">Downloads</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Lista de Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                  <History size={48} className="opacity-20" />
                  <p>No downloads yet.</p>
                </div>
              ) : (
                history.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group"
                  >
                    {/* Miniatura */}
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.format === "mp3" ? (
                          <Music size={16} className="text-white" />
                        ) : (
                          <Video size={16} className="text-white" />
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="text-sm font-medium text-white truncate">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                            item.format === "mp3"
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-blue-500/20 text-blue-300"
                          }`}
                        >
                          {item.format}
                        </span>
                        {/* FIX: Mostramos la calidad guardada */}
                        {item.format === "mp4" && item.quality && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 font-mono">
                            {item.quality}p
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {item.date}
                        </span>
                      </div>
                    </div>

                    {/* Botón Re-descarga */}
                    <button
                      onClick={() => handleRedownload(item)}
                      className="p-2 self-center rounded-full hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors"
                      title="Download again"
                    >
                      <Download size={18} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {history.length > 0 && (
              <div className="p-4 border-t border-white/10 bg-black/20">
                <button
                  onClick={onClear}
                  className="w-full py-3 flex items-center justify-center gap-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  <Trash2 size={16} />
                  Clear History
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
