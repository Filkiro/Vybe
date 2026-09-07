import { useState } from "react";
import { View, Text, Pressable, Image, useWindowDimensions, ScrollView } from "react-native";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { usePlayerStore } from "../store/playerStore";
import {
  useCorDinamica,
  CapaCircular,
  BarraProgressoLinha,
  ControlesDesign,
  BotaoCurtir,
  PainelFila,
} from "../components/player/PlayerVisuals";

export default function TocandoAgora() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 768;
  const { musicaAtual } = usePlayerStore();
  const corDinamica = useCorDinamica();

  if (!musicaAtual) {
    return (
      <View className="flex-1 bg-[#0A0A0C] items-center justify-center px-8">
        <Text className="text-muted text-center mb-4">Nenhuma música tocando no momento.</Text>
        <Pressable onPress={() => router.back()} className="bg-primary rounded-full px-6 py-3">
          <Text className="text-textDark font-bold">Voltar</Text>
        </Pressable>
      </View>
    );
  }

  // No desktop, o player já vive permanentemente na sidebar da direita —
  // essa tela deixa de fazer sentido como destino de navegação lá, então
  // simplesmente volta pra tela anterior em vez de mostrar uma versão
  // redundante em tela cheia.
  if (ehDesktop) {
    router.back();
    return null;
  }

  return <LayoutMobile corDinamica={corDinamica} />;
}

function LayoutMobile({ corDinamica }: { corDinamica: ReturnType<typeof useCorDinamica> }) {
  const { musicaAtual } = usePlayerStore();
  const [mostrarFila, setMostrarFila] = useState(false);
  const [curtido, setCurtido] = useState(false);

  if (!musicaAtual) return null;

  return (
    <View className="flex-1 bg-[#0B0B0E] relative overflow-hidden">
      {musicaAtual.capaUrl && (
        <Image
          source={{ uri: musicaAtual.capaUrl }}
          className="absolute inset-0 w-full h-full opacity-40"
          blurRadius={50}
        />
      )}

      <View className="flex-1 bg-black/40 justify-between px-6 pt-12 pb-10 z-10">
        <View className="flex-row items-center justify-between z-10">
          <Pressable
            onPress={() => router.back()}
            className="w-11 h-11 rounded-full bg-white/10 items-center justify-center backdrop-blur-md"
          >
            <ArrowLeft color="#FFFFFF" size={20} />
          </Pressable>

          <Text className="text-white text-base font-semibold">Tocando Agora</Text>

          <BotaoCurtir curtido={curtido} onPress={() => setCurtido((v) => !v)} />
        </View>

        {mostrarFila ? (
          <View className="flex-1 my-6">
            <PainelFila aoFechar={() => setMostrarFila(false)} />
          </View>
        ) : (
          <ScrollView
            className="flex-1 my-4"
            contentContainerStyle={{ alignItems: "center", justifyContent: "center", flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <CapaCircular tamanho={260} corGlow={corDinamica} />

            <View className="items-center mt-8 px-4">
              <Text className="text-white text-2xl font-bold text-center tracking-wide" numberOfLines={1}>
                {musicaAtual.nome}
              </Text>
              <Text className="text-white/60 text-base mt-1 font-medium text-center" numberOfLines={1}>
                {musicaAtual.autorApelido ?? "Artista Desconhecido"}
              </Text>
            </View>
          </ScrollView>
        )}

        <View className="w-full">
          <BarraProgressoLinha corDinamica={corDinamica} />
          <ControlesDesign
            tamanhoBotaoPrincipal={64}
            corDinamica={corDinamica}
            aoAlternarFila={() => setMostrarFila((v) => !v)}
            filaAtiva={mostrarFila}
          />
        </View>
      </View>
    </View>
  );
}