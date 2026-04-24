import axios from 'axios';

const api = axios.create({
  // Substituímos pelo IP que acabaste de encontrar
  // Porta 3000 é a padrão do Node.js/Express, confirma se o teu back-end usa esta!
  baseURL: 'http://192.168.8.199:3000', 
  timeout: 5000,
});

export default api;
