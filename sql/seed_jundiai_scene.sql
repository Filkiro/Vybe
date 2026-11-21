-- =================================================================
-- SEED DEMONSTRATIVO: CENA MUSICAL INDEPENDENTE DE JUNDIAÍ-SP
-- =================================================================
-- Este script popula o banco com artistas, organizadores, músicas,
-- álbuns, eventos e publicações autênticas da região de Jundiaí-SP
-- (Espaço Expressa, Parque da Cidade, Bar do Haules, Teatro Polytheama).
--
-- É seguro rodar no SQL Editor do Supabase (idempotente com ON CONFLICT).
-- =================================================================

-- 1. USUÁRIOS ARTISTAS E ORGANIZADORES
INSERT INTO public.usuario (id, nome, email, tipo_conta, status, criado_em)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Serra do Japi Trio', 'serra.japi@vybe.demo', 'musico', 'ativo', now()),
  ('a2222222-2222-2222-2222-222222222222', 'Trilhos & Névoa', 'trilhos.nevoa@vybe.demo', 'musico', 'ativo', now()),
  ('a3333333-3333-3333-3333-333333333333', 'Marina Fagundes', 'marina.fagundes@vybe.demo', 'musico', 'ativo', now()),
  ('a4444444-4444-4444-4444-444444444444', 'Kael MC', 'kael.mc@vybe.demo', 'musico', 'ativo', now()),
  ('a5555555-5555-5555-5555-555555555555', 'Banda Cabana Velha', 'cabana.velha@vybe.demo', 'musico', 'ativo', now()),
  ('b1111111-1111-1111-1111-111111111111', 'Coletivo Som da FEPASA', 'coletivo.fepasa@vybe.demo', 'organizador', 'ativo', now()),
  ('b2222222-2222-2222-2222-222222222222', 'Haules Produções Culturais', 'haules.prod@vybe.demo', 'organizador', 'ativo', now())
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  tipo_conta = EXCLUDED.tipo_conta,
  status = EXCLUDED.status;

-- 2. PERFIS DE MÚSICOS
INSERT INTO public.perfil_musico (usuario_id, apelido, foto_url, genero_musical, localizacao, descricao, disponivel)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Serra do Japi Trio', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80', 'Jazz Brasileiro • Instrumental', 'Jundiaí - SP', 'Trio instrumental explorando ritmos brasileiros e texturas da Mata Atlântica da Serra do Japi.', true),
  ('a2222222-2222-2222-2222-222222222222', 'Trilhos & Névoa', 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80', 'Indie Rock • Post-Punk', 'Jundiaí - SP', 'Quarteto de indie rock inspirado na herança ferroviária e na névoa das noites de Jundiaí.', true),
  ('a3333333-3333-3333-3333-333333333333', 'Marina Fagundes', 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=500&auto=format&fit=crop&q=80', 'Nova MPB • Folk Autoral', 'Jundiaí - SP', 'Cantautora com violão de nylon e poesias sobre o cotidiano do interior paulista.', true),
  ('a4444444-4444-4444-4444-444444444444', 'Kael MC', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', 'Hip-Hop • Trap da Serra', 'Jundiaí - SP', 'Rimas afiadas narrando a vivência da juventude periférica e os sons urbanos de Jundiaí.', true),
  ('a5555555-5555-5555-5555-555555555555', 'Banda Cabana Velha', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80', 'Blues Rock • Southern Rock', 'Jundiaí - SP', 'Guitarras com overdrive, gaita blues e letras de estrada direto da região da Malota.', true)
ON CONFLICT (usuario_id) DO UPDATE SET
  apelido = EXCLUDED.apelido,
  foto_url = EXCLUDED.foto_url,
  genero_musical = EXCLUDED.genero_musical,
  localizacao = EXCLUDED.localizacao,
  descricao = EXCLUDED.descricao,
  disponivel = EXCLUDED.disponivel;

-- 3. PERFIS DE ORGANIZADORES
INSERT INTO public.perfil_organizador (usuario_id, localizacao, nicho_trabalho, descricao, banner_url)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Jundiaí - SP', 'Festivais & Circuitos Autorais', 'Coletivo dedicado a valorizar a produção artística e musical independente no Espaço Expressa e região.', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80'),
  ('b2222222-2222-2222-2222-222222222222', 'Centro Histórico, Jundiaí - SP', 'Shows Intimistas & Rock', 'Produção cultural independente movimentando o Centro Histórico com música autoral ao vivo.', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80')
ON CONFLICT (usuario_id) DO UPDATE SET
  localizacao = EXCLUDED.localizacao,
  nicho_trabalho = EXCLUDED.nicho_trabalho,
  descricao = EXCLUDED.descricao,
  banner_url = EXCLUDED.banner_url;

-- 4. ÁLBUNS
INSERT INTO public.album (id, usuario_id, nome, capa_url, status, criado_em)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Paisagens da Mantiqueira', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80', 'ativo', now()),
  ('c2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Vagões & Neblina EP', 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80', 'ativo', now()),
  ('c3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', 'Interior Profundo', 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=500&auto=format&fit=crop&q=80', 'ativo', now())
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  capa_url = EXCLUDED.capa_url,
  status = EXCLUDED.status;

-- 5. MÚSICAS
INSERT INTO public.musica (id, usuario_id, nome, arquivo_url, capa_url, status, data_lancamento)
VALUES
  ('d1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Vento da Serra', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80', 'ativo', CURRENT_DATE),
  ('d2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Estação Fepasa', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80', 'ativo', CURRENT_DATE),
  ('d3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', 'Café com Garôa', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=500&auto=format&fit=crop&q=80', 'ativo', CURRENT_DATE),
  ('d4444444-4444-4444-4444-444444444444', 'a4444444-4444-4444-4444-444444444444', 'Ponte Torta às Seis', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', 'ativo', CURRENT_DATE),
  ('d5555555-5555-5555-5555-555555555555', 'a5555555-5555-5555-5555-555555555555', 'Curva da Serra', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80', 'ativo', CURRENT_DATE)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  capa_url = EXCLUDED.capa_url,
  status = EXCLUDED.status;

-- 6. EVENTOS (com datas futuras)
INSERT INTO public.evento (id, organizador_id, nome, data, horario, localizacao, genero_musical, capacidade, status, descricao, capa_url)
VALUES
  ('e1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Circuito Autoral no Espaço Expressa', CURRENT_DATE + INTERVAL '4 days', '18:00', 'Espaço Expressa (Antiga FEPASA) - Jundiaí, SP', 'Indie Rock & MPB Alternativa', 350, 'aberto', 'Encontro com 4 bandas autorais independentes de Jundiaí e região nos galpões históricos do Espaço Expressa.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80'),
  ('e2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'Festival Som das Colinas', CURRENT_DATE + INTERVAL '11 days', '15:00', 'Parque da Cidade (Palco das Águas) - Jundiaí, SP', 'Folk, MPB & Instrumental', 600, 'aberto', 'Tardezinha acústica às margens da represa do Parque da Cidade com artistas autorais da Serra do Japi.', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80'),
  ('e3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'Noite Autoral no Bar do Haules', CURRENT_DATE + INTERVAL '18 days', '20:30', 'Bar do Haules (Centro Histórico) - Jundiaí, SP', 'Blues Rock & Post-Punk', 120, 'aberto', 'Palco intimista no coração do Centro de Jundiaí, reunindo novos compositores e clássicos do rock da região.', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80'),
  ('e4444444-4444-4444-4444-444444444444', 'b2222222-2222-2222-2222-222222222222', 'Sessão Instrumental no Polytheama', CURRENT_DATE + INTERVAL '25 days', '19:30', 'Teatro Polytheama - Centro, Jundiaí, SP', 'Jazz Brasileiro & Instrumental', 800, 'aberto', 'Apresentação com formações instrumentais e orquestrais independentes celebrando os sons da Mantiqueira e da Serra do Japi.', 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  data = EXCLUDED.data,
  horario = EXCLUDED.horario,
  localizacao = EXCLUDED.localizacao,
  genero_musical = EXCLUDED.genero_musical,
  capacidade = EXCLUDED.capacidade,
  status = EXCLUDED.status,
  capa_url = EXCLUDED.capa_url;

-- 7. PUBLICAÇÕES (Feed da Cena)
INSERT INTO public.publicacao (id, usuario_id, descricao, foto_url, criado_em, musica_id, album_id, evento_id)
VALUES
  ('f1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Finalizamos hoje a captação das faixas do novo EP no estúdio em Jundiaí! Agradecimento especial a todos que compareceram ao ensaio aberto no Espaço Expressa. Em breve nos streamings! 🌿🎷', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80', now() - interval '4 hours', 'd1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', null),
  ('f2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'Convocatória aberta para bandas autorais da região de Jundiaí! Estamos selecionando 3 projetos para o Palco Aberto do Festival Som das Colinas no Parque da Cidade. Inscreva seu som pelo chat! 🎸✨', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80', now() - interval '18 hours', null, null, 'e2222222-2222-2222-2222-222222222222'),
  ('f3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', 'Clipe oficial de ''Estação Fepasa'' gravado nos trilhos históricos do Complexo FEPASA. Obrigado à produção e a todos que apoiam o rock autoral independente de Jundiaí! 🎥🚂', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80', now() - interval '36 hours', 'd2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', null)
ON CONFLICT (id) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  foto_url = EXCLUDED.foto_url;
