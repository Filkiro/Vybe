import { View, Text, Image, StyleSheet, Pressable } from "react-native";

// Marca do app preparada para receber uma imagem local (PNG/JPG).
// Pode ser usada na navbar (com glow) e no login (sem glow, tamanho grande).
export function AppLogo({
  tamanho = "normal",
  comGlow = false,
  onPress,
}: {
  tamanho?: "normal" | "grande";
  corTexto?: string;
  comGlow?: boolean;
  mostrarTexto?: boolean;
  onPress?: () => void;
}) {
  // Ajusta o tamanho da imagem dependendo de onde o componente é chamado
  const imageSize = tamanho === "grande" ? 0 : 80;

  const content = (
    <View className="flex-row items-center">
      <View
        style={[
          { width: imageSize, height: imageSize },
          comGlow && styles.imageGlow, // Injeta a sombra azul se comGlow for true
        ]}
        className="mr-3 justify-center items-center"
      >
        <Image
          // ⚠️ ATENÇÃO: Ajuste o caminho abaixo para onde sua logo está salva!
          source={require('../assets/logo.png')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className="active:opacity-80 transition-opacity"
        style={{ cursor: "pointer" as any }}
        accessibilityRole="button"
        accessibilityLabel="Vybe Logo"
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

// ---------------------------------------------------------------
// Estilos Nativos (Sombras e Efeitos Neon)
// ---------------------------------------------------------------
const styles = StyleSheet.create({
  imageGlow: {
    shadowColor: '#3B82F6', // O tom de azul do nosso Neon
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  textoGlow: {
    textShadowColor: 'rgba(59, 130, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  }
});
