import { supabase } from "./supabase";

// Pega só a extensão do nome original (ex: "minha musica incrivel
// (versão final) 2024.mp3" -> "mp3"). Se não achar uma extensão
// válida, cai no fallback baseado no contentType.
function obterExtensao(nomeOriginal: string, contentType: string): string {
  const partes = nomeOriginal.split(".");
  if (partes.length > 1) {
    const ext = partes[partes.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "");
    if (ext.length > 0 && ext.length <= 5) return ext;
  }
  // Fallback pelo contentType quando o nome não tem extensão utilizável.
  const porTipo = contentType.split("/")[1]?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return porTipo && porTipo.length <= 5 ? porTipo : "bin";
}

// Gera uma chave curta e sempre segura pro Storage (sem espaços,
// acentos ou tamanho variável), independente de como o usuário
// nomeou o arquivo original no dispositivo dele. O nome de exibição
// que o usuário escolhe continua indo só pro campo "nome" da tabela
// — nunca pro caminho do arquivo no bucket.
function gerarChaveStorage(extensao: string): string {
  const aleatorio = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${aleatorio}.${extensao}`;
}

// Envia um arquivo local (uri do ImagePicker/DocumentPicker) pro
// Supabase Storage e devolve a URL pública. Funciona igual em
// web e native: o fetch(uri) + arrayBuffer() lê o arquivo local
// dos dois jeitos, sem precisar de código diferente por plataforma.
export async function enviarArquivoParaStorage(params: {
  bucket: string;
  uri: string;
  nomeArquivo: string;
  contentType: string;
}): Promise<string> {
  const { bucket, uri, nomeArquivo, contentType } = params;

  const resposta = await fetch(uri);
  const arrayBuffer = await resposta.arrayBuffer();

  // Nome curto gerado por nós — o nome original do arquivo do
  // usuário nunca vai pro bucket, só sua extensão é aproveitada.
  // Isso evita erro de nome grande demais (ou com caracteres
  // inválidos) ao salvar a URL na coluna do banco.
  const caminho = gerarChaveStorage(obterExtensao(nomeArquivo, contentType));

  const { error } = await supabase.storage.from(bucket).upload(caminho, arrayBuffer, {
    contentType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(caminho);
  return data.publicUrl;
}

// Remove um arquivo do Storage a partir da URL pública salva no
// banco (usada ao excluir/editar músicas, álbuns e fotos). Se a URL
// não pertencer a esse bucket, ou o arquivo já não existir, apenas
// ignora — exclusão de conteúdo nunca deve travar por causa disso.
export async function excluirArquivoDoStorage(params: { bucket: string; url: string | null | undefined }): Promise<void> {
  const { bucket, url } = params;
  if (!url) return;

  const marcador = `/object/public/${bucket}/`;
  const indice = url.indexOf(marcador);
  if (indice === -1) return;

  const caminho = decodeURIComponent(url.slice(indice + marcador.length));
  if (!caminho) return;

  await supabase.storage.from(bucket).remove([caminho]);
}
