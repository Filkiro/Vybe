import { useState } from "react";
import { View, Text, Modal, Pressable, ScrollView, TouchableOpacity } from "react-native";
import { Check } from "lucide-react-native";

export const GENEROS = [
  "Rock", "Pop", "Sertanejo", "MPB", "Trap/Rap", "Eletrônica", "Funk", 
  "Gospel", "Samba", "Pagode", "Forró", "Axé", "Reggae", "Blues", 
  "Jazz", "K-Pop", "Clássica", "Outros"
];

export default function GenrePickerModal({
  visible,
  valor,
  onFechar,
  onSelecionar,
}: {
  visible: boolean;
  valor: string;
  onFechar: () => void;
  onSelecionar: (genero: string) => void;
}) {
  const [selecionado, setSelecionado] = useState(valor || "");

  if (!visible) return null;

  function confirmar() {
    onSelecionar(selecionado);
    onFechar();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFechar}>
      <Pressable className="flex-1 bg-black/60 items-center justify-center px-6" onPress={onFechar}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[320px] bg-[#121829] border border-white/10 rounded-3xl p-4">
          <Text className="text-white font-bold text-sm text-center mb-3">Selecionar gênero musical</Text>

          <View className="mb-4">
            <ScrollView style={{ maxHeight: 280 }} className="bg-white/5 rounded-2xl p-2" showsVerticalScrollIndicator={false}>
              {GENEROS.map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setSelecionado(g)}
                  className={`flex-row items-center justify-between px-4 py-3 rounded-xl mb-1 ${selecionado === g ? "bg-[#3B82F6]" : "hover:bg-white/5"}`}
                >
                  <Text className={`font-bold text-sm ${selecionado === g ? "text-white" : "text-[#94A3B8]"}`}>{g}</Text>
                  {selecionado === g && <Check size={16} color="white" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View className="flex-row gap-3">
            <Pressable onPress={onFechar} className="flex-1 py-3 items-center rounded-2xl bg-white/5 border border-white/10">
              <Text className="text-[#94A3B8] text-xs font-bold">Cancelar</Text>
            </Pressable>
            <Pressable onPress={confirmar} className="flex-1 py-3 items-center rounded-2xl bg-[#3B82F6]">
              <Text className="text-white text-xs font-bold">Confirmar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}