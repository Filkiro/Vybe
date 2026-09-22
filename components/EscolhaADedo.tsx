import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { ChevronLeft, ChevronRight, Music, Play } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { usePlayerStore } from "../store/playerStore";
import { useRequireAuth } from "../store/authPromptStore";
import { useEhDesktop } from "../hooks/useEhDesktop";
import { useEscolhaADedoStore, MusicaEscolhida } from "../store/escolhaADedoStore";

// Quantas músicas entram no sorteio e quantas ficam visíveis
const TAMANHO_POOL = 60;
const TOTAL_EXIBIDAS = 12; // desktop: 3 colunas x 4 linhas | mobile: páginas de 3x3
const LINHAS_DESKTOP = 4;
const ITENS_POR_PAGINA_MOBILE = 9;

// Embaralhamento Fisher-Yates — é o que faz a seção mudar a cada recarga.
function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function dividirEmGrupos<T>(lista: T[], tamanho: number): T[][] {
  const grupos: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) {
    grupos.push(lista.slice(i, i + tamanho));
  }
  return grupos;
}

type Props = {
  /** Muda esse número (ex.: no pull-to-refresh) pra sortear outras músicas. */
  recarregarToken?: number;
};

export function EscolhaADedo({ recarregarToken = 0 }: Props) {
  const ehDesktop = useEhDesktop();
  const { width } = useWindowDimensions();
  const tocarMusica = usePlayerStore((s) => s.tocarMusica);
  const requireAuth = useRequireAuth();

  const musicas = useEscolhaADedoStore((s) => s.musicas);
  const tokenCarregado = useEscolhaADedoStore((s) => s.tokenCarregado);
  const definirMusicas = useEscolhaADedoStore((s) => s.definir);
  const [paginaMobile, setPaginaMobile] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);

  const carregar = useCallback(async (token: number) => {
    const { data } = await supabase
      .from("musica_com_autor")
      .select("id, nome, autor_apelido, arquivo_url, capa_url")
      .eq("status", "ativo")
      .limit(TAMANHO_POOL);

    const pool = (data ?? []).filter((m: any) => !!m.arquivo_url);
    definirMusicas(embaralhar(pool).slice(0, TOTAL_EXIBIDAS) as MusicaEscolhida[], token);
    setPaginaMobile(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [definirMusicas]);

  // Só sorteia de novo quando o token muda (pull-to-refresh) ou quando ainda
  // não há nada em cache. Abrir/voltar pra Home mantém a mesma seleção.
  useEffect(() => {
    if (tokenCarregado === recarregarToken && musicas.length > 0) return;
    carregar(recarregarToken);
  }, [carregar, recarregarToken, tokenCarregado, musicas.length]);

  function tocar(musica: MusicaEscolhida) {
    requireAuth(() => {
      const fila = musicas.map((m) => ({
        id: m.id,
        nome: m.nome,
        autorApelido: m.autor_apelido,
        arquivoUrl: m.arquivo_url,
        capaUrl: m.capa_url,
      }));
      tocarMusica(
        {
          id: musica.id,
          nome: musica.nome,
          autorApelido: musica.autor_apelido,
          arquivoUrl: musica.arquivo_url,
          capaUrl: musica.capa_url,
        },
        fila
      );
      if (!ehDesktop) router.push("/tocando");
    });
  }

  function tocarTudo() {
    if (musicas[0]) tocar(musicas[0]);
  }

  if (musicas.length === 0) return null;

  // ---------- Cabeçalho comum ----------
  const larguraConteudo = Math.min(width, 1200) - 40;

  const cabecalho = (
    <View className="flex-row items-center justify-between mb-4">
      <Text className="text-xl font-bold text-textDark">Escolha a dedo</Text>

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={tocarTudo}
          hitSlop={8}
          className="flex-row items-center gap-1.5 px-4 py-2 rounded-full border border-white/20 bg-white/5 active:opacity-70"
        >
          <Play color="#FFFFFF" size={14} fill="#FFFFFF" />
          <Text className="text-white text-xs font-bold">Tocar tudo</Text>
        </Pressable>

        {ehDesktop && (
          <>
            <Pressable
              onPress={() => {
                offsetRef.current = Math.max(0, offsetRef.current - larguraConteudo);
                scrollRef.current?.scrollTo({ x: offsetRef.current, animated: true });
              }}
              hitSlop={8}
              className="w-9 h-9 rounded-full border border-white/20 bg-white/5 items-center justify-center active:opacity-70"
            >
              <ChevronLeft color="#FFFFFF" size={18} />
            </Pressable>
            <Pressable
              onPress={() => {
                offsetRef.current = offsetRef.current + larguraConteudo;
                scrollRef.current?.scrollTo({ x: offsetRef.current, animated: true });
              }}
              hitSlop={8}
              className="w-9 h-9 rounded-full border border-white/20 bg-white/5 items-center justify-center active:opacity-70"
            >
              <ChevronRight color="#FFFFFF" size={18} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );

  // ---------- DESKTOP: colunas de 4 linhas, rolando pro lado ----------
  if (ehDesktop) {
    const colunas = dividirEmGrupos(musicas, LINHAS_DESKTOP);
    const larguraColuna = Math.max(280, larguraConteudo / 3 - 16);

    return (
      <View className="mt-8 px-5 w-full max-w-[1200px] self-center">
        {cabecalho}

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            offsetRef.current = e.nativeEvent.contentOffset.x;
          }}
          scrollEventThrottle={64}
          contentContainerStyle={{ gap: 16 }}
        >
          {colunas.map((coluna, i) => (
            <View key={`coluna-${i}`} style={{ width: larguraColuna, gap: 6 }}>
              {coluna.map((musica) => (
                <Pressable
                  key={musica.id}
                  onPress={() => tocar(musica)}
                  className="flex-row items-center p-2 rounded-xl active:bg-white/10 hover:bg-white/5"
                >
                  <Capa uri={musica.capa_url} tamanho={75} />
                  <View className="flex-1 ml-3">
                    <Text numberOfLines={1} className="text-white font-semibold text-md">
                      {musica.nome}
                    </Text>
                    <Text numberOfLines={1} className="text-gray-400 text-xs mt-0.5">
                      {musica.autor_apelido ?? "Artista desconhecido"}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ---------- MOBILE: grade 3x3 por página, deslizando pro lado ----------
  const paginas = dividirEmGrupos(musicas, ITENS_POR_PAGINA_MOBILE);
  const larguraPagina = width - 40;
  const gap = 8;
  const ladoCard = (larguraPagina - gap * 2) / 3;

  return (
    <View className="mt-8 px-5 w-full self-center">
      {cabecalho}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) =>
          setPaginaMobile(Math.round(e.nativeEvent.contentOffset.x / larguraPagina))
        }
      >
        {paginas.map((pagina, i) => (
          <View
            key={`pagina-${i}`}
            style={{
              width: larguraPagina,
              flexDirection: "row",
              flexWrap: "wrap",
              gap,
            }}
          >
            {pagina.map((musica) => (
              <Pressable
                key={musica.id}
                onPress={() => tocar(musica)}
                style={{ width: ladoCard }}
                className="active:opacity-80 mt-2"
              >
                <Capa uri={musica.capa_url} tamanho={ladoCard} quadrado />
                <Text
                  numberOfLines={1}
                  className="text-white text-sm font-semibold mt-1.5"
                >
                  {musica.nome}
                </Text>
                <Text numberOfLines={1} className="text-gray-400 text-xs">
                  {musica.autor_apelido ?? "Artista"}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>

      {paginas.length > 1 && (
        <View className="flex-row justify-center gap-1.5 mt-3">
          {paginas.map((_, i) => (
            <View
              key={`ponto-${i}`}
              className={`h-1.5 rounded-full ${
                i === paginaMobile ? "w-4 bg-white" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function Capa({
  uri,
  tamanho,
  quadrado,
}: {
  uri: string | null;
  tamanho: number;
  quadrado?: boolean;
}) {
  const estilo = { width: tamanho, height: tamanho, borderRadius: quadrado ? 10 : 8 };

  if (uri) return <Image source={{ uri }} style={estilo} />;

  return (
    <View
      style={estilo}
      className="bg-white/10 border border-white/10 items-center justify-center"
    >
      <Music color="#3B82F6" size={tamanho > 60 ? 22 : 16} />
    </View>
  );
}
