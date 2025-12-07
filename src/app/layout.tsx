import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner"; // <--- IMPORTAR AQUÍ

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "WavePipe | Ultimate YouTube Downloader",
    template: "%s | WavePipe",
  },
  description: "Download YouTube videos and playlists in MP4 and MP3 format. High quality, no ads, open source, and privacy-focused.",
  keywords: ["youtube downloader", "mp3 converter", "yt-dlp", "nextjs", "open source", "4k video", "playlist downloader"],
  authors: [{ name: "Edvin", url: "https://github.com/edvincodes" }],
  creator: "Edvin",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://wavepipe.onrender.com", 
    title: "WavePipe | Ultimate YouTube Downloader",
    description: "The cleanest downloader on the web. No ads, just waves.",
    siteName: "WavePipe",
    images: [
      {
        url: "/og-image.jpg", // Tendrás que crear una imagen 'og-image.jpg' y ponerla en 'public'
        width: 1200,
        height: 630,
        alt: "WavePipe Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WavePipe",
    description: "Download YouTube content without the hassle.",
    creator: "@edvincodes", // Tu usuario si tienes
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen antialiased selection:bg-pink-500 selection:text-white`}>
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center">
          {children}
        </div>
        
        {/* Fondo decorativo */}
        <div className="fixed inset-0 z-0 pointer-events-none">
           <div className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-[120px]" />
           <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px]" />
        </div>

        {/* --- AÑADIR ESTO AL FINAL: El contenedor de notificaciones --- */}
        <Toaster 
          theme="dark" 
          position="bottom-center" 
          toastOptions={{
            style: {
              background: 'rgba(20, 20, 25, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white',
            }
          }} 
        />
      </body>
    </html>
  );
}