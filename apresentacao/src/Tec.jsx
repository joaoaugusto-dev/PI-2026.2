import {
  ClipboardList, FileText, ScanBarcode, Barcode, SquareKanban, Database, Globe, Server, Cloud,
  Activity, ShieldCheck, Gauge, Container, Wrench, Package, FileCode2, KeyRound,
} from 'lucide-react'
import * as si from 'simple-icons'

/* Logo de cada tecnologia: marca oficial (simple-icons) quando existe, senão um
   ícone lucide. Usado no rodapé de cada slide e no slide "Tecnologias". */
const MARCA = {
  'React': si.siReact, 'React 19': si.siReact, 'Vite': si.siVite, 'Tailwind CSS': si.siTailwindcss,
  'shadcn/ui': si.siShadcnui, 'Radix UI': si.siRadixui, 'Lucide': si.siLucide, 'React Router': si.siReactrouter,
  'TanStack Query': si.siReactquery, 'React Hook Form': si.siReacthookform,
  'Node.js': si.siNodedotjs, 'Node 20': si.siNodedotjs, 'TypeScript': si.siTypescript, 'Express': si.siExpress,
  'Zod': si.siZod, 'JWT': si.siJsonwebtokens, 'Pino': si.siPino, 'Vitest': si.siVitest,
  'PostgreSQL': si.siPostgresql, 'node-postgres': si.siPostgresql,
  'Docker': si.siDocker, 'Traefik': si.siTraefikproxy, 'Nginx': si.siNginx, 'PM2 + Nginx': si.siNginx,
  'GitHub': si.siGithub, 'GitHub Actions': si.siGithubactions, 'Figma': si.siFigma,
  'Insomnia': si.siInsomnia, 'Swagger': si.siSwagger, 'Swagger UI': si.siSwagger,
}
const ICONE = {
  'Visita técnica': [ClipboardList], 'Relatório da visita': [FileText], 'Leitor Code128': [ScanBarcode],
  'react-barcode': [Barcode], 'GitHub Projects': [SquareKanban], 'Migrations SQL': [FileCode2],
  'dbdiagram.io': [Database, '#0E7AFE'], 'BrasilAPI': [Globe, '#009C3B'], 'Dokploy': [Server],
  'Nixpacks': [Package, '#E30613'], 'AWS': [Cloud, '#FF9900'], 'EC2': [Server, '#FF9900'], 'RDS': [Database, '#FF9900'],
  'S3 + CloudFront': [Globe, '#FF9900'], 'CloudWatch': [Activity, '#FF9900'], 'Secrets Manager': [KeyRound, '#FF9900'], 'bcryptjs': [ShieldCheck],
  'Helmet': [ShieldCheck], 'express-rate-limit': [Gauge], 'CORS': [Globe],
}

export function Logo({ nome, tamanho = 30 }) {
  const m = MARCA[nome]
  if (m) return <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" role="img" aria-label={m.title} style={{ flex: 'none' }}><path d={m.path} fill={`#${m.hex === '000000' ? '1D1D1B' : m.hex}`} /></svg>
  const [I = Wrench, cor = '#1D1D1B'] = ICONE[nome] ?? []
  return <I size={tamanho} color={cor} strokeWidth={1.7} style={{ flex: 'none' }} />
}

export const GRUPOS_TEC = [
  ['Front-end', ['React', 'Vite', 'Tailwind CSS', 'shadcn/ui', 'TanStack Query']],
  ['Back-end', ['Node.js', 'TypeScript', 'Express', 'Zod', 'JWT']],
  ['Banco e dados', ['PostgreSQL', 'Migrations SQL', 'dbdiagram.io', 'BrasilAPI']],
  ['Nuvem', ['Docker', 'Traefik', 'Dokploy', 'Nginx', 'AWS']],
  ['Gestão e design', ['GitHub', 'GitHub Actions', 'Figma', 'Insomnia', 'Swagger']],
]
