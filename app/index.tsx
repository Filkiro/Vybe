import { Redirect } from "expo-router";

// Antes, "/(auth)/index.tsx" acabava sendo dono da rota raiz "/"
// (arquivos chamados "index" mapeiam pra rota do grupo em que
// estão), então o app abria direto na tela de cadastro/login antes
// de qualquer redirect nosso rodar. Agora que a tela de auth foi
// renomeada pra "/(auth)/entrar", esse arquivo é quem
// legitimamente dono da raiz — e ela sempre aponta pra Home, que é
// pública.
export default function Index() {
  return <Redirect href="/(tabs)/home" />;
}
