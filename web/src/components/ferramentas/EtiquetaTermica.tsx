import { createPortal } from 'react-dom'
import { CodigoDeBarras } from '@/components/ferramentas/CodigoDeBarras'

interface Props {
  nome: string
  /** O que vira código de barras e vai grande embaixo (patrimônio da ferramenta, matrícula do colaborador). */
  codigo: string
  /** Linha pequena abaixo do nome (categoria · setor). */
  detalhe?: string
}

/**
 * Etiqueta 90 x 60 mm (largura x altura) para impressora térmica (ferramenta e crachá de colaborador). Fica
 * escondida na tela e só aparece na impressão (`.etiqueta-impressao` em
 * index.css); vai para o <body> para a regra de impressão esconder o resto do
 * app sem depender de quem é o pai. Monocromática: térmica não imprime cor.
 */
export function EtiquetaTermica({ nome, codigo, detalhe }: Props) {
  return createPortal(
    <div className="etiqueta-impressao">
      <img className="etiqueta-logo" src="/brand/soufer-assinatura.png" alt="Soufer" />
      <p className="etiqueta-nome">{nome}</p>
      <p className="etiqueta-meta">{detalhe}</p>
      <CodigoDeBarras valor={codigo} />
      <p className="etiqueta-codigo">{codigo}</p>
    </div>,
    document.body,
  )
}
