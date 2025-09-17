// Este ficheiro corre no SERVIDOR da Vercel, não no navegador.

export default function handler(request, response) {
  // Criamos o objeto de configuração lendo as variáveis do "cofre" da Vercel
  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };

  // Verificamos se todas as chaves foram carregadas
  for (const key in firebaseConfig) {
    if (!firebaseConfig[key]) {
      // Se uma chave estiver em falta, envia uma mensagem de erro clara
      return response.status(500).json({ 
        error: "Erro de configuração no servidor.",
        message: `A variável de ambiente ${key.replace(/([A-Z])/g, '_$1').toUpperCase()} não está definida na Vercel.`
      });
    }
  }

  // Se tudo estiver correto, enviamos o objeto como resposta em formato JSON
  response.status(200).json(firebaseConfig);
}