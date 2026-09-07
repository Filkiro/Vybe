import { supabase } from "./supabase";
import { excluirArquivoDoStorage } from "./upload";

// IMPORTANTE sobre RLS: um DELETE bloqueado pela Row Level Security
// do Supabase não vira erro — o Postgres simplesmente não acha
// nenhuma linha que o usuário tenha permissão de apagar e retorna
// sucesso com 0 linhas afetadas. Por isso, toda função aqui usa
// .select("id") no delete pra saber quantas linhas realmente
// sumiram, e lança um erro explicativo quando vier vazio, em vez de
// deixar a tela achar que excluiu e o registro voltar depois que a
// lista recarrega.
function erroSemPermissao(entidade: string): Error {
  return new Error(
    `Não foi possível excluir ${entidade}. Verifique se existe uma policy de DELETE liberada para o dono no Supabase.`
  );
}

// Apaga uma música de verdade: remove o áudio e a capa do Storage,
// tira a música de qualquer álbum em que ela esteja (tabela de
// junção album_musica) e só então apaga a linha da tabela musica.
// Nessa ordem pra nunca deixar um arquivo órfão no bucket nem uma
// referência quebrada em album_musica (a FK de album_musica pra
// musica não tem ON DELETE CASCADE).
export async function excluirMusica(musica: { id: string; arquivo_url: string; capa_url: string | null }): Promise<void> {
  await excluirArquivoDoStorage({ bucket: "musica_audio", url: musica.arquivo_url });
  await excluirArquivoDoStorage({ bucket: "capa_musica", url: musica.capa_url });

  await supabase.from("album_musica").delete().eq("musica_id", musica.id);

  const { data, error } = await supabase.from("musica").delete().eq("id", musica.id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw erroSemPermissao("a música");
}

// Apaga um álbum de verdade: remove a capa do Storage, apaga os
// vínculos com as músicas (as músicas em si continuam existindo,
// só saem do álbum) e então apaga a linha da tabela album.
export async function excluirAlbum(album: { id: string; capa_url: string | null }): Promise<void> {
  await excluirArquivoDoStorage({ bucket: "capa_album", url: album.capa_url });

  await supabase.from("album_musica").delete().eq("album_id", album.id);

  const { data, error } = await supabase.from("album").delete().eq("id", album.id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw erroSemPermissao("o álbum");
}

// Apaga um evento de verdade. Evento não guarda arquivo no Storage,
// e publicacao.evento_id tem ON DELETE SET NULL — então publicações
// que divulgavam esse evento continuam existindo, só perdem o vínculo.
export async function excluirEvento(evento: { id: string }): Promise<void> {
  const { data, error } = await supabase.from("evento").delete().eq("id", evento.id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw erroSemPermissao("o evento");
}
