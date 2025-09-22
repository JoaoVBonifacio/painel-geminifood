// Este ficheiro corre no SERVIDOR da Vercel.

export default function handler(request, response) {
  const config = {
    firebase: {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID,
    },
    cloudinary: {
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
    }
  };

  // Verificação de segurança
  if (!config.cloudinary.cloudName || !config.cloudinary.uploadPreset || !config.firebase.apiKey) {
    return response.status(500).json({ 
      error: "Erro de configuração no servidor.",
      message: `Uma ou mais variáveis de ambiente essenciais não estão definidas na Vercel.`
    });
  }

  response.status(200).json(config);
}