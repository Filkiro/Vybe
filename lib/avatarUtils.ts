/**
 * Retorna as iniciais do nome para avatares quando não há imagem de perfil:
 * - Se tiver nome e sobrenome (duas ou mais palavras): primeira letra do nome + primeira letra do sobrenome (ex: "Asta Edits" -> "AE").
 * - Se não tiver sobrenome (apenas uma palavra): as duas primeiras letras do primeiro nome (ex: "Murilitex" -> "MU", "FilKiro" -> "FI").
 */
export function obterIniciais(nome?: string | null): string {
  if (!nome) return "VY";
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "VY";
  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }
  const primeiro = partes[0][0];
  const ultimo = partes[partes.length - 1][0];
  return (primeiro + ultimo).toUpperCase();
}
