/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // A sua configuração existente do loader:
    loader: 'cloudinary',
    path: 'https://res.cloudinary.com/dgrah9zsp/image/upload/',

    // Adicione esta parte para permitir o domínio do Cloudinary:
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '', // Deixe vazio para a porta padrão (443 para https)
        pathname: '/dgrah9zsp/image/upload/**', // Permite qualquer imagem na sua pasta de upload
      },
      // Pode adicionar outros patterns aqui se usar mais domínios
      { // Adicione este pattern para permitir o placeholder
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**', // Permite qualquer imagem do placeholder
      }
    ],
  },
  // experimental: { // Mantenha a configuração turbopack.root se a adicionou
  //   turbopack: {
  //     root: new URL('.', import.meta.url).pathname // Ou o caminho com path/url se necessário
  //   }
  // }
};

export default nextConfig;