<p align="center">
  <img src="assets/logo.png" alt="Logotipo Vybe" width="240" />
</p>

<h1 align="center">Vybe — Plataforma Digital para Músicos Independentes</h1>

<p align="center">
  <strong>Desenvolvimento de uma plataforma digital para ajudar na divulgação de músicos independentes da região de Jundiaí</strong><br />
  Trabalho de Conclusão de Curso — Técnico em Informática para a Internet (ETEC de Campo Limpo Paulista - CPS)
</p>

---

## Descrição

A **Vybe** é uma plataforma web desenvolvida para fortalecer a cena musical independente da região de Jundiaí–SP. O sistema resolve dois problemas centrais identificados na pesquisa de campo do projeto:

1. **Para músicos independentes:** a dificuldade em alcançar público, conquistar visibilidade frente a artistas já consolidados e estabelecer contato profissional com contratantes.
2. **Para organizadores de eventos:** a dificuldade de contato direto com artistas locais e a falta de informações centralizadas (portfólio, gênero musical, localização e disponibilidade) para contratação.

Em um único ambiente, a plataforma reúne perfis artísticos com portfólio de músicas e álbuns, feed da cena local, divulgação de eventos, busca com filtros/priorização de músicos e comunicação integrada por chat com envio de convites para apresentações.

---

## Equipe

* **Arthur Costa Chave** — `UI/UX`
* **Filipe Gomes dos Santos** — `Front-end/Back-end`
* **João Miguel de Campos Coimbra** — `QA/QC`

**Orientação:**
* Prof.ª Barbara Kathellen Andrade Porfirio
* Prof.ª Thaynara Cristina Maia dos Santos

---

## Tecnologias Utilizadas
| Ferramenta / Biblioteca | Versão Instalada | Finalidade no Projeto |
| --- | --- | --- |
| Node.js | `v26.13.0` | Runtime JavaScript local |
| npm | `v11.20.0` | Gerenciador de dependências |
| React | `v19.1.0` | Biblioteca base de UI |
| React Native | `v0.81.5` | Componentes nativos e primitivos visuais |
| React Native Web | `v0.21.2` | Compilação da interface para navegadores web |
| Expo | `v54.0.37` | Plataforma e ecossistema de compilação |
| Expo Router | `v6.0.24` | Roteamento nativo e URLs amigáveis |
| Supabase JS Client | `v2.112.4` (`^2.45.0`) | SDK de banco PostgreSQL, Auth e Realtime |
| Tailwind CSS | `v3.4.19` | Framework de classes utilitárias CSS |
| NativeWind | `v4.1.23` | Integração do Tailwind com React Native |
| TypeScript | `v5.9.3` | Superset tipado para o código-fonte |
| Zustand | `v4.5.7` | Gerenciamento de estado (Audio Player & Auth) |
| Lucide React Native | `v0.468.0` | Ícones da interface |
* **Ferramentas de Apoio:** Visual Studio Code, Figma (prototipagem), Visual Paradigm (DCU) e MySQL Workbench (DER)

---

## Demonstração do Sistema

> *Adicione as capturas de tela atualizadas na pasta `docs/images/` (ou ajuste os caminhos abaixo).*

### Página Inicial (Home)
![Página Inicial do Vybe](./docs/images/home.png)
*Exibição de eventos em aberto, lançamentos em alta e artistas independentes da comunidade.*

### Conversas e Envio de Convites para Eventos
![Chat e Convite de Evento](./docs/images/conversas-convite.png)
*Comunicação direta entre organizadores e músicos com envio de convites interativos e atualização em tempo real.*

### Central de Criação (Músico e Organizador)
![Central de Criação](./docs/images/central-criacao.png)
*Publicação de faixas, álbuns, eventos e postagens no Feed da Cena com pré-visualização em tempo real.*

---

## Como Executar o Projeto (Passo a Passo)

### Pré-requisitos
* [Node.js](https://nodejs.org/) instalado (`v18+` recomendado)
* [Git](https://git-scm.com/) instalado
* Uma conta e projeto configurados no [Supabase](https://supabase.com/)

### 1. Clone o repositório
```bash
git clone https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
cd SEU-REPOSITORIO
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto com as credenciais do seu projeto Supabase:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
```
*(Caso o projeto utilize Create React App em vez de Vite, substitua o prefixo `VITE_` por `REACT_APP_`.)*

### 4. Execute o servidor de desenvolvimento
```bash
npm run dev
```
*(Ou `npm start`, conforme o script configurado no `package.json`.)*

### 5. Acesse no navegador
Abra o endereço exibido no terminal (geralmente `http://localhost:5173` ou `http://localhost:3000`).

---

## Como Citar o Projeto

```text
CHAVE, Arthur Costa; SANTOS, Filipe Gomes dos; COIMBRA, João Miguel de Campos. Desenvolvimento de uma plataforma digital para ajudar na divulgação de músicos independentes da região de Jundiaí. 2026. 63 p. Trabalho de Conclusão de Curso (Técnico em Informática para a Internet) – ETEC de Campo Limpo Paulista, Centro Paula Souza, Campo Limpo Paulista, 2026.
```

---

## Contato e Documentação

Em caso de dúvidas sobre o projeto, entre em contato com a equipe:
* **Arthur Costa Chave:** arthur.chave@aluno.cps.sp.gov.br
* **Filipe Gomes dos Santos:** filipe.santos8@aluno.cps.sp.gov.br
* **João Miguel de Campos Coimbra:** joao.coimbra2@aluno.cps.sp.gov.br

Para acessar o trabalho escrito do projeto no Repositório Institucional do Conhecimento do Centro Paula Souza:
* **RIC-CPS:** https://ric.cps.sp.gov.br/
