"use client";

// No necesitamos framer-motion aquí, solo Tailwind para el efecto "pulse"
export default function VideoSkeleton() {
  return (
    <div className="w-full max-w-2xl mt-8 overflow-hidden glass rounded-3xl animate-pulse">
      <div className="flex flex-col md:flex-row h-full">
        {/* Simulación de la Carátula (cuadrado gris pulsante) */}
        <div className="w-full md:w-1/2 h-48 md:h-auto bg-white/10"></div>

        {/* Simulación del Contenido */}
        <div className="flex flex-col justify-between p-6 md:w-1/2 gap-4 bg-white/5">
          <div className="space-y-3">
            {/* Simulación del Título (dos líneas) */}
            <div className="h-6 bg-white/10 rounded w-3/4"></div>
            <div className="h-6 bg-white/10 rounded w-1/2"></div>
            {/* Simulación del Autor */}
            <div className="h-4 bg-white/10 rounded w-1/4 mt-4"></div>
          </div>

          {/* Simulación de los Botones */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="h-16 bg-white/10 rounded-xl"></div>
            <div className="h-16 bg-white/10 rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
