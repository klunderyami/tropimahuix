import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares básicos
app.use(express.json());

// Ruta de estado para comprobar que Vite y Express conviven
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: '¡El servidor backend de Tropicaña está vivo y funcionando de lujo!',
    timestamp: new Date().toISOString()
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Express corriendo en http://localhost:${PORT}`);
});