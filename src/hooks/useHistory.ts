"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

export interface HistoryItem {
  id: string;
  title: string;
  thumbnail: string;
  format: "mp3" | "mp4";
  date: string;
  url: string;
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Cargar historial al iniciar
  useEffect(() => {
    const saved = localStorage.getItem("wavepipe_history");
    if (saved) {
      // Usamos setTimeout para sacarlo del ciclo síncrono y calmar al linter
      setTimeout(() => {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setHistory(parsed);
        } catch {
          localStorage.removeItem("wavepipe_history");
        }
      }, 0);
    }
  }, []);

  // Función para añadir
  const addToHistory = (item: Omit<HistoryItem, "id" | "date">) => {
    const uniqueId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 9);

    const newItem: HistoryItem = {
      ...item,
      id: uniqueId,
      date: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setHistory((prevHistory) => {
      // 1. Filtramos para eliminar si la URL ya estaba en el historial (evitar duplicados)
      const filteredHistory = prevHistory.filter((h) => h.url !== item.url);

      // 2. Añadimos el nuevo al principio y limitamos a 50
      const updated = [newItem, ...filteredHistory].slice(0, 50);
      localStorage.setItem("wavepipe_history", JSON.stringify(updated));
      return updated;
    });
  };
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("wavepipe_history");
    toast.success("History cleared");
  };

  return {
    history,
    addToHistory,
    clearHistory,
    isOpen,
    setIsOpen,
  };
}
