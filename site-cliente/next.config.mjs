/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    loader: 'cloudinary',
    path: 'https://res.cloudinary.com/dgrah9zsp/image/upload/',
  },
};

export default nextConfig;