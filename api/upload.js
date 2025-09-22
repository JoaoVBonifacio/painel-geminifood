// Este ficheiro corre no SERVIDOR da Vercel, não no navegador.
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const config = {
  api: {
    bodyParser: false, // É importante desativar o bodyParser padrão
  },
};

export default async function handler(request) {
  // O nome do ficheiro vem no header 'x-vercel-filename'
  const filename = request.headers.get('x-vercel-filename');

  // O corpo do request (request.body) é o próprio ficheiro
  if (!request.body || !filename) {
    return new NextResponse(JSON.stringify({ message: 'Nenhum ficheiro para upload.' }), { status: 400 });
  }

  try {
    // Faz o upload do ficheiro para o Vercel Blob
    // O 'pathname' é o nome que o ficheiro terá no Blob (ex: "coca-cola.png")
    const blob = await put(filename, request.body, {
      access: 'public', // Torna o ficheiro publicamente acessível
    });

    // Retorna o objeto do blob, que inclui o URL público
    return new NextResponse(JSON.stringify(blob), { status: 200 });

  } catch (error) {
    return new NextResponse(JSON.stringify({ message: 'Erro no upload.', error: error.message }), { status: 500 });
  }
}