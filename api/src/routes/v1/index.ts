import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import consultaRoutes from './consultaRoutes.js';
import feriadoRoutes from './feriadoRoutes.js';
import ferramentaRoutes from './ferramentaRoutes.js';
import colaboradorRoutes from './colaboradorRoutes.js';
import setorRoutes from './setorRoutes.js';
import categoriaRoutes from './categoriaRoutes.js';
import atividadeRoutes from './atividadeRoutes.js';
import opcoesRoutes from './opcoesRoutes.js';

const router = Router();

// Mapeamento dos módulos na versão v1
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/consulta', consultaRoutes);
router.use('/feriados', feriadoRoutes);
router.use('/ferramentas', ferramentaRoutes);
router.use('/colaboradores', colaboradorRoutes);
router.use('/setores', setorRoutes);
router.use('/categorias', categoriaRoutes);
router.use('/atividades', atividadeRoutes);
router.use('/opcoes', opcoesRoutes);

export default router;
