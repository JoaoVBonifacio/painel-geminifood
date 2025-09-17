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

  // Enviamos o objeto como resposta em formato JSON
  response.status(200).json(firebaseConfig);
}