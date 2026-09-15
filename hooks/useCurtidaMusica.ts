import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

export function useCurtidaMusica(musicaId: string | undefined | null) {
  const usuario = useAuthStore((s) => s.usuario);
  const [curtido, setCurtido] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!usuario || !musicaId) {
      setCurtido(false);
      return;
    }

    async function verificar() {
      const { data } = await supabase
        .from("curtida_musica")
        .select("id")
        .eq("musica_id", musicaId)
        .eq("usuario_id", usuario!.id)
        .maybeSingle();
      
      setCurtido(!!data);
    }
    verificar();
  }, [musicaId, usuario?.id]);

  async function alternarCurtida() {
    if (!usuario || !musicaId || carregando) return;
    
    setCarregando(true);
    const estadoAnterior = curtido;
    setCurtido(!estadoAnterior); // Optimistic UI

    if (!estadoAnterior) {
      const { error } = await supabase
        .from("curtida_musica")
        .insert({ musica_id: musicaId, usuario_id: usuario.id });
      
      if (error) {
        setCurtido(false); // Rollback on error
      }
    } else {
      const { error } = await supabase
        .from("curtida_musica")
        .delete()
        .eq("musica_id", musicaId)
        .eq("usuario_id", usuario.id);
      
      if (error) {
        setCurtido(true); // Rollback on error
      }
    }
    setCarregando(false);
  }

  return { curtido, alternarCurtida };
}

