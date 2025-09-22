import { handleUpload } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export default async function handler(request) {
  const body = await request.json();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new NextResponse(
      JSON.stringify({ message: 'O token de armazenamento não está configurado.' }),
      { status: 500 }
    );
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          // Define os tipos de ficheiro permitidos
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          // Define um payload que pode ser lido no callback
          tokenPayload: JSON.stringify({
            // Ex: 'userId': 'user.id'
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Este código corre DEPOIS do upload terminar com sucesso
        console.log('Upload para o Blob concluído!', blob, tokenPayload);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: 'Falha ao autorizar o upload.' }),
      { status: 500 }
    );
  }
}