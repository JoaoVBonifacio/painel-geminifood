import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const message = 'Variável de ambiente BLOB_READ_WRITE_TOKEN não encontrada. Verifique se o Vercel Blob está corretamente conectado a este projeto.';
    return new NextResponse(JSON.stringify({ message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const filename = request.headers['x-vercel-filename'];

  if (!request.body || !filename) {
    return new NextResponse(JSON.stringify({ message: 'Nenhum ficheiro para upload.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const blob = await put(filename, request.body, {
      access: 'public',
    });
    return new NextResponse(JSON.stringify(blob), { status: 200 });
  } catch (error) {
    return new NextResponse(JSON.stringify({ message: 'Erro durante o upload no servidor.', error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}