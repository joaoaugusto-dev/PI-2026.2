import fotoKauan from './assets/foto-kauan.webp'
import fotoHenrique from './assets/foto-henrique.webp'
import fotoJoao from './assets/foto-joao.webp'
import fotoGuilherme from './assets/foto-guilherme.webp'

// Os quatro blocos da apresentação, na ordem de fala. `seg` é o tempo de cada
// um (usado pelo cronômetro do controle no celular). Sem `foto`, mostra as iniciais.
export const BLOCOS = [
  { id: 'intro', nome: 'Introdução', pessoa: 'Kauan Leander Leandrini', iniciais: 'KL', foto: fotoKauan, papel: 'Introdução e documentação', tempo: '2:15', seg: 135 },
  { id: 'infra', nome: 'Banco e nuvem', pessoa: 'Guilherme P. da Rosa Santi', iniciais: 'GS', foto: fotoGuilherme, papel: 'Infraestrutura, banco e nuvem', tempo: '2:15', seg: 135 },
  { id: 'back', nome: 'Back-end', pessoa: 'Henrique de O. Molinari', iniciais: 'HM', foto: fotoHenrique, papel: 'API REST e regras de negócio', tempo: '3:00', seg: 180 },
  { id: 'front', nome: 'Front-end e demo', pessoa: 'João Augusto de Freitas', iniciais: 'JA', foto: fotoJoao, papel: 'Front-end, demonstração e encerramento', tempo: '11:30', seg: 690 },
]
