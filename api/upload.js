import { put } from '@vercel/blob';

// Configuração para usar o Vercel Edge Runtime
export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // No Edge Runtime, o 'request' é um objeto padrão da Web API,
  // então 'request.headers.get()' é a forma CORRETA de ler o header.
  const filename = request.headers.get('x-vercel-filename');

  if (!request.body || !filename) {
    return new Response(JSON.stringify({ message: 'Nenhum ficheiro para upload.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const blob = await put(filename, request.body, {
      access: 'public',
    });

    return new Response(JSON.stringify(blob), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ message: 'Erro no upload.', error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}