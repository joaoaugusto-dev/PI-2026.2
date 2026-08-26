import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import consultaRoutes from './consultaRoutes.js';

const router = Router();

// Mapeamento dos módulos na versão v1
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/consulta', consultaRoutes);

export default router;
