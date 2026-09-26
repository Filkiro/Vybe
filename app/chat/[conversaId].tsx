import { useLocalSearchParams, useRouter } from "expo-router";
import { ChatPanel } from "../../components/ChatPanel";

export default function ChatScreen() {
  const params = useLocalSearchParams<{ conversaId: string; contatoNome?: string; contatoFotoUrl?: string; contatoId?: string }>();
  const router = useRouter();

  return (
    <ChatPanel
      {...params}
      onVoltar={() => {
        if (router.canGoBack()) router.back();
        else router.replace("/(tabs)/conversa");
      }}
    />
  );
}
