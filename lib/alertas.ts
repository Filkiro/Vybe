import { Alert, Platform } from "react-native";
import { useConfirmStore } from "../store/confirmStore";

// Alert.alert() da React Native NÃO tem efeito nenhum no
// react-native-web — não mostra popup, não lança erro, não loga
// nada no console. Em telas que só rodam no app nativo isso nunca
// aparece, mas esse projeto também roda no navegador (expo start
// --web), então qualquer Alert.alert() usado pra confirmar uma ação
// (como excluir) silenciosamente não fazia nada no web: o clique no
// botão "Excluir" chamava Alert.alert, ele não exibia nada, e o
// onPress do botão "Confirmar" dentro dele nunca disparava — por
// isso não sobrava nem erro, nem log, nem chamada ao Supabase.
//
// `confirmar()` agora abre o ConfirmModal do próprio app (mesmo
// popup em nativo e na web, com a nossa identidade visual) em vez
// de Alert.alert/window.confirm — igual ao AuthPromptModal que já
// aparece ao tentar tocar uma música sem estar logado. `avisar()`
// continua usando Alert/window.alert, que já funcionavam nos dois
// ambientes (é só o confirm que era quebrado no web).

export function confirmar(titulo: string, mensagem: string, textoConfirmar = "Confirmar"): Promise<boolean> {
  return useConfirmStore.getState().pedir(titulo, mensagem, textoConfirmar);
}

export function avisar(titulo: string, mensagem?: string): void {
  if (Platform.OS === "web") {
    window.alert(mensagem ? `${titulo}\n\n${mensagem}` : titulo);
    return;
  }
  Alert.alert(titulo, mensagem);
}
