import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

// Configura o Cloudinary com as suas chaves secretas da Vercel
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Função para converter o stream do request em buffer
async function streamToBuffer(readableStream) {
  const chunks = [];
  for await (const chunk of readableStream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(request) {
  // ✅ CORREÇÃO AQUI: Usar a sintaxe correta para o ambiente Node.js da Vercel
  const filename = request.headers['x-vercel-filename'];
  
  const buffer = await streamToBuffer(request.body);

  if (!buffer || !filename) {
    return new NextResponse(JSON.stringify({ message: 'Nenhum ficheiro para upload.' }), { status: 400 });
  }

  try {
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'cardapio',
          public_id: filename.split('.')[0]
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      ).end(buffer);
    });

    return new NextResponse(JSON.stringify({ url: uploadResult.secure_url }), { status: 200 });

  } catch (error) {
    console.error('Erro no upload para o Cloudinary:', error); // Adiciona um log mais detalhado
    return new NextResponse(JSON.stringify({ message: 'Erro no upload para o Cloudinary.', error: error.message }), { status: 500 });
  }
}