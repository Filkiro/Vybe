import { supabase } from "./supabase";

// Busca os apelidos dos músicos donos de uma lista de músicas/álbuns,
// pra conseguir mostrar/tocar com o nome do autor sem fazer join.
export async function buscarApelidos(usuarioIds: (string | null | undefined)[]) {
  const ids = Array.from(new Set(usuarioIds.filter(Boolean))) as string[];
  if (ids.length === 0) return new Map<string, string | null>();

  const { data } = await supabase
    .from("perfil_musico")
    .select("usuario_id, apelido")
    .in("usuario_id", ids);

  return new Map<string, string | null>(
    (data ?? []).map((p: any) => [p.usuario_id, p.apelido ?? null])
  );
}
