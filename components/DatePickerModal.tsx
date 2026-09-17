import { useState } from "react";
import { View, Text, Modal, Pressable, TouchableOpacity, FlatList } from "react-native";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react-native";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

// Gera uma lista de anos (ex: 100 anos no passado até 50 anos no futuro)
const ANO_ATUAL = new Date().getFullYear();
const ANOS = Array.from({ length: 151 }, (_, i) => ANO_ATUAL - 100 + i);

export function formatarDataBR(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function parseDataBR(value: string): Date | null {
  const partes = (value ?? "").split("/");
  if (partes.length !== 3) return null;
  const [dd, mm, yyyy] = partes.map(Number);
  if (!dd || !mm || !yyyy || yyyy < 1000) return null;
  const d = new Date(yyyy, mm - 1, dd);
  return isNaN(d.getTime()) ? null : d;
}

export default function DatePickerModal({
  visible,
  valor,
  onFechar,
  onSelecionar,
  dataMinima,
}: {
  visible: boolean;
  valor: string; // "DD/MM/AAAA" ou ""
  onFechar: () => void;
  onSelecionar: (dataBR: string) => void;
  dataMinima?: Date;
}) {
  const dataBase = parseDataBR(valor) ?? new Date();
  
  // Estados de navegação
  const [mesExibido, setMesExibido] = useState(
    new Date(dataBase.getFullYear(), dataBase.getMonth(), 1)
  );
  const [modo, setModo] = useState<"calendario" | "ano" | "mes">("calendario");
  const [anoTemporario, setAnoTemporario] = useState(dataBase.getFullYear());

  if (!visible) return null;

  const ano = mesExibido.getFullYear();
  const mes = mesExibido.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);

  // Garante as 6 semanas fixas (42 células) para o calendário não pular de altura
  while (celulas.length < 42) celulas.push(null);

  const selecionado = parseDataBR(valor);
  const limite = dataMinima ? new Date(dataMinima.getFullYear(), dataMinima.getMonth(), dataMinima.getDate()) : null;

  // Funções do calendário
  function irParaMesAnterior() {
    setMesExibido(new Date(ano, mes - 1, 1));
  }
  function irParaProximoMes() {
    setMesExibido(new Date(ano, mes + 1, 1));
  }
  function selecionarDia(dia: number) {
    onSelecionar(formatarDataBR(new Date(ano, mes, dia)));
    onFecharPadrao();
  }

  // Funções do fluxo de seleção de Ano/Mês
  function abrirSeletorDeAno() {
    setAnoTemporario(ano);
    setModo("ano");
  }
  function selecionarAno(a: number) {
    setAnoTemporario(a);
    setModo("mes");
  }
  function selecionarMes(m: number) {
    setMesExibido(new Date(anoTemporario, m, 1));
    setModo("calendario");
  }

  // Reseta o modo ao fechar
  function onFecharPadrao() {
    setModo("calendario");
    onFechar();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFecharPadrao}>
      <Pressable className="flex-1 bg-black/60 items-center justify-center px-6" onPress={onFecharPadrao}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[360px] bg-[#121829] border border-border/60 rounded-3xl p-4">
          
          {/* ===================================== */}
          {/* MODO 1: CALENDÁRIO TRADICIONAL        */}
          {/* ===================================== */}
          {modo === "calendario" && (
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <TouchableOpacity onPress={irParaMesAnterior} className="p-2" hitSlop={8}>
                  <ChevronLeft color="#fff" size={20} />
                </TouchableOpacity>

                {/* Botão para abrir o seletor de Ano/Mês */}
                <TouchableOpacity 
                  onPress={abrirSeletorDeAno} 
                  className="flex-row items-center bg-white/5 px-3 py-1.5 rounded-lg active:bg-white/10"
                >
                  <Text className="text-white font-bold text-sm mr-1.5">
                    {MESES[mes]} {ano}
                  </Text>
                  <ChevronDown color="#fff" size={14} />
                </TouchableOpacity>

                <TouchableOpacity onPress={irParaProximoMes} className="p-2" hitSlop={8}>
                  <ChevronRight color="#fff" size={20} />
                </TouchableOpacity>
              </View>

              <View className="flex-row mb-1">
                {DIAS_SEMANA.map((d, i) => (
                  <View key={i} style={{ width: `${100 / 7}%` }} className="items-center py-1">
                    <Text className="text-muted text-[10px] font-bold">{d}</Text>
                  </View>
                ))}
              </View>

              <View className="flex-row flex-wrap">
                {celulas.map((dia, idx) => {
                  if (dia === null) {
                    return <View key={idx} style={{ width: `${100 / 7}%` }} className="aspect-square" />;
                  }
                  const dataCelula = new Date(ano, mes, dia);
                  const ehSelecionado = !!selecionado && selecionado.toDateString() === dataCelula.toDateString();
                  const desabilitado = !!limite && dataCelula < limite;
                  return (
                    <View key={idx} style={{ width: `${100 / 7}%` }} className="aspect-square items-center justify-center p-0.5">
                      <TouchableOpacity
                        disabled={desabilitado}
                        onPress={() => selecionarDia(dia)}
                        className={`w-full h-full rounded-xl items-center justify-center ${ehSelecionado ? "bg-primary" : ""}`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            desabilitado ? "text-muted/30" : ehSelecionado ? "text-white" : "text-white/80"
                          }`}
                        >
                          {dia}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ===================================== */}
          {/* MODO 2: SELEÇÃO DE ANO VIA SCROLL     */}
          {/* ===================================== */}
          {modo === "ano" && (
            <View className="w-full h-[320px]">
              <Text className="text-white font-black text-center text-lg mb-4">Escolha o Ano</Text>
              <FlatList
                data={ANOS}
                keyExtractor={(i) => i.toString()}
                showsVerticalScrollIndicator={false}
                // Rola automaticamente para o ano atual selecionado ao abrir
                initialScrollIndex={Math.max(0, ANOS.indexOf(anoTemporario))}
                // (h-11 = 44px) + (mb-1 = 4px) = 48px de altura total por item
                getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
                renderItem={({ item }) => {
                  const isSelected = item === anoTemporario;
                  return (
                    <TouchableOpacity
                      onPress={() => selecionarAno(item)}
                      className={`h-11 justify-center items-center rounded-xl mb-1 ${isSelected ? 'bg-primary' : 'bg-transparent'}`}
                    >
                      <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-white/70'}`}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}

          {/* ===================================== */}
          {/* MODO 3: SELEÇÃO DE MÊS NO GRID        */}
          {/* ===================================== */}
          {modo === "mes" && (
            <View className="w-full h-[320px]">
              <View className="flex-row items-center justify-between mb-6">
                <TouchableOpacity onPress={() => setModo("ano")} className="p-2 bg-white/5 rounded-full active:bg-white/10">
                  <ChevronLeft color="#fff" size={20} />
                </TouchableOpacity>
                <Text className="text-white font-bold text-lg">{anoTemporario}</Text>
                <View className="w-10" /> {/* Espaçador invisível para centralizar o texto */}
              </View>
              
              <View className="flex-row flex-wrap justify-between">
                {MESES.map((nomeMes, indexMes) => {
                  const isSelected = indexMes === mes && anoTemporario === ano;
                  return (
                    <TouchableOpacity
                      key={nomeMes}
                      onPress={() => selecionarMes(indexMes)}
                      className={`w-[31%] h-12 mb-3 items-center justify-center rounded-xl border ${
                        isSelected ? 'bg-primary border-primary' : 'bg-white/5 border-white/10 active:bg-white/10'
                      }`}
                    >
                      <Text className={`font-semibold text-xs ${isSelected ? 'text-white' : 'text-white/80'}`}>
                        {nomeMes.substring(0, 3).toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ===================================== */}
          {/* BOTÃO DE RODAPÉ (CANCELAR / VOLTAR)   */}
          {/* ===================================== */}
          <Pressable 
            onPress={() => {
              if (modo === "calendario") onFecharPadrao();
              else setModo("calendario");
            }} 
            className="mt-3 py-3 items-center rounded-2xl bg-white/5 active:bg-white/10"
          >
            <Text className="text-muted text-xs font-bold uppercase tracking-wider">
              {modo === "calendario" ? "Cancelar" : "Voltar para o Calendário"}
            </Text>
          </Pressable>
          
        </Pressable>
      </Pressable>
    </Modal>
  );
}