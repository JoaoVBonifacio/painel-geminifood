import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

// Configura o Cloudinary com as suas chaves da Vercel
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export const config = {
  api: {
    bodyParser: false, // Fundamental para o streaming funcionar
  },
};

export default async function handler(request) {
  const filename = request.headers['x-vercel-filename'];

  if (!filename) {
    return new NextResponse(JSON.stringify({ message: 'Nome do ficheiro não encontrado.' }), { status: 400 });
  }

  try {
    // A 'Promise' vai esperar que o upload via streaming termine
    const uploadResult = await new Promise((resolve, reject) => {
      // 1. Cria um "canal" de upload para o Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'cardapio',
          public_id: filename.split('.')[0]
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve(result);
        }
      );

      // 2. "Canaliza" (pipe) o ficheiro que chega do navegador diretamente para o Cloudinary
      request.pipe(uploadStream);
    });

    // 3. Se tudo correu bem, retorna o URL da imagem
    return new NextResponse(JSON.stringify({ url: uploadResult.secure_url }), { status: 200 });

  } catch (error) {
    console.error('Erro no upload via streaming para o Cloudinary:', error);
    return new NextResponse(JSON.stringify({ message: 'Erro no upload para o Cloudinary.', error: error.message }), { status: 500 });
  }
}