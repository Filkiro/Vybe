import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Check } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../../lib/supabase";
import { enviarArquivoParaStorage } from "../../lib/upload";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../constants/theme";
import { usePlayerAwarePadding } from "../../hooks/usePlayerAwarePadding";

export default function Criar() {
  const usuario = useAuthStore((s) => s.usuario);

  if (!usuario) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-muted">Carregando...</Text>
      </View>
    );
  }

  if (usuario.tipo_conta === "musico") return <CriarMusico usuarioId={usuario.id} />;
  if (usuario.tipo_conta === "organizador") return <CriarOrganizador usuarioId={usuario.id} />;

  return (
    <View className="flex-1 bg-background items-center justify-center px-8">
      <Text className="text-lg text-muted text-center">
        Contas de moderador/administrador não publicam conteúdo por aqui.
      </Text>
    </View>
  );
}

function CampoTexto(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="#9CA3AF"
      className="border border-border rounded-2xl px-4 py-3 mb-4 text-textDark"
      {...props}
    />
  );
}

// -----------------------------------------------------------
// Conta de músico: Música / Álbum / Publicação.
// -----------------------------------------------------------
function CriarMusico({ usuarioId }: { usuarioId: string }) {
  const [aba, setAba] = useState<"musica" | "album" | "publicacao">("musica");

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row gap-2 px-4 pt-6 pb-2">
        <SegmentoAba label="Música" ativa={aba === "musica"} onPress={() => setAba("musica")} />
        <SegmentoAba label="Álbum" ativa={aba === "album"} onPress={() => setAba("album")} />
        <SegmentoAba label="Publicação" ativa={aba === "publicacao"} onPress={() => setAba("publicacao")} />
      </View>

      {aba === "musica" && <FormMusica usuarioId={usuarioId} />}
      {aba === "album" && <FormAlbum usuarioId={usuarioId} />}
      {aba === "publicacao" && <FormPublicacaoMusico usuarioId={usuarioId} />}
    </View>
  );
}

// -----------------------------------------------------------
// Conta de organizador: Evento / Publicação.
// -----------------------------------------------------------
function CriarOrganizador({ usuarioId }: { usuarioId: string }) {
  const [aba, setAba] = useState<"evento" | "publicacao">("evento");

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row gap-2 px-4 pt-6 pb-2">
        <SegmentoAba label="Evento" ativa={aba === "evento"} onPress={() => setAba("evento")} />
        <SegmentoAba label="Publicação" ativa={aba === "publicacao"} onPress={() => setAba("publicacao")} />
      </View>

      {aba === "evento" ? <FormEvento usuarioId={usuarioId} /> : <FormPublicacaoOrganizador usuarioId={usuarioId} />}
    </View>
  );
}

function SegmentoAba({ label, ativa, onPress }: { label: string; ativa: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`flex-1 py-2.5 rounded-full items-center ${ativa ? "bg-primary" : "bg-surface"}`}>
      <Text className={`font-medium ${ativa ? "text-white" : "text-muted"}`}>{label}</Text>
    </Pressable>
  );
}

function FormMusica({ usuarioId }: { usuarioId: string }) {
  const paddingBottom = usePlayerAwarePadding(140);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [genero, setGenero] = useState("");
  const [dataLancamento, setDataLancamento] = useState("");
  const [capaUri, setCapaUri] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<{ uri: string; nome: string; tipo: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function escolherCapa() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro("Precisa de permissão para acessar suas fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!resultado.canceled) setCapaUri(resultado.assets[0].uri);
  }

  async function escolherArquivo() {
    const resultado = await DocumentPicker.getDocumentAsync({ type: "audio/*" });
    if (resultado.canceled) return;
    const asset = resultado.assets[0];
    setArquivo({ uri: asset.uri, nome: asset.name, tipo: asset.mimeType ?? "audio/mpeg" });
  }

  async function publicar() {
    setErro(null);
    setSucesso(false);
    if (!nome || !arquivo) {
      setErro("Preencha o nome e escolha o arquivo de áudio.");
      return;
    }

    setEnviando(true);
    try {
      let capaUrl: string | null = null;
      if (capaUri) {
        capaUrl = await enviarArquivoParaStorage({
          bucket: "capa_musica",
          uri: capaUri,
          nomeArquivo: `${usuarioId}-capa.jpg`,
          contentType: "image/jpeg",
        });
      }

      const arquivoUrl = await enviarArquivoParaStorage({
        bucket: "musica_audio",
        uri: arquivo.uri,
        nomeArquivo: `${usuarioId}-${arquivo.nome}`,
        contentType: arquivo.tipo,
      });

      const { error } = await supabase.from("musica").insert({
        usuario_id: usuarioId,
        nome,
        descricao: descricao || null,
        genero: genero || null,
        data_lancamento: dataLancamento || null,
        capa_url: capaUrl,
        arquivo_url: arquivoUrl,
      });
      if (error) throw error;

      setSucesso(true);
      setNome("");
      setDescricao("");
      setGenero("");
      setDataLancamento("");
      setCapaUri(null);
      setArquivo(null);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao publicar música.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom }} showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-textDark mb-6">Nova música</Text>

      <Pressable
        onPress={escolherCapa}
        className="self-center w-36 h-36 rounded-2xl bg-surface items-center justify-center mb-4 overflow-hidden"
      >
        {capaUri ? (
          <Image source={{ uri: capaUri }} className="w-full h-full" />
        ) : (
          <Text className="text-muted text-center px-3 text-sm">Toque para escolher a capa</Text>
        )}
      </Pressable>

      <CampoTexto placeholder="Nome da música" value={nome} onChangeText={setNome} />
      <CampoTexto placeholder="Descrição" value={descricao} onChangeText={setDescricao} multiline />
      <CampoTexto placeholder="Gênero" value={genero} onChangeText={setGenero} />
      <CampoTexto
        placeholder="Data de lançamento (AAAA-MM-DD)"
        value={dataLancamento}
        onChangeText={setDataLancamento}
      />

      <Pressable onPress={escolherArquivo} className="border border-border rounded-2xl py-4 items-center mb-4">
        <Text className="text-textDark font-medium">{arquivo ? arquivo.nome : "Escolher arquivo de áudio"}</Text>
      </Pressable>

      {erro && <Text className="text-red-500 mb-4 text-center">{erro}</Text>}
      {sucesso && <Text className="text-green-600 mb-4 text-center">Música publicada!</Text>}

      <Pressable onPress={publicar} disabled={enviando} className="bg-primary rounded-full py-4 items-center">
        {enviando ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Publicar</Text>}
      </Pressable>
    </ScrollView>
  );
}

// -----------------------------------------------------------
// Novo álbum — pode ser criado sem nenhuma música (só nome +
// capa), mas já na criação dá pra marcar músicas existentes do
// próprio músico pra entrar no álbum. Mais músicas podem ser
// adicionadas depois, direto na tela do álbum (app/album/[id]).
// -----------------------------------------------------------
function FormAlbum({ usuarioId }: { usuarioId: string }) {
  const paddingBottom = usePlayerAwarePadding(140);
  const [nome, setNome] = useState("");
  const [capaUri, setCapaUri] = useState<string | null>(null);
  const [minhasMusicas, setMinhasMusicas] = useState<any[]>([]);
  const [carregandoMusicas, setCarregandoMusicas] = useState(true);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    supabase
      .from("musica")
      .select("id, nome, capa_url")
      .eq("usuario_id", usuarioId)
      .eq("status", "ativo")
      .order("data_lancamento", { ascending: false })
      .then(({ data }) => {
        setMinhasMusicas(data ?? []);
        setCarregandoMusicas(false);
      });
  }, [usuarioId]);

  async function escolherCapa() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro("Precisa de permissão para acessar suas fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!resultado.canceled) setCapaUri(resultado.assets[0].uri);
  }

  function alternarSelecao(id: string) {
    setSelecionadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });
  }

  async function criarAlbum() {
    setErro(null);
    setSucesso(false);
    if (!nome) {
      setErro("Dê um nome para o álbum.");
      return;
    }

    setEnviando(true);
    try {
      let capaUrl: string | null = null;
      if (capaUri) {
        capaUrl = await enviarArquivoParaStorage({
          bucket: "capa_album",
          uri: capaUri,
          nomeArquivo: `${usuarioId}-capa-album.jpg`,
          contentType: "image/jpeg",
        });
      }

      const { data: novoAlbum, error } = await supabase
        .from("album")
        .insert({ usuario_id: usuarioId, nome, capa_url: capaUrl })
        .select("id")
        .single();
      if (error || !novoAlbum) throw error ?? new Error("Erro ao criar álbum.");

      // O álbum pode ser criado sem nenhuma música — só insere na
      // tabela de junção se algo foi marcado.
      if (selecionadas.size > 0) {
        const { error: erroFaixas } = await supabase
          .from("album_musica")
          .insert(Array.from(selecionadas).map((musica_id) => ({ album_id: novoAlbum.id, musica_id })));
        if (erroFaixas) throw erroFaixas;
      }

      setSucesso(true);
      setNome("");
      setCapaUri(null);
      setSelecionadas(new Set());
      router.push(`/album/${novoAlbum.id}`);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao criar álbum.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom }} showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-textDark mb-6">Novo álbum</Text>

      <Pressable
        onPress={escolherCapa}
        className="self-center w-36 h-36 rounded-2xl bg-surface items-center justify-center mb-4 overflow-hidden"
      >
        {capaUri ? (
          <Image source={{ uri: capaUri }} className="w-full h-full" />
        ) : (
          <Text className="text-muted text-center px-3 text-sm">Toque para escolher a capa</Text>
        )}
      </Pressable>

      <CampoTexto placeholder="Nome do álbum" value={nome} onChangeText={setNome} />

      <Text className="text-textDark font-bold mb-2 mt-2">Adicionar músicas (opcional)</Text>
      <Text className="text-muted text-xs mb-3">
        Você pode criar o álbum vazio e adicionar músicas depois, direto na tela do álbum.
      </Text>

      {carregandoMusicas ? (
        <Text className="text-muted text-center py-4">Carregando suas músicas...</Text>
      ) : minhasMusicas.length === 0 ? (
        <Text className="text-muted text-center py-4">
          Você ainda não publicou nenhuma música. Publique em "Música" pra poder adicioná-la a um álbum.
        </Text>
      ) : (
        <View className="bg-card border border-border rounded-2xl px-3 mb-4">
          {minhasMusicas.map((item) => {
            const marcada = selecionadas.has(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => alternarSelecao(item.id)}
                className="flex-row items-center py-3 border-b border-border"
              >
                {item.capa_url ? (
                  <Image source={{ uri: item.capa_url }} style={{ width: 40, height: 40 }} className="rounded-lg mr-3" />
                ) : (
                  <View style={{ width: 40, height: 40 }} className="rounded-lg bg-surface mr-3" />
                )}
                <Text numberOfLines={1} className="text-textDark flex-1">
                  {item.nome}
                </Text>
                <View
                  className="items-center justify-center rounded-md"
                  style={{
                    width: 22,
                    height: 22,
                    borderWidth: marcada ? 0 : 1,
                    borderColor: colors.border,
                    backgroundColor: marcada ? colors.primary : "transparent",
                  }}
                >
                  {marcada && <Check color="#fff" size={14} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {erro && <Text className="text-red-500 mb-4 text-center">{erro}</Text>}
      {sucesso && <Text className="text-green-600 mb-4 text-center">Álbum criado!</Text>}

      <Pressable onPress={criarAlbum} disabled={enviando} className="bg-primary rounded-full py-4 items-center">
        {enviando ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Criar álbum</Text>}
      </Pressable>
    </ScrollView>
  );
}

function FormEvento({ usuarioId }: { usuarioId: string }) {
  const paddingBottom = usePlayerAwarePadding(140);
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [generoMusical, setGeneroMusical] = useState("");
  const [capacidade, setCapacidade] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function publicar() {
    setErro(null);
    setSucesso(false);
    if (!nome || !data) {
      setErro("Preencha ao menos o nome e a data do evento.");
      return;
    }
    setEnviando(true);
    const { error } = await supabase.from("evento").insert({
      organizador_id: usuarioId,
      nome,
      data,
      horario: horario || null,
      localizacao: localizacao || null,
      genero_musical: generoMusical || null,
      capacidade: capacidade ? Number(capacidade) : null,
    });
    setEnviando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setSucesso(true);
    setNome("");
    setData("");
    setHorario("");
    setLocalizacao("");
    setGeneroMusical("");
    setCapacidade("");
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom }}>
      <Text className="text-2xl font-bold text-textDark mb-6">Novo evento</Text>

      <CampoTexto placeholder="Nome do evento" value={nome} onChangeText={setNome} />
      <CampoTexto placeholder="Data (AAAA-MM-DD)" value={data} onChangeText={setData} />
      <CampoTexto placeholder="Horário (HH:MM)" value={horario} onChangeText={setHorario} />
      <CampoTexto placeholder="Localização" value={localizacao} onChangeText={setLocalizacao} />
      <CampoTexto placeholder="Gênero musical" value={generoMusical} onChangeText={setGeneroMusical} />
      <CampoTexto
        placeholder="Capacidade"
        value={capacidade}
        onChangeText={setCapacidade}
        keyboardType="numeric"
      />

      {erro && <Text className="text-red-500 mb-4 text-center">{erro}</Text>}
      {sucesso && (
        <Text className="text-green-600 mb-4 text-center">
          Evento criado! Vá na aba "Publicação" para divulgá-lo no Explorar.
        </Text>
      )}

      <Pressable onPress={publicar} disabled={enviando} className="bg-primary rounded-full py-4 items-center">
        {enviando ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Criar evento</Text>}
      </Pressable>
    </ScrollView>
  );
}

// -----------------------------------------------------------
// Publicação do músico: divulga um álbum e/ou música já
// publicados. A tabela "publicacao" só guarda foto + descrição
// (sem FK pra musica/album), então selecionar um item aqui é só
// um atalho que pré-preenche a foto e o texto — quem lê o post
// não navega pro álbum/música a partir dele, só vê a divulgação.
// -----------------------------------------------------------
function FormPublicacaoMusico({ usuarioId }: { usuarioId: string }) {
  const paddingBottom = usePlayerAwarePadding(140);
  const [minhasMusicas, setMinhasMusicas] = useState<any[]>([]);
  const [meusAlbuns, setMeusAlbuns] = useState<any[]>([]);
  const [itemEscolhido, setItemEscolhido] = useState<{ tipo: "musica" | "album"; id: string; nome: string; capa_url: string | null } | null>(null);
  const [descricao, setDescricao] = useState("");
  const [capaUri, setCapaUri] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    supabase.from("musica").select("id, nome, capa_url").eq("usuario_id", usuarioId).eq("status", "ativo").then(({ data }) => setMinhasMusicas(data ?? []));
    supabase.from("album").select("id, nome, capa_url").eq("usuario_id", usuarioId).eq("status", "ativo").then(({ data }) => setMeusAlbuns(data ?? []));
  }, [usuarioId]);

  function escolher(tipo: "musica" | "album", item: any) {
    setItemEscolhido({ tipo, id: item.id, nome: item.nome, capa_url: item.capa_url });
    setCapaUri(null);
    setDescricao((atual) => atual || `Confira ${tipo === "musica" ? "minha música" : "meu álbum"} "${item.nome}"!`);
  }

  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro("Precisa de permissão para acessar suas fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!resultado.canceled) setCapaUri(resultado.assets[0].uri);
  }

  async function publicar() {
    setErro(null);
    setSucesso(false);
    if (!descricao && !capaUri && !itemEscolhido?.capa_url) {
      setErro("Escreva uma descrição ou escolha uma foto.");
      return;
    }
    setEnviando(true);
    try {
      let fotoUrl: string | null = itemEscolhido?.capa_url ?? null;
      if (capaUri) {
        fotoUrl = await enviarArquivoParaStorage({
          bucket: "capa_musica",
          uri: capaUri,
          nomeArquivo: `${usuarioId}-post-${Date.now()}.jpg`,
          contentType: "image/jpeg",
        });
      }

      const { error } = await supabase.from("publicacao").insert({
        usuario_id: usuarioId,
        foto_url: fotoUrl,
        descricao: descricao || null,
      });
      if (error) throw error;

      setSucesso(true);
      setDescricao("");
      setCapaUri(null);
      setItemEscolhido(null);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao publicar.");
    } finally {
      setEnviando(false);
    }
  }

  const fotoPreview = capaUri ?? itemEscolhido?.capa_url ?? null;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom }} showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-textDark mb-6">Nova publicação</Text>

      <Pressable onPress={escolherFoto} className="self-center w-36 h-36 rounded-2xl bg-surface items-center justify-center mb-4 overflow-hidden">
        {fotoPreview ? (
          <Image source={{ uri: fotoPreview }} className="w-full h-full" />
        ) : (
          <Text className="text-muted text-center px-3 text-sm">Toque para escolher a foto</Text>
        )}
      </Pressable>

      <CampoTexto placeholder="Descrição da publicação" value={descricao} onChangeText={setDescricao} multiline />

      {(minhasMusicas.length > 0 || meusAlbuns.length > 0) && (
        <>
          <Text className="text-textDark font-bold mb-2">Divulgar (opcional)</Text>
          <Text className="text-muted text-xs mb-3">Escolher um item aqui só preenche a foto e o texto pra você.</Text>
          <View className="mb-4">
            {meusAlbuns.map((a) => (
              <ItemEscolha key={`album-${a.id}`} nome={a.nome} tag="Álbum" selecionado={itemEscolhido?.id === a.id} onPress={() => escolher("album", a)} />
            ))}
            {minhasMusicas.map((m) => (
              <ItemEscolha key={`musica-${m.id}`} nome={m.nome} tag="Música" selecionado={itemEscolhido?.id === m.id} onPress={() => escolher("musica", m)} />
            ))}
          </View>
        </>
      )}

      {erro && <Text className="text-red-500 mb-4 text-center">{erro}</Text>}
      {sucesso && <Text className="text-green-600 mb-4 text-center">Publicado no Explorar!</Text>}

      <Pressable onPress={publicar} disabled={enviando} className="bg-primary rounded-full py-4 items-center">
        {enviando ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Publicar</Text>}
      </Pressable>
    </ScrollView>
  );
}

// -----------------------------------------------------------
// Publicação do organizador: sempre vinculada a um evento dele
// (evento_id em publicacao), pra divulgar o evento no Explorar.
// -----------------------------------------------------------
function FormPublicacaoOrganizador({ usuarioId }: { usuarioId: string }) {
  const paddingBottom = usePlayerAwarePadding(140);
  const [meusEventos, setMeusEventos] = useState<any[]>([]);
  const [eventoId, setEventoId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    supabase
      .from("evento")
      .select("id, nome, data")
      .eq("organizador_id", usuarioId)
      .order("data", { ascending: true })
      .then(({ data }) => setMeusEventos(data ?? []));
  }, [usuarioId]);

  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro("Precisa de permissão para acessar suas fotos.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!resultado.canceled) setFotoUri(resultado.assets[0].uri);
  }

  async function publicar() {
    setErro(null);
    setSucesso(false);
    if (!eventoId) {
      setErro("Escolha o evento que você quer divulgar.");
      return;
    }
    setEnviando(true);
    try {
      let fotoUrl: string | null = null;
      if (fotoUri) {
        fotoUrl = await enviarArquivoParaStorage({
          bucket: "capa_musica",
          uri: fotoUri,
          nomeArquivo: `${usuarioId}-post-${Date.now()}.jpg`,
          contentType: "image/jpeg",
        });
      }

      const { error } = await supabase.from("publicacao").insert({
        usuario_id: usuarioId,
        evento_id: eventoId,
        foto_url: fotoUrl,
        descricao: descricao || null,
      });
      if (error) throw error;

      setSucesso(true);
      setDescricao("");
      setFotoUri(null);
      setEventoId(null);
    } catch (e: any) {
      setErro(e.message ?? "Erro ao publicar.");
    } finally {
      setEnviando(false);
    }
  }

  if (meusEventos.length === 0) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text className="text-muted text-center">
          Crie um evento na aba "Evento" primeiro — a publicação sempre divulga um evento seu.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom }} showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-textDark mb-6">Nova publicação</Text>

      <Text className="text-textDark font-bold mb-2">Evento a divulgar</Text>
      <View className="mb-4">
        {meusEventos.map((e) => (
          <ItemEscolha key={e.id} nome={`${e.nome} — ${e.data}`} tag="Evento" selecionado={eventoId === e.id} onPress={() => setEventoId(e.id)} />
        ))}
      </View>

      <Pressable onPress={escolherFoto} className="self-center w-36 h-36 rounded-2xl bg-surface items-center justify-center mb-4 overflow-hidden">
        {fotoUri ? (
          <Image source={{ uri: fotoUri }} className="w-full h-full" />
        ) : (
          <Text className="text-muted text-center px-3 text-sm">Toque para escolher a foto</Text>
        )}
      </Pressable>

      <CampoTexto placeholder="Descrição da publicação" value={descricao} onChangeText={setDescricao} multiline />

      {erro && <Text className="text-red-500 mb-4 text-center">{erro}</Text>}
      {sucesso && <Text className="text-green-600 mb-4 text-center">Publicado no Explorar!</Text>}

      <Pressable onPress={publicar} disabled={enviando} className="bg-primary rounded-full py-4 items-center">
        {enviando ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Publicar</Text>}
      </Pressable>
    </ScrollView>
  );
}

function ItemEscolha({ nome, tag, selecionado, onPress }: { nome: string; tag: string; selecionado: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-3 px-3 border-b border-border bg-card rounded-xl mb-2"
      style={selecionado ? { borderWidth: 1, borderColor: colors.primary } : undefined}
    >
      <View className="flex-1">
        <Text className="text-textDark" numberOfLines={1}>{nome}</Text>
        <Text className="text-muted text-xs">{tag}</Text>
      </View>
      <View
        className="items-center justify-center rounded-md"
        style={{
          width: 22,
          height: 22,
          borderWidth: selecionado ? 0 : 1,
          borderColor: colors.border,
          backgroundColor: selecionado ? colors.primary : "transparent",
        }}
      >
        {selecionado && <Check color="#fff" size={14} />}
      </View>
    </Pressable>
  );
}
