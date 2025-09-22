import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(request) {
  // Passo de Diagnóstico: Verificar se a variável de ambiente essencial existe.
  // A Vercel deve criar esta variável automaticamente quando o Blob store é conectado.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const message = 'Variável de ambiente BLOB_READ_WRITE_TOKEN não encontrada. Verifique se o Vercel Blob está corretamente conectado a este projeto nas configurações da Vercel e faça um novo deploy.';
    
    return new NextResponse(
      JSON.stringify({ message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const filename = request.headers['x-vercel-filename'];

  if (!request.body || !filename) {
    return new NextResponse(
      JSON.stringify({ message: 'Nenhum ficheiro para upload.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Tenta fazer o upload para o Vercel Blob
    const blob = await put(filename, request.body, {
      access: 'public',
    });

    // Se tiver sucesso, retorna os dados do blob em JSON
    return new NextResponse(JSON.stringify(blob), { status: 200 });

  } catch (error) {
    // Se ocorrer um erro durante o upload, retorna uma mensagem detalhada em JSON
    return new NextResponse(
      JSON.stringify({ message: 'Erro durante o upload no servidor.', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}