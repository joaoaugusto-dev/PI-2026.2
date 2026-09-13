import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import {
  ehFimDeSemana,
  ehDiaUtil,
  diasUteis,
  adicionarDiasUteis,
  formatarDataISO,
  listarPorAno,
} from '../services/feriadoService.js';

describe('Serviço de Feriados e Cálculo de Dias Úteis', () => {
  describe('ehFimDeSemana', () => {
    it('identifica sábado como fim de semana', () => {
      const sabado = new Date(Date.UTC(2026, 3, 18)); // 2026-04-18
      expect(ehFimDeSemana(sabado)).toBe(true);
    });

    it('identifica domingo como fim de semana', () => {
      const domingo = new Date(Date.UTC(2026, 3, 19)); // 2026-04-19
      expect(ehFimDeSemana(domingo)).toBe(true);
    });

    it('identifica dia de semana como não fim de semana', () => {
      const segunda = new Date(Date.UTC(2026, 3, 20)); // 2026-04-20
      expect(ehFimDeSemana(segunda)).toBe(false);
    });
  });

  describe('ehDiaUtil', () => {
    it('retorna false para sábado', async () => {
      const resultado = await ehDiaUtil('2026-04-18');
      expect(resultado).toBe(false);
    });

    it('retorna false para domingo', async () => {
      const resultado = await ehDiaUtil('2026-04-19');
      expect(resultado).toBe(false);
    });

    it('retorna false para feriado nacional (Tiradentes - 2026-04-21)', async () => {
      const resultado = await ehDiaUtil('2026-04-21');
      expect(resultado).toBe(false);
    });

    it('retorna true para dia útil normal (Segunda - 2026-04-20)', async () => {
      const resultado = await ehDiaUtil('2026-04-20');
      expect(resultado).toBe(true);
    });
  });

  describe('diasUteis', () => {
    it('Caso 1: soma dias úteis na mesma semana sem feriados (Segunda + 2 dias = Quarta)', async () => {
      // 2026-08-03 (Segunda) -> 04/08 (Terça, 1), 05/08 (Quarta, 2)
      const dataFinal = await diasUteis('2026-08-03', 2);
      expect(dataFinal).toBe('2026-08-05');
    });

    it('Caso 2: pula fins de semana (Sexta + 1 dia útil = Segunda / Sexta + 3 dias úteis = Quarta)', async () => {
      // 2026-08-07 (Sexta) + 1 dia útil -> pula Sáb (08) e Dom (09) -> 2026-08-10 (Segunda)
      const dataFinal1 = await diasUteis('2026-08-07', 1);
      expect(dataFinal1).toBe('2026-08-10');

      // 2026-08-07 (Sexta) + 3 dias úteis -> 10/08 (Seg, 1), 11/08 (Ter, 2), 12/08 (Qua, 3)
      const dataFinal3 = await diasUteis('2026-08-07', 3);
      expect(dataFinal3).toBe('2026-08-12');
    });

    it('Caso 3: pula feriados nacionais cadastrados (Tiradentes 21/04/2026)', async () => {
      // 2026-04-20 (Segunda) + 2 dias úteis:
      // - 21/04 Terça: Tiradentes (Feriado -> PULA)
      // - 22/04 Quarta: Dia útil 1
      // - 23/04 Quinta: Dia útil 2
      const dataFinal = await diasUteis('2026-04-20', 2);
      expect(dataFinal).toBe('2026-04-23');
    });

    it('Caso 4: pula múltiplos feriados consecutivos e fins de semana (Carnaval 2026)', async () => {
      // 2026-02-13 (Sexta-feira antes do Carnaval) + 2 dias úteis:
      // - 14/02 Sábado (PULA)
      // - 15/02 Domingo (PULA)
      // - 16/02 Segunda (Carnaval -> PULA)
      // - 17/02 Terça (Carnaval -> PULA)
      // - 18/02 Quarta: Dia útil 1
      // - 19/02 Quinta: Dia útil 2
      const dataFinal = await diasUteis('2026-02-13', 2);
      expect(dataFinal).toBe('2026-02-19');
    });

    it('Caso 5: calcula corretamente na virada de ano de 2026 para 2027 (Ano Novo)', async () => {
      // 2026-12-30 (Quarta) + 3 dias úteis:
      // - 31/12 Quinta: Dia útil 1
      // - 01/01/2027 Sexta: Confraternização Universal (Feriado -> PULA)
      // - 02/01 Sábado (PULA)
      // - 03/01 Domingo (PULA)
      // - 04/01/2027 Segunda: Dia útil 2
      // - 05/01/2027 Terça: Dia útil 3
      const dataFinal = await diasUteis('2026-12-30', 3);
      expect(dataFinal).toBe('2027-01-05');
    });

    it('Caso 6: retorna a mesma data quando quantidadeDias for 0', async () => {
      const dataFinal = await diasUteis('2026-04-20', 0);
      expect(dataFinal).toBe('2026-04-20');
    });

    it('Caso 7: aceita objeto Date e a função auxiliar adicionarDiasUteis', async () => {
      const dataInicio = new Date(Date.UTC(2026, 3, 20)); // 2026-04-20
      const dataFinalDate = await adicionarDiasUteis(dataInicio, 2);
      expect(formatarDataISO(dataFinalDate)).toBe('2026-04-23');
    });

    it('rejeita quantidade negativa de dias com AppError', async () => {
      await expect(diasUteis('2026-04-20', -1)).rejects.toThrow(
        'A quantidade de dias úteis deve ser maior ou igual a zero'
      );
    });
  });

  describe('Rotas HTTP de Feriados', () => {
    it('GET /v1/feriados?ano=2026 retorna lista de feriados do cache/banco', async () => {
      const res = await request(app).get('/v1/feriados?ano=2026');
      expect(res.status).toBe(200);
      expect(res.body.data.ano).toBe(2026);
      expect(Array.isArray(res.body.data.feriados)).toBe(true);
      expect(res.body.data.feriados.length).toBeGreaterThanOrEqual(12);
    });

    it('GET /v1/feriados/dia-util verifica se data é dia útil', async () => {
      const resFeriado = await request(app).get('/v1/feriados/dia-util?data=2026-04-21');
      expect(resFeriado.status).toBe(200);
      expect(resFeriado.body.data).toEqual({ data: '2026-04-21', diaUtil: false });

      const resUtil = await request(app).get('/v1/feriados/dia-util?data=2026-04-22');
      expect(resUtil.status).toBe(200);
      expect(resUtil.body.data).toEqual({ data: '2026-04-22', diaUtil: true });
    });

    it('GET /v1/feriados/dias-uteis calcula data final somando dias úteis', async () => {
      const res = await request(app).get('/v1/feriados/dias-uteis?dataInicio=2026-04-20&dias=2');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        dataInicio: '2026-04-20',
        dias: 2,
        dataFinal: '2026-04-23',
      });
    });

    it('GET /v1/feriados/dias-uteis retorna 400 para parâmetros inválidos', async () => {
      const res = await request(app).get('/v1/feriados/dias-uteis?dataInicio=data-invalida&dias=2');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
