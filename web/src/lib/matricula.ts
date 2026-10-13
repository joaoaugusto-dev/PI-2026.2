/**
 * Matrícula no cadastro de colaborador: de 1 a 3 dígitos (a API completa com zeros à esquerda, 36 vira 0036)
 * ou 4 dígitos. 0, 0000, 5 dígitos e letras são recusados. Login e quiosque continuam exigindo 4 dígitos.
 */
export const MATRICULA_CADASTRO_REGEX = /^(?!0+$)\d{1,3}$|^(?!0000)\d{4}$/
export const MATRICULA_CADASTRO_MENSAGEM = 'A matrícula tem de 1 a 4 dígitos'
