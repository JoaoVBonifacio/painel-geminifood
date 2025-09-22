// Este ficheiro corre no SERVIDOR (Node.js) da Vercel.

import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

// Desativa o parser de corpo do Next.js para lidar com o stream do ficheiro
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(request) {
  // No ambiente Node.js, acedemos aos headers com a notação de parênteses retos
  const filename = request.headers['x-vercel-filename'];

  if (!request.body || !filename) {
    // Usamos NextResponse porque estamos no ambiente Next.js/Node.js
    return new NextResponse(
      JSON.stringify({ message: 'Nenhum ficheiro para upload.' }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const blob = await put(filename, request.body, {
      access: 'public',
    });

    return new NextResponse(
      JSON.stringify(blob), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: 'Erro no upload.', error: error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}