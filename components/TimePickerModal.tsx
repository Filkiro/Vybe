import { useState } from "react";
import { View, Text, Modal, Pressable, ScrollView, TouchableOpacity } from "react-native";

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function parseHorario(valor: string): { hora: string; minuto: string } {
  const [h, m] = (valor ?? "").split(":");
  return {
    hora: HORAS.includes(h) ? h : "00",
    minuto: MINUTOS.includes(m) ? m : "00",
  };
}

export default function TimePickerModal({
  visible,
  valor,
  onFechar,
  onSelecionar,
}: {
  visible: boolean;
  valor: string; // "HH:MM" ou ""
  onFechar: () => void;
  onSelecionar: (horario: string) => void;
}) {
  const inicial = parseHorario(valor);
  const [hora, setHora] = useState(inicial.hora);
  const [minuto, setMinuto] = useState(inicial.minuto);

  if (!visible) return null;

  function confirmar() {
    onSelecionar(`${hora}:${minuto}`);
    onFechar();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFechar}>
      <Pressable className="flex-1 bg-black/60 items-center justify-center px-6" onPress={onFechar}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[320px] bg-[#121829] border border-border/60 rounded-3xl p-4">
          <Text className="text-white font-bold text-sm text-center mb-3">Selecionar horário</Text>

          <View className="flex-row justify-center gap-2 mb-4">
            <ScrollView style={{ height: 180 }} className="w-16 bg-white/5 rounded-2xl" showsVerticalScrollIndicator={false}>
              {HORAS.map((h) => (
                <TouchableOpacity
                  key={h}
                  onPress={() => setHora(h)}
                  className={`py-2.5 items-center ${hora === h ? "bg-primary rounded-xl" : ""}`}
                >
                  <Text className={`font-bold text-sm ${hora === h ? "text-white" : "text-muted"}`}>{h}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text className="text-white font-black text-xl self-center">:</Text>

            <ScrollView style={{ height: 180 }} className="w-16 bg-white/5 rounded-2xl" showsVerticalScrollIndicator={false}>
              {MINUTOS.map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMinuto(m)}
                  className={`py-2.5 items-center ${minuto === m ? "bg-primary rounded-xl" : ""}`}
                >
                  <Text className={`font-bold text-sm ${minuto === m ? "text-white" : "text-muted"}`}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View className="flex-row gap-3">
            <Pressable onPress={onFechar} className="flex-1 py-3 items-center rounded-2xl bg-white/5">
              <Text className="text-muted text-xs font-bold">Cancelar</Text>
            </Pressable>
            <Pressable onPress={confirmar} className="flex-1 py-3 items-center rounded-2xl bg-primary">
              <Text className="text-white text-xs font-bold">Confirmar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
