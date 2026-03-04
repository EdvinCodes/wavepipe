"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ArrowRight, Loader2 } from "lucide-react"; // Importamos Loader2

// Definimos que el componente acepta una función onSearch y un booleano isLoading
interface SearchInputProps {
  onSearch?: (url: string) => void;
  isLoading?: boolean;
}

export default function SearchInput({ onSearch, isLoading }: SearchInputProps) {
  const [url, setUrl] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (url.trim().length > 0 && onSearch) {
      onSearch(url);
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative w-full max-w-2xl transition-all duration-300 ${isFocused ? "scale-[1.02]" : "scale-100"}`}
    >
      <div
        className={`relative flex items-center w-full h-16 px-4 overflow-hidden rounded-2xl border transition-all duration-300
        ${
          isFocused
            ? "bg-white/10 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
            : "bg-white/5 border-white/10 hover:border-white/20"
        } backdrop-blur-md`}
      >
        <Search
          className={`w-6 h-6 mr-4 transition-colors ${isFocused ? "text-blue-400" : "text-gray-500"}`}
        />

        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()} // Permitir Enter
          placeholder="Paste YouTube URL here..."
          className="w-full bg-transparent border-none outline-none text-lg text-white placeholder-gray-500"
          disabled={isLoading}
        />

        {/* Botón Dinámico: Flecha o Spinner de carga */}
        {url.length > 0 && (
          <motion.button
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={isLoading}
            className="p-2 ml-2 bg-blue-600 rounded-full hover:bg-blue-500 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5" />
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
