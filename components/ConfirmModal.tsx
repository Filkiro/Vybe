import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { AlertTriangle } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useConfirmStore } from "../store/confirmStore";
import { colors } from "../constants/theme";

// Popup de confirmação do próprio app (excluir música, excluir
// álbum, etc) — mesmo visual de Card de Vidro Fosco do
// AuthPromptModal, só que com dois botões de ação em vez de um
// convite pra cadastro. Fica montado uma vez no _layout.tsx, igual
// ao AuthPromptModal, e qualquer tela pode abrir ele chamando
// confirmar(titulo, mensagem) de lib/alertas.ts.
export function ConfirmModal() {
  const visivel = useConfirmStore((s) => s.visivel);
  const titulo = useConfirmStore((s) => s.titulo);
  const mensagem = useConfirmStore((s) => s.mensagem);
  const textoConfirmar = useConfirmStore((s) => s.textoConfirmar);
  const confirmar = useConfirmStore((s) => s.confirmar);
  const cancelar = useConfirmStore((s) => s.cancelar);

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={cancelar}>
      {/* Fundo escuro semitransparente que cancela ao clicar fora */}
      <Pressable onPress={cancelar} className="flex-1 bg-black/80 items-center justify-center px-6">
        {/* Container que impede o clique de vazar para o fundo */}
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full">
          {/* Card de Vidro Fosco */}
          <BlurView
            intensity={40}
            tint="dark"
            className="w-full rounded-[32px] p-8 items-center border border-white/10 overflow-hidden"
          >
            {/* Ícone de alerta */}
            <View className="w-14 h-14 rounded-full bg-red-500/10 items-center justify-center mb-4">
              <AlertTriangle color={colors.danger} size={26} />
            </View>

            <Text className="text-xl font-bold text-textDark text-center mb-2">{titulo}</Text>

            <Text className="text-muted text-center mb-8 px-2 leading-relaxed">{mensagem}</Text>

            {/* Ações */}
            <Pressable
              onPress={confirmar}
              className="bg-red-500 rounded-full py-4 items-center w-full mb-3"
              style={styles.buttonGlow}
            >
              <Text className="text-white font-bold text-base tracking-wide">{textoConfirmar}</Text>
            </Pressable>

            <Pressable
              onPress={cancelar}
              className="border border-white/20 bg-white/5 rounded-full py-4 items-center w-full"
            >
              <Text className="text-textDark font-medium text-base">Cancelar</Text>
            </Pressable>
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  buttonGlow: {
    shadowColor: "#F87171",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
});
