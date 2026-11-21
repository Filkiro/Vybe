import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

export function useCurtidaMusica(musicaId: string | undefined | null) {
  const usuario = useAuthStore((s) => s.usuario);
  const [curtido, setCurtido] = useState(false);
  const [totalCurtidas, setTotalCurtidas] = useState(0);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!musicaId) {
      setCurtido(false);
      setTotalCurtidas(0);
      return;
    }

    async function verificar() {
      // Busca o total
      const { count } = await supabase
        .from("curtida_musica")
        .select("*", { count: "exact", head: true })
        .eq("musica_id", musicaId);
      
      setTotalCurtidas(count || 0);

      if (usuario) {
        const { data } = await supabase
          .from("curtida_musica")
          .select("id")
          .eq("musica_id", musicaId)
          .eq("usuario_id", usuario.id)
          .maybeSingle();
        
        setCurtido(!!data);
      }
    }
    verificar();
  }, [musicaId, usuario?.id]);

  async function alternarCurtida() {
    if (!usuario || !musicaId || carregando) return;
    
    setCarregando(true);
    const estadoAnterior = curtido;
    setCurtido(!estadoAnterior); // Optimistic UI
    setTotalCurtidas(prev => estadoAnterior ? prev - 1 : prev + 1);

    if (!estadoAnterior) {
      const { error } = await supabase
        .from("curtida_musica")
        .insert({ musica_id: musicaId, usuario_id: usuario.id });
      
      if (error) {
        setCurtido(false); // Rollback on error
        setTotalCurtidas(prev => prev - 1);
      }
    } else {
      const { error } = await supabase
        .from("curtida_musica")
        .delete()
        .eq("musica_id", musicaId)
        .eq("usuario_id", usuario.id);
      
      if (error) {
        setCurtido(true); // Rollback on error
        setTotalCurtidas(prev => prev + 1);
      }
    }
    setCarregando(false);
  }

  return { curtido, totalCurtidas, alternarCurtida };
}

