import { handleUpload, createBlobClient } from '@vercel/blob';
import { NextResponse } from 'next/server';

export default async function handler(request) {
  const body = await request.json();
  const { pathname } = body;

  if (!pathname || !process.env.BLOB_READ_WRITE_TOKEN) {
    return new NextResponse(null, { status: 400 });
  }

  const client = createBlobClient({
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      client,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          tokenPayload: JSON.stringify({
            // Pode adicionar aqui dados extra se precisar, ex: user-id
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Callback que corre DEPOIS do upload terminar
        console.log('Blob upload completed', blob, tokenPayload);
      },
    });

    return new NextResponse(JSON.stringify(jsonResponse), { status: 200 });
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: 'Falha ao gerar URL de upload.' }),
      { status: 500 }
    );
  }
}