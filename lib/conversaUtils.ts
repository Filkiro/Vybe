// lib/conversaUtils.ts
import { supabase } from "./supabase";

/**
 * Busca de forma idempotente ou cria uma conversa entre dois usuários.
 * Retorna o ID da conversa no banco (UUID).
 */
export async function obterOuCriarConversa(
  usuarioIdA: string,
  usuarioIdB: string
): Promise<string | null> {
  if (!usuarioIdA || !usuarioIdB || usuarioIdA === usuarioIdB) return null;

  try {
    // 1. Tenta buscar conversa existente em qualquer direção
    const { data: existente } = await supabase
      .from("conversa")
      .select("id")
      .or(
        `and(usuario_id1.eq.${usuarioIdA},usuario_id2.eq.${usuarioIdB}),and(usuario_id1.eq.${usuarioIdB},usuario_id2.eq.${usuarioIdA})`
      )
      .maybeSingle();

    if (existente?.id) {
      return existente.id;
    }

    // 2. Cria se não existir
    const { data: nova, error } = await supabase
      .from("conversa")
      .insert({ usuario_id1: usuarioIdA, usuario_id2: usuarioIdB })
      .select("id")
      .single();

    if (nova?.id) {
      return nova.id;
    }

    if (error) {
      // Se deu conflito de chave única ou corrida paralela, busca novamente
      const { data: retry } = await supabase
        .from("conversa")
        .select("id")
        .or(
          `and(usuario_id1.eq.${usuarioIdA},usuario_id2.eq.${usuarioIdB}),and(usuario_id1.eq.${usuarioIdB},usuario_id2.eq.${usuarioIdA})`
        )
        .maybeSingle();

      return retry?.id ?? null;
    }

    return null;
  } catch (e) {
    console.error("Erro em obterOuCriarConversa:", e);
    return null;
  }
}

/**
 * Executa o fluxo integral de convidar um músico para um evento:
 * 1. Insere ou reativa o registro em evento_convite.
 * 2. Obtém/cria a conversa direta.
 * 3. Envia a mensagem associada (evento_convite_id).
 */
export async function enviarConviteParaMusico(params: {
  organizadorId: string;
  musicoId: string;
  eventoId: string;
  eventoNome?: string;
}): Promise<{ sucesso: boolean; conviteId?: string; conversaId?: string; erro?: string }> {
  const { organizadorId, musicoId, eventoId, eventoNome } = params;

  if (!organizadorId || !musicoId || !eventoId) {
    return { sucesso: false, erro: "Parâmetros obrigatórios ausentes." };
  }

  try {
    // 1. Verifica se já existe convite desse evento para esse músico
    const { data: conviteExistente } = await supabase
      .from("evento_convite")
      .select("id, status")
      .eq("evento_id", eventoId)
      .eq("musico_id", musicoId)
      .maybeSingle();

    let conviteId = conviteExistente?.id;

    if (!conviteId) {
      const { data: novoConvite, error: errConvite } = await supabase
        .from("evento_convite")
        .insert({
          evento_id: eventoId,
          musico_id: musicoId,
          status: "pendente",
        })
        .select("id")
        .single();

      if (errConvite || !novoConvite) {
        return { sucesso: false, erro: errConvite?.message ?? "Erro ao gerar convite." };
      }
      conviteId = novoConvite.id;
    } else if (conviteExistente && conviteExistente.status !== "pendente" && conviteExistente.status !== "aceito") {
      // Reativa se estivesse recusado ou cancelado anteriormente
      await supabase
        .from("evento_convite")
        .update({ status: "pendente" })
        .eq("id", conviteId);
    }

    // 2. Busca ou cria a conversa
    const conversaId = await obterOuCriarConversa(organizadorId, musicoId);
    if (!conversaId) {
      return { sucesso: false, erro: "Não foi possível abrir a sala de conversa." };
    }

    // 3. Insere a mensagem com o vínculo do convite
    const textoMensagem = eventoNome
      ? `Olá! Convidei você para se apresentar no evento "${eventoNome}". Confira o convite interativo abaixo:`
      : "Olá! Você foi convidado para se apresentar em um evento. Confira o convite abaixo:";

    const { error: errMensagem } = await supabase.from("mensagem").insert({
      conversa_id: conversaId,
      remetente_id: organizadorId,
      conteudo: textoMensagem,
      evento_convite_id: conviteId,
    });

    if (errMensagem) {
      return { sucesso: false, erro: errMensagem.message };
    }

    return { sucesso: true, conviteId, conversaId };
  } catch (e: any) {
    console.error("Erro ao enviarConviteParaMusico:", e);
    return { sucesso: false, erro: e?.message ?? "Falha inesperada ao enviar convite." };
  }
}
