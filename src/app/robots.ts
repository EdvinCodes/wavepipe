import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/', // No queremos que Google indexe nuestras APIs
    },
    sitemap: 'https://wavepipe.onrender.com/sitemap.xml', // Cambia por tu dominio futuro
  };
}