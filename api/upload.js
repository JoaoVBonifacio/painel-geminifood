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
    bodyParser: false, // Desativamos o bodyParser para lidar com o stream do ficheiro
  },
};

export default async function handler(request) {
  const filename = request.headers.get('x-vercel-filename');
  const buffer = await streamToBuffer(request.body);

  if (!buffer || !filename) {
    return new NextResponse(JSON.stringify({ message: 'Nenhum ficheiro para upload.' }), { status: 400 });
  }

  try {
    // Faz o upload do buffer para o Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'cardapio', // Guarda na pasta 'cardapio' que você criou
          public_id: filename.split('.')[0] // Usa o nome do ficheiro sem a extensão
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      ).end(buffer);
    });

    // Retorna a URL segura da imagem guardada no Cloudinary
    return new NextResponse(JSON.stringify({ url: uploadResult.secure_url }), { status: 200 });

  } catch (error) {
    return new NextResponse(JSON.stringify({ message: 'Erro no upload para o Cloudinary.', error: error.message }), { status: 500 });
  }
}