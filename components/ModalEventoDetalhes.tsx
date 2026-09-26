import { View, Text, Pressable, Modal } from "react-native";
import { X, Calendar, MapPin } from "lucide-react-native";

export type EventoDetalhado = {
  id: string;
  nome: string;
  data: string;
  horario: string | null;
  localizacao: string | null;
  genero_musical: string | null;
  capacidade: number | null;
  organizador_nome?: string;
  status?: string;
  criado_em?: string;
};

export function ModalEventoDetalhes({
  eventoSelecionado,
  carregandoEvento,
  onFechar
}: {
  eventoSelecionado: EventoDetalhado | null;
  carregandoEvento?: boolean;
  onFechar: () => void;
}) {
  return (
    <Modal
      visible={!!eventoSelecionado || !!carregandoEvento}
      transparent
      animationType="fade"
      onRequestClose={onFechar}
    >
      <View style={{ flex: 1 }}>
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          className="bg-black/70 backdrop-blur-sm"
          onPress={onFechar}
        />

        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}
          pointerEvents="box-none"
        >
          <View className="w-full max-w-lg bg-[#181C24] rounded-3xl p-6 border border-white/10 shadow-2xl">
            {carregandoEvento ? (
              <Text className="text-gray-400 text-center">Carregando detalhes do evento...</Text>
            ) : eventoSelecionado ? (
              <>
                <View className="flex-row items-start justify-between mb-4">
                  <Text className="text-white text-xl font-bold flex-1 pr-4">{eventoSelecionado.nome}</Text>
                  <Pressable onPress={onFechar} className="p-2 bg-white/5 rounded-full active:bg-white/10 transition-colors">
                    <X color="#94A3B8" size={20} />
                  </Pressable>
                </View>

                <View className="gap-4">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-[#3B82F6]/20 items-center justify-center">
                      <Calendar color="#3B82F6" size={18} />
                    </View>
                    <View>
                      <Text className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Data e Horário</Text>
                      <Text className="text-white font-semibold">
                        {eventoSelecionado.data}{eventoSelecionado.horario ? ` às ${eventoSelecionado.horario}` : ""}
                      </Text>
                    </View>
                  </View>

                  {eventoSelecionado.localizacao && (
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-full bg-white/5 items-center justify-center">
                        <MapPin color="#94A3B8" size={18} />
                      </View>
                      <View>
                        <Text className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Local</Text>
                        <Text className="text-white font-semibold">{eventoSelecionado.localizacao}</Text>
                      </View>
                    </View>
                  )}

                  <View className="flex-row flex-wrap gap-2 mt-2">
                    {eventoSelecionado.genero_musical && (
                      <View className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <Text className="text-gray-300 text-xs">{eventoSelecionado.genero_musical}</Text>
                      </View>
                    )}
                    {eventoSelecionado.capacidade != null && (
                      <View className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <Text className="text-gray-300 text-xs">Capacidade: {eventoSelecionado.capacidade}</Text>
                      </View>
                    )}
                  </View>

                  {eventoSelecionado.organizador_nome && (
                    <View className="mt-4 pt-4 border-t border-white/10">
                      <Text className="text-gray-400 text-xs mb-1">Organização</Text>
                      <Text className="text-white font-semibold">{eventoSelecionado.organizador_nome}</Text>
                    </View>
                  )}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
