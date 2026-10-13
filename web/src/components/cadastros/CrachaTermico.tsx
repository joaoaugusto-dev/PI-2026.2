import { createPortal } from 'react-dom'
import { CodigoDeBarras } from '@/components/ferramentas/CodigoDeBarras'

/**
 * Crachá 90 x 60 mm (largura x altura) de colaborador para a térmica: faixa preta com o logo, nome,
 * setor e a matrícula em código de barras e em número grande. Só existe na impressão
 * (`.cracha-impressao` em index.css), no <body> para a regra de impressão esconder o resto do app.
 */
export function CrachaTermico({ nome, matricula, setor }: { nome: string; matricula: string; setor?: string }) {
  return createPortal(
    <div className="cracha-impressao">
      <div className="cracha-cartao">
        <div className="cracha-topo">
          <img src="/brand/soufer-branco.png" alt="Soufer" />
          <span>Colaborador</span>
        </div>
        <div className="cracha-corpo">
          <div>
            <p className="cracha-nome">{nome}</p>
            {setor && <p className="cracha-setor">{setor}</p>}
          </div>
          <div className="cracha-rodape">
            <div className="cracha-barras">
              <CodigoDeBarras valor={matricula} />
            </div>
            <div className="cracha-matricula">
              <small>Matrícula</small>
              <strong>{matricula}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
