// lib/jundiaiDemoData.ts
// Dados demonstrativos realistas e culturalmente autênticos da cena de música autoral
// independente da região de Jundiaí-SP (Espaço Expressa, Parque da Cidade, Bar do Haules,
// Teatro Polytheama, Vila Arens, Centro Histórico).

export type DemoMusica = {
  id: string;
  nome: string;
  autor_apelido: string;
  arquivo_url: string;
  capa_url: string;
  genero?: string;
  ehDemo?: boolean;
};

export type DemoAlbum = {
  id: string;
  nome: string;
  capa_url: string;
  autor_apelido: string;
  ano?: number;
  ehDemo?: boolean;
};

export type DemoEvento = {
  id: string;
  titulo: string;
  local: string;
  data: string; // formato DD/MM/AAAA ou YYYY-MM-DD
  imagem_url: string;
  descricao: string;
  horario?: string;
  genero_musical?: string;
  capacidade?: number;
  organizador_nome?: string;
  ehDemo?: boolean;
};

export type DemoArtista = {
  id: string;
  apelido: string;
  generos: string;
  local: string;
  imagem_url: string;
  total_curtidas: number;
  descricao?: string;
  ehDemo?: boolean;
};

export type DemoPublicacao = {
  id: string;
  usuario_id: string;
  foto_url: string | null;
  descricao: string;
  criado_em: string;
  usuario: {
    nome: string;
    tipo_conta: "musico" | "organizador";
  };
  apelido: string;
  foto: string;
  curtidas: number;
  curtido: boolean;
  ehDemo?: boolean;
};

// Gera datas futuras dinamicamente para os eventos nunca ficarem desatualizados
function gerarDataFutura(diasNoFuturo: number): string {
  const d = new Date();
  d.setDate(d.getDate() + diasNoFuturo);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

export const DEMO_EVENTOS_JUNDIAI: DemoEvento[] = [
  {
    id: "demo-evt-1",
    titulo: "Circuito Autoral no Espaço Expressa",
    local: "Espaço Expressa (Antiga FEPASA) - Jundiaí, SP",
    data: gerarDataFutura(4),
    horario: "18:00",
    genero_musical: "Indie Rock & MPB Alternativa",
    capacidade: 350,
    organizador_nome: "Coletivo Som da FEPASA",
    imagem_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
    descricao: "Encontro com 4 bandas autorais independentes de Jundiaí e região nos galpões históricos do Espaço Expressa. Entrada franca com praça de food trucks locais.",
    ehDemo: true,
  },
  {
    id: "demo-evt-2",
    titulo: "Festival Som das Colinas",
    local: "Parque da Cidade (Palco das Águas) - Jundiaí, SP",
    data: gerarDataFutura(11),
    horario: "15:00",
    genero_musical: "Folk, MPB & Instrumental",
    capacidade: 600,
    organizador_nome: "Secretaria de Cultura & Cena Local",
    imagem_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80",
    descricao: "Tardezinha acústica às margens da represa do Parque da Cidade com artistas autorais da Serra do Japi.",
    ehDemo: true,
  },
  {
    id: "demo-evt-3",
    titulo: "Noite Autoral no Bar do Haules",
    local: "Bar do Haules (Centro Histórico) - Jundiaí, SP",
    data: gerarDataFutura(18),
    horario: "20:30",
    genero_musical: "Blues Rock & Post-Punk",
    capacidade: 120,
    organizador_nome: "Haules Produções Culturais",
    imagem_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
    descricao: "Palco intimista no coração do Centro de Jundiaí, reunindo novos compositores e clássicos do rock da região.",
    ehDemo: true,
  },
  {
    id: "demo-evt-4",
    titulo: "Sessão Instrumental no Polytheama",
    local: "Teatro Polytheama - Centro, Jundiaí, SP",
    data: gerarDataFutura(25),
    horario: "19:30",
    genero_musical: "Jazz Brasileiro & Instrumental",
    capacidade: 800,
    organizador_nome: "Amigos do Polytheama",
    imagem_url: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop&q=80",
    descricao: "Apresentação de gala com formações instrumentais e orquestrais independentes celebrando os sons da Mantiqueira e da Serra do Japi.",
    ehDemo: true,
  },
];

export const DEMO_MUSICAS_JUNDIAI: DemoMusica[] = [
  {
    id: "demo-mus-1",
    nome: "Vento da Serra",
    autor_apelido: "Serra do Japi Trio",
    genero: "Jazz Brasileiro / Instrumental",
    capa_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
    arquivo_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    ehDemo: true,
  },
  {
    id: "demo-mus-2",
    nome: "Estação Fepasa",
    autor_apelido: "Trilhos & Névoa",
    genero: "Indie Rock",
    capa_url: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80",
    arquivo_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    ehDemo: true,
  },
  {
    id: "demo-mus-3",
    nome: "Café com Garôa",
    autor_apelido: "Marina Fagundes",
    genero: "Nova MPB / Folk",
    capa_url: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=500&auto=format&fit=crop&q=80",
    arquivo_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    ehDemo: true,
  },
  {
    id: "demo-mus-4",
    nome: "Ponte Torta às Seis",
    autor_apelido: "Kael MC",
    genero: "Hip-Hop / Trap",
    capa_url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80",
    arquivo_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    ehDemo: true,
  },
  {
    id: "demo-mus-5",
    nome: "Curva da Serra",
    autor_apelido: "Banda Cabana Velha",
    genero: "Blues Rock Autoral",
    capa_url: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80",
    arquivo_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    ehDemo: true,
  },
];

export const DEMO_ALBUNS_JUNDIAI: DemoAlbum[] = [
  {
    id: "demo-alb-1",
    nome: "Paisagens da Mantiqueira",
    autor_apelido: "Serra do Japi Trio",
    capa_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
    ano: 2026,
    ehDemo: true,
  },
  {
    id: "demo-alb-2",
    nome: "Vagões & Neblina EP",
    autor_apelido: "Trilhos & Névoa",
    capa_url: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80",
    ano: 2026,
    ehDemo: true,
  },
  {
    id: "demo-alb-3",
    nome: "Interior Profundo",
    autor_apelido: "Marina Fagundes",
    capa_url: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=500&auto=format&fit=crop&q=80",
    ano: 2025,
    ehDemo: true,
  },
];

export const DEMO_ARTISTAS_JUNDIAI: DemoArtista[] = [
  {
    id: "demo-art-1",
    apelido: "Serra do Japi Trio",
    generos: "Jazz Brasileiro • Instrumental",
    local: "Jundiaí - SP",
    imagem_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
    total_curtidas: 142,
    descricao: "Trio instrumental explorando ritmos brasileiros e texturas da Mata Atlântica da Serra do Japi.",
    ehDemo: true,
  },
  {
    id: "demo-art-2",
    apelido: "Trilhos & Névoa",
    generos: "Indie Rock • Post-Punk",
    local: "Jundiaí - SP",
    imagem_url: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80",
    total_curtidas: 98,
    descricao: "Quarteto de indie rock inspirado na herança ferroviária e na névoa das noites de Jundiaí.",
    ehDemo: true,
  },
  {
    id: "demo-art-3",
    apelido: "Marina Fagundes",
    generos: "Nova MPB • Folk Autoral",
    local: "Jundiaí - SP",
    imagem_url: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=500&auto=format&fit=crop&q=80",
    total_curtidas: 84,
    descricao: "Cantautora com violão de nylon e poesias sobre o cotidiano do interior paulista.",
    ehDemo: true,
  },
  {
    id: "demo-art-4",
    apelido: "Kael MC",
    generos: "Hip-Hop • Trap da Serra",
    local: "Jundiaí - SP",
    imagem_url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80",
    total_curtidas: 76,
    descricao: "Rimas afiadas narrando a vivência da juventude periférica e os sons urbanos de Jundiaí.",
    ehDemo: true,
  },
  {
    id: "demo-art-5",
    apelido: "Banda Cabana Velha",
    generos: "Blues Rock • Southern Rock",
    local: "Jundiaí - SP",
    imagem_url: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80",
    total_curtidas: 63,
    descricao: "Guitarras com overdrive, gaita blues e letras de estrada direto da região da Malota.",
    ehDemo: true,
  },
];

export const DEMO_PUBLICACOES_JUNDIAI: DemoPublicacao[] = [
  {
    id: "demo-post-1",
    usuario_id: "demo-art-1",
    apelido: "Serra do Japi Trio",
    foto: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
    descricao: "Finalizamos hoje a captação das faixas do novo EP no estúdio em Jundiaí! Agradecimento especial a todos que compareceram ao ensaio aberto no Espaço Expressa. Em breve nos streamings! 🌿🎷",
    criado_em: new Date(Date.now() - 3600000 * 4).toISOString(),
    foto_url: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80",
    usuario: {
      nome: "Serra do Japi Trio",
      tipo_conta: "musico",
    },
    curtidas: 28,
    curtido: false,
    ehDemo: true,
  },
  {
    id: "demo-post-2",
    usuario_id: "demo-org-1",
    apelido: "Coletivo Som da FEPASA",
    foto: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
    descricao: "Convocatória aberta para bandas autorais da região de Jundiaí! Estamos selecionando 3 projetos para o Palco Aberto do Festival Som das Colinas no Parque da Cidade. Inscreva seu som pelo chat! 🎸✨",
    criado_em: new Date(Date.now() - 3600000 * 18).toISOString(),
    foto_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
    usuario: {
      nome: "Coletivo Som da FEPASA",
      tipo_conta: "organizador",
    },
    curtidas: 45,
    curtido: true,
    ehDemo: true,
  },
  {
    id: "demo-post-3",
    usuario_id: "demo-art-2",
    apelido: "Trilhos & Névoa",
    foto: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80",
    descricao: "Clipe oficial de 'Estação Fepasa' gravado nos trilhos históricos do Complexo FEPASA. Obrigado à produção e a todos que apoiam o rock autoral independente de Jundiaí! 🎥🚂",
    criado_em: new Date(Date.now() - 3600000 * 36).toISOString(),
    foto_url: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80",
    usuario: {
      nome: "Trilhos & Névoa",
      tipo_conta: "musico",
    },
    curtidas: 32,
    curtido: false,
    ehDemo: true,
  },
];

export const DEMO_OPORTUNIDADE_JUNDIAI = {
  id: "demo-opp-1",
  nome: "Convocatória Circuito Autoral Jundiaí",
  descricao: "Buscando bandas e artistas solo da região de Jundiaí (Rock, MPB, Rap, Instrumental) para compor a grade de apresentações do Espaço Expressa.",
  localizacao: "Espaço Expressa (Antiga FEPASA) - Jundiaí, SP",
  data: gerarDataFutura(7),
  organizador_id: "demo-org-1",
  organizador: {
    nome: "Coletivo Som da FEPASA",
  },
  ehDemo: true,
};
