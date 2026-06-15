# Documentação Técnica — Live Showcase Builder

> Plataforma estilo _page builder_ para criadoras de conteúdo montarem a vitrine de produtos da sua live e divulgarem um link público para as seguidoras.
> Referência de resultado final: `https://pambraga-live.vercel.app/`

---

## Desenvolvimento local

### Pré-requisitos

- Node.js 20 ou superior
- npm
- Banco PostgreSQL no Neon
- Projeto OAuth no Google Cloud, opcional

### Instalação

```bash
npm install
cp .env.example .env.local
```

Preencha as variáveis server-side:

```env
DATABASE_URL=""
AUTH_SECRET=""
AUTH_URL="http://localhost:3000"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
```

Gere um segredo para o Auth.js com:

```bash
npx auth secret
```

`DATABASE_URL` e `AUTH_SECRET` são obrigatórias. `AUTH_URL` deve apontar para a
URL pública da aplicação em produção, pois também é usada nos links de
compartilhamento e callbacks de autenticação. Na Vercel, sem `AUTH_URL`, o app
tenta usar as URLs automáticas do deploy, mas configurar `AUTH_URL` continua
sendo o caminho mais estável. As variáveis do Google devem ser preenchidas
juntas; quando ambas estiverem vazias, login e cadastro por e-mail continuam
funcionando e o botão do Google não é exibido.

### Google OAuth

Crie credenciais OAuth 2.0 do tipo aplicação web no Google Cloud Console.
Durante o desenvolvimento, configure esta URI de redirecionamento autorizada:

```text
http://localhost:3000/api/auth/callback/google
```

O MVP não vincula silenciosamente uma conta Google a uma conta Credentials que
já possua o mesmo e-mail. A pessoa deve entrar pelo método usado originalmente;
essa política evita account linking sem comprovação de posse da conta existente.

### Banco de dados

```bash
npm run db:generate # gera migration SQL versionada
npm run db:migrate  # aplica migrations pendentes
npm run db:studio   # abre o Drizzle Studio
```

Revise sempre o SQL em `drizzle/` antes de aplicar uma nova migration. O fluxo
principal não utiliza `drizzle-kit push`.

### Comandos

```bash
npm run dev
npm run test
npm run lint
npm run typecheck
npm run build
```

### Estrutura principal

```text
src/
├── app/                  # rotas públicas, auth, admin e API do Auth.js
├── components/           # componentes de auth, admin e shadcn/ui
├── lib/                  # auth, ambiente, validações e utilitários
├── server/actions/       # Server Actions
├── server/db/            # cliente, queries e schemas Drizzle
└── types/                # ampliações de tipos do Auth.js
```

O painel em `/admin` possui proteção no `src/proxy.ts` e nova verificação
server-side em seu layout.

---

## Fase 1 — Gestão de lives

A Fase 1 entrega o CRUD completo de lives no admin. Cada operação valida a
sessão e a propriedade do recurso no servidor; o `user_id` vem sempre da sessão,
nunca do cliente.

### Rotas administrativas

| Rota                    | Descrição                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `/admin`                | Lista as lives da pessoa autenticada (publicada primeiro, depois por atualização mais recente). |
| `/admin/lives/new`      | Cria uma nova live como rascunho.                                                               |
| `/admin/lives/[liveId]` | Edita, publica, despublica ou exclui uma live.                                                  |

### Criar uma live

1. Em `/admin`, clique em **Nova live** (ou em **Criar primeira live** no estado vazio).
2. Preencha título, loja e data (obrigatórios); subtítulo, horário e plataforma são opcionais.
3. O **endereço** (slug) é gerado automaticamente a partir do título e pode ser
   editado à mão. Depois de editado, ele deixa de acompanhar o título; use
   **Gerar do título** para regerar. A prévia mostra a URL pública futura
   `/seu-handle/slug-da-live`.
4. **Salvar rascunho** cria a live com status `draft` e abre a tela de edição.

O slug é único por usuário. O mesmo slug pode existir para usuários diferentes.
Em caso de colisão, um sufixo curto e previsível é aplicado (`slug-2`, `slug-3`…).

### Publicar / despublicar

- **Publicar** uma live a marca como `published`, preenche `published_at` e
  **despublica automaticamente qualquer outra live publicada do mesmo usuário** —
  apenas uma live fica publicada por vez. A operação roda em um `db.batch`
  (transação atômica do Neon), pois o driver `neon-http` não suporta transações
  interativas.
- **Despublicar** (com confirmação) volta o status para `draft` e limpa
  `published_at`.

### Excluir

A exclusão pede confirmação, informando o título e que a ação é irreversível
(produtos vinculados também serão removidos via cascade quando existirem). Se a
live estiver publicada, o aviso destaca que a publicação será removida.

### Comandos de desenvolvimento, testes e qualidade

```bash
npm run dev        # servidor local
npm run test       # vitest (utilitários, schemas, actions e componentes)
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run build      # build de produção
```

Não há **nova migration** nesta fase: o schema de `lives` aplicado na Fase 0 já
atende (FK com cascade, unique `(user_id, slug)` e índices por usuário/status).

### Limitações atuais

- Página pública `[handle]` ainda não implementada.
- Extração de links da C&A ainda não implementada.

## Fase 2 — Produtos e reordenação

A Fase 2 entrega a gestão **manual** de produtos dentro de cada live, na própria
tela de edição (`/admin/lives/[liveId]`). Como na Fase 1, toda operação valida a
sessão e a cadeia de propriedade `produto → live → usuário` no servidor; nunca
confiamos em `liveId`, `productId`, `position` ou `userId` vindos do cliente.

### Rotas administrativas

| Rota                                         | Descrição                   |
| -------------------------------------------- | --------------------------- |
| `/admin/lives/[liveId]/products/new`         | Adiciona um produto à live. |
| `/admin/lives/[liveId]/products/[productId]` | Edita um produto existente. |

### Adicionar, editar e excluir

1. Na seção **Produtos da live**, clique em **Adicionar produto** (ou
   **Adicionar primeiro produto** no estado vazio).
2. Preencha **nome**, **categoria**, **link da imagem** e **link para comprar**
   (obrigatórios); tamanho, cor e preço são opcionais. As categorias já usadas na
   live aparecem como **sugestões** enquanto você digita.
3. Uma **prévia** ao lado mostra imagem, categoria, nome, tamanho/cor e preço
   enquanto você edita. Imagens que não carregam exibem um fallback.
4. **Salvar produto** insere o produto na **última posição** e volta para a live.
5. **Excluir** pede confirmação; ao remover, as posições restantes são
   **reindexadas** para `0, 1, 2…`.

### Reordenar

- **Arrastando**: use a alça (ícone de arrastar) com mouse, toque ou teclado
  (foque a alça, pressione **espaço** para pegar, **setas** para mover, **espaço**
  para soltar).
- **Botões Mover para cima / Mover para baixo**: alternativa acessível ao
  arrastar; ficam desabilitados no primeiro/último item.
- A nova ordem é enviada em **uma única requisição** com a lista completa de ids.
  O servidor valida que é uma permutação exata dos produtos da live (sem
  duplicados, faltantes, extras ou de outra live) antes de persistir. Em caso de
  erro, a ordem anterior é **restaurada** e uma mensagem é exibida.

### Preço

O campo aceita formato brasileiro (`99,90`, `129`, `1.299,90`) e é normalizado
para decimal canônico (`numeric`, nunca float) antes de salvar. Na exibição volta
para `R$ 199,90`.

### Imagens por URL

Nesta fase as imagens são **apenas links** (sem upload). Como o host é arbitrário,
a área administrativa usa `<img>` nativo com tamanho fixo (evita layout shift) e
fallback de erro, em vez do `next/image` — assim evitamos configurar um domínio
remoto irrestrito e o proxy do otimizador (vetor de SSRF) para hosts não
confiáveis. Imagens otimizadas/upload entram em fase posterior.

### Dependências adicionadas

- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — drag-and-drop
  acessível (mouse, toque e teclado).

Não há **nova migration** nesta fase: a tabela `products` já foi criada na Fase 0
(FK com cascade, índices por `live_id` e por `(live_id, position)`).

### Limitações atuais (após a Fase 2)

- Sem upload de imagens (Vercel Blob / Cloudinary).
- Página pública `[handle]`, filtros públicos, compartilhamento e analytics
  ainda não implementados.

## Fase 3 — Extração automática por link

A criadora cola primeiro o link de afiliado. O servidor busca **nome, imagem,
preço, cor, categoria, marca, SKU e tamanhos disponíveis** no HTML público da
página e preenche apenas os campos vazios do formulário. A criadora confere,
edita e salva. **O cadastro manual continua funcionando** mesmo quando a
extração falha — a extração nunca bloqueia nem salva o produto.

### Fluxo

1. A tela de criação começa mostrando apenas o link, **Buscar produto** e
   **Prefiro preencher manualmente**.
2. Sucesso, resultado parcial ou falha revelam o formulário completo sem apagar
   o link. A falha sempre abre o fallback manual.
3. Nome, imagem, preço, cor e categoria encontrados preenchem somente campos
   vazios e não modificados (`dirtyFields`).
4. Tamanhos disponíveis aparecem como sugestões; o **tamanho mostrado na live**
   só muda quando a criadora escolhe ou digita.
5. Na edição, **Buscar informações novamente** reaplica as mesmas regras e nunca
   salva automaticamente nem altera a posição.

### Semântica de URLs

- **`affiliateUrl`** — valor exato colado pela criadora, incluindo UTMs e
  parâmetros de campanha.
- **`productUrl`** — recebe a `affiliateUrl`, é persistida em `product_url` e
  será o link público de compra.
- **`sourceUrl`** — também recebe a `affiliateUrl` e é persistida em
  `source_url` como proveniência da extração.
- **`canonicalUrl`** — URL limpa sugerida pelo HTML (`rel=canonical`, JSON-LD ou
  `og:url`); fica apenas no cache e nunca substitui o link afiliado.
- **`finalUrl`** — último hop da cadeia segura de redirects; fica em
  `final_url` no cache e nunca substitui o link afiliado.

### Endpoint

`POST /api/products/extract` (runtime **Node.js**, exige autenticação). A resposta
separa `affiliateUrl`, `canonicalUrl` e `finalUrl`, além de retornar
`name/imageUrl/price/color/category/brand/sku/availableSizes`, `fieldsFound`,
`extractionSource`, `completeness` e `fromCache`. Nunca retorna HTML bruto.
Erros usam um `code` tipado + mensagem amigável (nunca HTML, SQL, stack trace,
IP ou variáveis de ambiente).

### Allowlist e variáveis de ambiente

A extração só aceita **hosts exatos** configurados (sem subdomínios implícitos,
sem `includes`). Allowlist vazia mantém a extração desativada — o cadastro manual
segue normal. **Configure com hosts reais**, confirmados por links de afiliado;
inclua **todos os hosts da cadeia de redirect** (o link de afiliado e o destino
final). Nenhuma variável é `NEXT_PUBLIC`.

```env
PRODUCT_EXTRACTION_ALLOWED_HOSTS="minhacea.cea.com.br,www.cea.com.br"
PRODUCT_EXTRACTION_TIMEOUT_MS="8000"
PRODUCT_EXTRACTION_MAX_REDIRECTS="5"
PRODUCT_EXTRACTION_MAX_BYTES="8388608"
```

Os hosts acima foram confirmados com links diretos e de afiliado da C&A. O
limite considera o HTML descompactado da loja, que pode ultrapassar 5 MB.

### Proteções SSRF e limites de rede

- Só `http`/`https`; rejeita credenciais embutidas, `javascript:`/`data:`/
  `file:`/`ftp:`/`blob:`, URLs relativas e IPs privados/reservados (loopback,
  `10/8`, `172.16/12`, `192.168/16`, `169.254/16` incl. `169.254.169.254`, IPv6
  `::1`/link-local/unique-local) via `ipaddr.js`.
- Redirects seguidos **manualmente** (`redirect: "manual"`), validando cada hop
  (scheme + allowlist + resolução DNS → classificação de IP).
- Timeout total (`AbortController`), limite de redirects e de bytes; valida
  `Content-Type` (só HTML); **não** repassa cookies/Authorization/headers do
  cliente, e o cliente não escolhe método, headers, timeout ou redirects.
- **Limitação conhecida (DNS rebinding):** validamos o IP resolvido antes do
  fetch, mas o runtime não permite "pinar" o socket no IP validado, então há uma
  janela TOCTOU. A allowlist exata de hosts é a principal barreira.

### Cache e rate limit (Postgres/Neon)

- Cache em `product_extraction_cache`. A identidade usa SHA-256, nesta ordem:
  **SKU → canonical normalizada → final normalizada → original normalizada**.
  `metadata.lookupHashes` mantém as chaves alternativas. A normalização remove
  fragmento e apenas parâmetros conhecidos de tracking (`utm_*`, `gclid`,
  `fbclid`), preservando parâmetros funcionais e sem modificar a afiliada.
- Registros antigos continuam localizáveis pelo hash legado da URL completa.
  O cache nunca guarda HTML, cookies ou headers. TTL: **24h** para sucesso/
  parcial e "sem dados"; **10min** para erros temporários.
- Rate limit em `extraction_rate_limits`: **10 tentativas/min por usuário**,
  janela fixa, contador incrementado por upsert atômico (seguro em serverless).
  Retorna `429` + `Retry-After`. **Cache hit válido não consome tentativa.**

### Estratégias de extração (Cheerio)

1. **JSON-LD Product**: nome, imagem, preço, cor, SKU/`productID`/`mpn`, marca,
   categoria, tamanho e URL; suporta objeto, array, `@graph`, tipos em array,
   offers em objeto/array e formas variadas de imagem/marca.
2. **JSON-LD BreadcrumbList** e breadcrumb HTML semântico: sugerem a categoria
   mais específica, ignorando níveis genéricos como Home/Feminino/Produtos.
3. **Open Graph / Twitter**: título, imagem, preço e `og:url` como fallback.
4. **Meta básica** (`<title>`) como último recurso. Fontes combinadas viram
   `mixed`. Scripts nunca são executados e não há browser headless.

### Imagens

URLs extraídas são validadas (só http/https) e **não** são baixadas nem
re-hospedadas. A prévia administrativa usa `<img>` nativo com tamanho fixo e
fallback (sem wildcard irrestrito no `next/image`, sem proxy de imagem). Hosts
verificados podem ser adicionados a `remotePatterns` numa fase futura.

### Como testar (fixtures, sem rede real)

Os testes não fazem requests externos: o parser usa fixtures HTML locais e a
camada de rede injeta `fetch`/DNS falsos. Rode `npm run test`. Há cobertura para
parser (JSON-LD/OG/meta), SSRF/IP, redirects, safe-fetch, normalização, cache/
rate-limit (lógica pura), endpoint e UI.

### Migration

`drizzle/0001_flat_wolverine.sql` é não destrutiva e cria as tabelas de cache/
rate limit da Fase 3 já com o JSONB `metadata`. Nenhuma coluna foi adicionada a
`products`; SKU, canonical, marca e tamanhos ficam somente no cache. Aplique com
`npm run db:migrate` após revisar o SQL.

### Comandos

```bash
npm run test       # vitest (inclui extração)
npm run lint
npm run typecheck
npm run build
npm run db:generate
npm run db:migrate
```

### Limitações reais (após a Fase 3)

- A extração depende do **HTML público** da loja; mudanças no site podem quebrar
  o parser. A aplicação **não contorna** bloqueios (403/429/CAPTCHA) — nesses
  casos volta ao cadastro manual.
- **Headless browser não foi implementado** (proibido nesta fase); páginas
  totalmente JS-renderizadas podem não expor dados em HTML estático.
- **Upload de imagens** não foi implementado; imagens são apenas links.
- **Página pública** `[handle]` ainda não existe.

---

## Fase 4 — Capa da live e importação de produtos em lote

Dois ajustes de UX focados em reduzir a fricção para a criadora.

### Upload da capa da live

O campo de URL da capa foi substituído por **upload de arquivo**. A criadora
escolhe uma imagem do celular/computador; nada de copiar endereços.

- **Storage:** [Vercel Blob](https://vercel.com/docs/storage/vercel-blob).
- **Variável de ambiente** (server-only, nunca `NEXT_PUBLIC`):

  ```env
  BLOB_READ_WRITE_TOKEN=""
  ```

  Vazio desativa o upload (o restante do app continua funcionando). O token só é
  lido no servidor.

- **Formatos aceitos:** JPG, PNG, WebP. **Limite:** 5 MB.
- **Rejeitados:** SVG, GIF, PDF, MIME inválido, arquivos acima do limite. A
  validação roda no cliente e **de novo no servidor**, que ainda confere os
  _magic bytes_ — um `Content-Type` forjado (ex.: SVG marcado como `image/png`)
  é barrado.
- **Segurança:** a rota `POST /api/lives/cover` exige sessão; o `userId` vem da
  sessão (qualquer `userId` do cliente é ignorado); o nome do arquivo é um UUID
  (`lives/{userId}/{uuid}.{ext}`), sem usar o nome original; o token nunca é
  exposto e o conteúdo do arquivo nunca é logado.
- **Campo reutilizado:** `lives.cover_image_url` (já existia). **Sem migration.**
- **Troca/remoção seguras:** a imagem antiga só é apagada **depois** que a live é
  salva com a nova URL (ou com `null`), nunca antes. Excluir a live remove a
  capa do storage.
- **Uso da capa:** card no admin, cabeçalho da página pública, Open Graph e
  preview de compartilhamento (com _fallback_ quando não há capa).
- **Componente:** `LiveImageUpload` (seleção, preview, upload, troca, remoção,
  loading, erro). O submit da live fica bloqueado enquanto o upload acontece.

### Importação de produtos em lote

Em vez de cadastrar um produto por vez, a criadora cola **vários links de
afiliado** e revisa cards já preenchidos.

- **Entrada:** `Adicionar produtos` na seção de produtos →
  `/admin/lives/[liveId]/products/import`. `Adicionar apenas um produto`
  continua disponível.
- **Campo único:** um link por linha, até **20 links por vez** (com contador).
  Um helper puro (`parseProductLinks`) classifica cada linha como _válido_,
  _link inválido_, _host não aceito_, _duplicado_ ou _já está na live_.
- **Preservação do afiliado:** o link completo (com UTMs) é mantido e salvo em
  `product_url`; nunca é trocado pela canonical.
- **Busca em lote:** reutiliza o endpoint seguro `POST /api/products/extract`
  (allowlist, SSRF, redirects, timeout, rate limit e cache preservados), com
  **concorrência de 3** requisições. Há progresso geral e status por item; um
  erro não interrompe os demais.
- **Cards parecidos com o público:** imagem, nome, categoria, preço, cor e o
  único campo sempre visível — **tamanho usado na live** (nunca preenchido
  automaticamente; tamanhos extraídos viram apenas sugestão).
- **Pronto vs. precisa de revisão:** _pronto_ exige nome, imagem, categoria e
  link; do contrário pede revisão. A edição completa abre num **Sheet** (tela
  cheia no mobile, lateral no desktop) e é exceção. **Não há upload de imagem de
  produto** — a imagem do produto continua por URL (com fallback manual).
- **Retry:** itens com falha têm `Tentar novamente` (só aquele item) e
  `Preencher manualmente`.
- **Duplicados:** detectados por link/URL normalizada e contra os produtos já na
  live; não começam selecionados.
- **Seleção:** produtos prontos começam selecionados; incompletos/falhos não.
- **Estado temporário:** a revisão é mantida em `sessionStorage` (por live, sem
  HTML nem tokens). Ao recarregar, oferece _continuar_ ou _descartar_.
- **Salvamento:** `createProductsBatchAction` recebe só os itens prontos e
  selecionados, revalida sessão/propriedade, re-valida cada produto, recalcula a
  posição no servidor (mantém a ordem original, anexando ao final) e grava num
  **único insert atômico** (rollback se algum item falhar). Em seguida revalida
  o admin e a página pública (se publicada) e limpa o estado temporário.
- **Cancelamento:** confirma antes de descartar; nunca apaga produtos já salvos.

### Dependências adicionadas (Fase 4)

- `@vercel/blob` — storage da capa.
- `@radix-ui/react-dialog` (Sheet) e `@radix-ui/react-checkbox` (seleção).

### Limitações reais (após a Fase 4)

- **Arquivos órfãos:** se a criadora envia uma capa e abandona o formulário sem
  salvar, o blob pode ficar órfão (limpeza automática só ocorre em
  troca/remoção/exclusão da live). Aceito como limitação simples.
- **Upload de imagem de produto** continua **não implementado** (fora do escopo
  deste ajuste) — produtos seguem por URL.
- A detecção de duplicados por **SKU/canonical** depende do que a extração
  retorna; sem esses dados, cai na comparação por URL.

---

## 1. Visão geral

### Problema

Blogueiras que fazem lives divulgando produtos (ex.: live de uma loja como a C&A) hoje espalham os links dos produtos em vários lugares (stories, bio, comentários). As seguidoras se perdem. Não existe um lugar único, organizado e bonito que reúna **todos os produtos daquela live com nome, foto, tamanho/cor e link de compra**.

### Solução

Um admin simples (estilo WordPress / page builder enxuto) onde a criadora:

1. Cria uma "live" (título, data, horário, loja).
2. Cola os links dos produtos — o sistema busca **nome e imagem automaticamente**.
3. Completa categoria, tamanho e cor, reordena os produtos.
4. Publica.

O resultado é uma página pública, mobile-first, hospedada em URL própria (Vercel), que a criadora compartilha com as seguidoras.

### Público-alvo

- **Criadoras** (usuárias do admin): não-técnicas. UX precisa ser à prova de fricção.
- **Seguidoras** (consumidoras da página pública): majoritariamente mobile, vindas de Instagram/WhatsApp. Performance e clareza são prioridade.

---

## 2. Escopo / Funcionalidades

### MVP (v1)

**Autenticação**

- Cadastro com e-mail e senha **ou** Google.
- Login com e-mail e senha.

**Gestão de lives**

- Criar nova live.
- Editar título, data, horário, capa e link do Instagram.
- Publicar / despublicar uma live.

**Produtos**

- Colar link do produto → sistema busca nome e foto automaticamente.
- Cadastrar/editar: nome, categoria, tamanho, cor, imagem e link.
- Reordenar produtos (drag-and-drop).
- Remover produto.

**Página pública**

- Mostra automaticamente a live publicada.
- Filtro de categorias gerado dinamicamente a partir dos produtos.
- Grid de produtos mobile-first.
- Compartilhamento (WhatsApp / copiar link).

### Fora do MVP (backlog / v2+)

- Métricas de cliques por produto (analytics).
- Temas / personalização visual da página pública.
- Múltiplas lives publicadas simultaneamente por criadora.
- Domínio customizado por criadora.
- Suporte a outras lojas além da C&A (extração genérica de metadados).
- Integração oficial de afiliado (se/quando houver API).

---

## 3. Arquitetura

Aplicação **full-stack monolítica em Next.js** (App Router), com três superfícies bem separadas dentro do mesmo projeto:

```
┌───────────────────────────────────────────────────────────┐
│                     Next.js (App Router)                   │
│                                                            │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │   /admin     │   │  /(public)   │   │  /api  + RSC   │  │
│  │  (privado)   │   │   página     │   │  Server Actions│  │
│  │  page builder│   │   da live    │   │  extração link │  │
│  └──────┬───────┘   └──────┬───────┘   └───────┬────────┘  │
│         │                  │                   │           │
└─────────┼──────────────────┼───────────────────┼───────────┘
          │                  │                   │
          ▼                  ▼                   ▼
   ┌─────────────┐    ┌─────────────┐    ┌──────────────────┐
   │  Auth.js    │    │  Cache/ISR  │    │  Catálogo C&A     │
   │  (sessão)   │    │ revalidate  │    │ (HTML → metadata) │
   └─────────────┘    └─────────────┘    └──────────────────┘
          │
          ▼
   ┌──────────────────────┐
   │  PostgreSQL (Drizzle) │
   │  users / lives /      │
   │  products             │
   └──────────────────────┘
```

### Decisões-chave

- **Admin** (`/admin/*`): rotas autenticadas, renderização dinâmica. É o page builder.
- **Página pública** (`/[handle]`): renderização estática com **ISR / revalidação on-demand**. Quando a criadora publica/edita, dispara `revalidatePath`/`revalidateTag` para regenerar. Isso entrega TTFB baixíssimo e bom SEO sem manter a página "viva" no servidor a cada request.
- **Extração de link**: roda **sempre no servidor** (Server Action ou Route Handler), nunca no cliente — evita CORS e mantém a lógica de parsing fora do bundle.

---

## 4. Stack tecnológica

| Camada          | Tecnologia                                                                    | Por quê                                                                                 |
| --------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Framework       | **Next.js 15+ (App Router, RSC)**                                             | SSG/ISR para a página pública + rotas de API no mesmo projeto; deploy nativo na Vercel. |
| Linguagem       | **TypeScript** (strict)                                                       | Segurança de tipos ponta a ponta, schema → UI.                                          |
| UI              | **Tailwind CSS + shadcn/ui**                                                  | Mobile-first por padrão; componentes acessíveis e customizáveis sem lock-in.            |
| Drag-and-drop   | **dnd-kit**                                                                   | Reordenação de produtos performática e acessível (teclado + touch).                     |
| Auth            | **Auth.js (NextAuth v5)**                                                     | Credentials (e-mail/senha) + Google provider; sessão via JWT/cookie.                    |
| Hash de senha   | **bcrypt** ou **argon2**                                                      | Nunca armazenar senha em texto.                                                         |
| ORM             | **Drizzle ORM**                                                               | Tipado, leve, migrations versionadas, ótimo DX com Postgres.                            |
| Banco           | **PostgreSQL** (Neon / Vercel Postgres / Supabase)                            | Relacional, serverless-friendly.                                                        |
| Validação       | **Zod**                                                                       | Validação de formulários e payloads de API; infere tipos.                               |
| Forms           | **React Hook Form + Zod**                                                     | Performance e validação declarativa no admin.                                           |
| Parsing HTML    | **cheerio** (+ leitura de JSON-LD)                                            | Extrair `og:*` e `schema.org/Product` do HTML da C&A.                                   |
| Imagens         | **next/image** + `remotePatterns`                                             | Otimização e lazy-loading; opção de re-hospedar (ver §7).                               |
| Estado servidor | **RSC + Server Actions** (ou TanStack Query se precisar de client-state rico) | Menos client JS na página pública.                                                      |
| Deploy          | **Vercel**                                                                    | ISR, edge, integração com Postgres serverless.                                          |

> Observação de versões: usar sempre a versão **estável mais recente** de Next.js e Auth.js no momento da implementação. A arquitetura acima vale para App Router + React Server Components independente do número exato da minor.

---

## 5. Modelo de dados

```
User ──< Live ──< Product
```

### `users`

| Campo         | Tipo          | Notas                                       |
| ------------- | ------------- | ------------------------------------------- |
| id            | uuid (pk)     |                                             |
| email         | text (unique) |                                             |
| name          | text          |                                             |
| handle        | text (unique) | slug público, ex.: `pambraga` → `/pambraga` |
| avatar_url    | text?         |                                             |
| password_hash | text?         | nulo quando login só por Google             |
| created_at    | timestamptz   |                                             |

### `lives`

| Campo                   | Tipo                      | Notas                                       |
| ----------------------- | ------------------------- | ------------------------------------------- |
| id                      | uuid (pk)                 |                                             |
| user_id                 | uuid (fk → users)         |                                             |
| title                   | text                      | ex.: "Live C&A · Pam Braga"                 |
| live_date               | date                      | data da live                                |
| live_time               | text?                     | horário, ex.: "20h"                         |
| cover_image_url         | text?                     | imagem de capa da live                      |
| instagram_url           | text?                     | link da live/perfil no Instagram            |
| slug                    | text                      | único por usuário; compõe a URL pública     |
| status                  | enum('draft','published') | default `draft`                             |
| published_at            | timestamptz?              |                                             |
| created_at / updated_at | timestamptz               |                                             |

> Constraint sugerida: índice único `(user_id, slug)`. Regra de negócio do MVP: **apenas uma live publicada por usuário por vez** (publicar uma despublica a anterior), já que a página pública mostra "a live publicada".

### `products`

| Campo       | Tipo              | Notas                                                              |
| ----------- | ----------------- | ------------------------------------------------------------------ |
| id          | uuid (pk)         |                                                                    |
| live_id     | uuid (fk → lives) |                                                                    |
| name        | text              |                                                                    |
| category    | text              | livre; filtros públicos são gerados a partir dos valores distintos |
| size        | text?             | tamanho (P/M/G ou numérico)                                        |
| color       | text?             | cor                                                                |
| image_url   | text              | extraída do link ou enviada manualmente                            |
| product_url | text              | link de afiliado da C&A                                            |
| price       | numeric?          | opcional (se conseguir extrair)                                    |
| position    | integer           | ordem na vitrine (reordenação)                                     |
| source_url  | text?             | URL original colada, antes de resolver redirect                    |
| created_at  | timestamptz       |                                                                    |

**Sobre categorias:** não há tabela de categorias no MVP. A categoria é um campo livre por produto, e os filtros da página pública (`Tudo`, `Jaquetas`, `Blusas`, `Calças`...) são derivados em runtime dos valores distintos de `category` daquela live. Simples e flexível.

**Sobre reordenação:** usar `position` (inteiro). Ao arrastar, recalcular as posições afetadas. Alternativa para evitar reescrever todas as linhas: posições fracionárias (ex.: 1000, 2000, 3000 e inserir no "meio" com 1500). Para um MVP, reindexar tudo na ordem está ótimo.

---

## 6. Fluxos principais

### 6.1 Cadastro / Login

- **E-mail + senha:** valida com Zod → `bcrypt.hash` → cria `user`. Login compara hash.
- **Google:** provider do Auth.js. No primeiro login, cria `user` com `password_hash = null` e gera um `handle` sugerido a partir do nome (editável depois).
- **Account linking:** se o e-mail do Google já existir como conta de senha, decidir política (vincular automaticamente vs. exigir login por senha primeiro). Para o MVP, manter simples e documentar.

### 6.2 Criar e editar live

1. Criadora clica em "Nova live".
2. Preenche título, loja, data, horário (form com React Hook Form + Zod).
3. `slug` gerado automaticamente a partir do título (com opção de editar).
4. Salva como `draft`.

### 6.3 Colar link do produto (o coração do produto) ⭐

Ver §7 — esse fluxo merece seção própria.

### 6.4 Reordenar produtos

- Lista de produtos com `dnd-kit`. Ao soltar, dispara Server Action que persiste as novas `position`.

### 6.5 Publicar / despublicar

- Publicar: seta `status='published'`, `published_at=now()`, despublica outras lives do usuário (regra do MVP), e dispara `revalidatePath('/[handle]')` para regenerar a página pública.
- Despublicar: `status='draft'` + revalidação (página pública passa a mostrar estado vazio ou 404, ver §8).

### 6.6 Página pública

- `GET /[handle]` resolve o usuário pelo handle, busca a live publicada e seus produtos ordenados por `position`.
- Renderização estática (ISR), revalidada on-demand na publicação.

---

## 7. Recurso "colar link" — extração de dados do produto (C&A)

> **Esta é a parte de maior risco técnico do projeto. Leia com atenção antes de implementar.**

### O problema real

A C&A **não expõe uma API pública oficial de catálogo** para terceiros. Os links que a criadora cola são **links de afiliado** (`minhacea.cea.com.br/?lcea=CÓDIGO`) que **redirecionam** para a página do produto na plataforma de social selling. Portanto, "buscar pela API da C&A" significa, na prática, **extrair metadados do HTML da página de destino**.

### Estratégia (do mais leve para o mais pesado)

**Etapa 1 — Resolver o redirect (server-side)**

```
POST /api/products/extract  { url }
→ fetch(url, { redirect: 'follow' })  // segue o redirect do link de afiliado
→ guarda a URL final (página real do produto)
```

**Etapa 2 — Parsear o HTML**
Na resposta HTML, tentar nesta ordem:

1. **JSON-LD** (`<script type="application/ld+json">`) com `@type: "Product"` → `name`, `image`, `offers.price`, `color`. É a fonte mais rica e estável quando existe.
2. **Open Graph** (`og:title`, `og:image`, `product:price:amount`) como fallback.
3. **Meta básicos** (`<title>`, primeira `<img>` relevante) como último recurso.

```ts
// pseudo-implementação
const html = await (await fetch(finalUrl)).text();
const $ = cheerio.load(html);

const jsonLd = parseJsonLd($); // procura @type Product
const og = parseOpenGraph($);

return {
  name: jsonLd?.name ?? og?.title ?? null,
  imageUrl: jsonLd?.image ?? og?.image ?? null,
  price: jsonLd?.price ?? og?.price ?? null,
  color: jsonLd?.color ?? null,
  finalUrl,
};
```

**Etapa 3 (contingência) — Headless browser**
Se a C&A renderizar os dados via JavaScript (SPA), o `fetch` simples retorna HTML vazio de conteúdo. Nesse caso, seria necessário um headless browser (Playwright / `@sparticuz/chromium` para rodar serverless na Vercel). **Isso é pesado, mais lento e mais caro.** Tratar como contingência, não como caminho principal.

### Fallback manual é OBRIGATÓRIO

Independente de a extração funcionar, a UI deve:

- Pré-preencher nome e imagem quando conseguir.
- **Sempre** permitir editar tudo manualmente e fazer upload de imagem própria.
- Nunca travar o cadastro se a extração falhar.

Isso protege o produto contra mudanças no site da C&A e contra produtos que não retornam metadados.

### Tratamento de imagem

- **Opção A (recomendada p/ MVP):** usar a URL da imagem da C&A direto via `next/image` com `remotePatterns` apontando para os domínios de imagem da C&A. Simples.
- **Risco:** hotlink protection ou imagens que expiram. Se acontecer, ir para Opção B.
- **Opção B:** baixar a imagem e re-hospedar em **Vercel Blob** ou **Cloudinary** no momento do cadastro. Mais robusto, custa storage.

### Cache

Cachear o resultado da extração por URL (em tabela ou KV) para não refazer o request a cada edição.

### Cuidados legais/éticos

Extração de metadados de páginas públicas é comum, mas vale: respeitar `robots.txt`, não sobrecarregar o servidor da C&A (rate limit do seu lado), e revisar os termos de uso do programa de afiliados. Documentar essa decisão.

---

## 8. Página pública (mobile-first)

### Estrutura (espelhando a referência)

1. **Header da live**: título, data · horário · loja, status ("Ao vivo no Instagram").
2. **Vitrine**: subtítulo + contador ("18 de 18").
3. **Barra de filtros de categoria** (sticky no topo ao rolar): `Tudo` + categorias distintas.
4. **Grid de produtos**: card com imagem, badge de categoria, índice, nome, tamanho, cor e CTA "VER NA C&A →" (abre o link de afiliado em nova aba).
5. **Bloco "marca uma amiga"**: compartilhar no WhatsApp (`https://wa.me/?text=...`) + copiar link (Clipboard API).
6. **Footer**: handle da criadora, info da campanha.

### Mobile-first / performance

- Tailwind já é mobile-first: estilizar para a menor largura primeiro, escalar com `sm:`/`md:`.
- Grid de 2 colunas no mobile, 3–4 no desktop.
- `next/image` com `loading="lazy"`, `sizes` corretos e `priority` só na primeira dobra.
- Página estática (ISR) → quase zero JS além do filtro de categorias (que pode ser client component isolado).
- Lighthouse como meta: performance e acessibilidade altos (público mobile com conexão variável).

### SEO / compartilhamento

- `generateMetadata` por live: `title`, `description`, **Open Graph** (`og:title`, `og:image`, `og:description`) para o preview bonito no Instagram/WhatsApp.
- A `og:image` pode ser a capa da live ou gerada dinamicamente (Next.js OG Image / `@vercel/og`).

### Estados

- Handle inexistente → `404`.
- Handle existe mas sem live publicada → página "em breve" amigável (não 404 cru).

---

## Fase 4 — Página pública da live

A vitrine pública fica em `/{handle}` e não exige login. Ela resolve a criadora
por `users.handle`, busca apenas a live `published` e lista os produtos por
`position ASC` com uma query própria em
`src/server/db/queries/public-showcase.ts`, selecionando somente campos públicos.

### Experiência pública

- Cabeçalho mobile-first com avatar/iniciais, nome, `@handle`, título, subtítulo,
  loja, data, horário e plataforma quando existirem.
- Filtros de categoria derivados dos produtos, sem tabela de categorias. O
  filtro é client-side, com chips roláveis, contador dinâmico e estado vazio por
  categoria.
- Cards públicos com imagem em proporção fixa, fallback de imagem, nome,
  categoria, tamanho/cor opcionais, preço em BRL e link externo seguro
  (`target="_blank"` + `rel="noopener noreferrer sponsored"`).
- Compartilhamento com WhatsApp (`https://wa.me/?text=...`) e cópia de link via
  Clipboard API com feedback acessível.
- Estados amigáveis para handle inexistente, criadora sem live publicada, live
  publicada sem produtos, loading e erro.

### Metadata, OG e cache

- `generateMetadata` monta title, description, canonical, Open Graph e Twitter
  card a partir da criadora, live e primeira imagem de produto disponível.
- `opengraph-image.tsx` gera uma imagem OG dinâmica simples com fallback visual.
- A query pública usa cache com tags `showcase:{handle}` e `live:{liveId}`.
- `src/server/cache/showcase.ts` centraliza tags e revalidação.
- Server Actions revalidam `/{handle}` e as tags quando publicação,
  despublicação, edição de live publicada ou alteração de produtos publicados
  afetam a vitrine.
- Imagens de produto continuam em `<img>` com fallback, sem wildcard remoto no
  `next.config`, para evitar abrir o otimizador de imagem a URLs arbitrárias.

### Testes da fase

Cobertura focada em:

- derivação e filtro de categorias;
- card público e atributos de link externo;
- compartilhamento/Clipboard;
- helpers de cache/revalidação;
- query pública sem depender do Neon real.

Comandos:

```bash
npm test -- --run src/components/public src/server/cache/showcase.test.ts src/server/db/queries/public-showcase.test.ts
npm run typecheck
npm run lint
```

---

## 9. Estrutura de pastas (sugestão)

```
src/
├── app/
│   ├── (public)/
│   │   └── [handle]/
│   │       ├── page.tsx          # página pública da live (ISR)
│   │       └── not-found.tsx
│   ├── admin/
│   │   ├── layout.tsx            # guard de autenticação
│   │   ├── page.tsx              # lista de lives
│   │   └── lives/
│   │       └── [liveId]/
│   │           └── page.tsx      # editor da live (page builder)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       └── products/extract/route.ts   # extração de metadados do link
├── components/
│   ├── ui/                       # shadcn/ui
│   ├── admin/                    # builder, ProductForm, SortableList...
│   └── public/                   # ProductCard, CategoryFilter, ShareBar...
├── server/
│   ├── actions/                  # Server Actions (lives, products)
│   ├── db/                       # drizzle schema + client
│   └── lib/extract/              # parser JSON-LD / OG / cheerio
├── lib/
│   ├── auth.ts                   # config Auth.js
│   ├── validations/              # schemas Zod
│   └── utils.ts
└── middleware.ts                 # protege /admin
```

---

## 10. Segurança e qualidade

- **Autorização**: toda Server Action que mexe em `lives`/`products` valida que o recurso pertence ao usuário da sessão. Nunca confiar em IDs vindos do cliente sem checar `user_id`.
- **Middleware**: protege `/admin/*`; redireciona não autenticados para login.
- **Validação**: Zod em toda entrada (forms e API). Sanitizar texto exibido na página pública.
- **Senhas**: bcrypt/argon2, nunca logar, nunca retornar hash.
- **SSRF na extração de link**: a rota `extract` faz `fetch` de URL fornecida pelo usuário → validar que é http(s), bloquear IPs internos/localhost, timeout e limite de tamanho de resposta. **Importante.**
- **Rate limiting** na rota de extração.
- **Variáveis de ambiente** (`.env`): `DATABASE_URL`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, (opcional) `BLOB_READ_WRITE_TOKEN`.

---

## 11. Roadmap de implementação (fases para o Claude Code)

Sugestão de ordem para construir incrementalmente, cada fase entregável e testável:

**Fase 0 — Setup**

- Next.js + TS + Tailwind + shadcn/ui.
- Drizzle + Postgres, schema inicial e primeira migration.
- Auth.js (Credentials + Google), telas de login/cadastro, middleware.

**Fase 1 — CRUD de lives**

- Listar, criar, editar (título, data, horário, loja), gerar slug.
- Publicar/despublicar (sem extração ainda).

**Fase 2 — Produtos (manual primeiro)**

- Adicionar/editar/remover produto com todos os campos preenchidos à mão.
- Reordenação com dnd-kit.

**Fase 3 — Extração de link** ⭐

- Rota `extract`: resolver redirect + JSON-LD/OG via cheerio.
- Integrar no ProductForm (pré-preenche, com fallback manual).
- Cache + tratamento de erro + proteções de SSRF.

**Fase 4 — Página pública**

- Layout mobile-first espelhando a referência.
- Filtro de categorias, grid, share bar.
- ISR + revalidação on-demand na publicação.
- `generateMetadata` + OG image.

**Fase 5 — Polimento**

- Estados vazios, 404, loading, validações, acessibilidade.
- Lighthouse / responsividade fina.

---

## 12. Riscos e premissas

| Risco                                             | Impacto                        | Mitigação                                                  |
| ------------------------------------------------- | ------------------------------ | ---------------------------------------------------------- |
| C&A muda markup / não tem JSON-LD                 | Extração quebra                | Fallback manual obrigatório; cobrir JSON-LD + OG + meta.   |
| Página da C&A é JS-rendered                       | `fetch` simples não pega dados | Contingência com headless browser (Playwright serverless). |
| Imagens da C&A com hotlink protection / expiração | Fotos quebram na vitrine       | Re-hospedar em Blob/Cloudinary no cadastro.                |
| Termos de uso do afiliado                         | Legal                          | Revisar termos; respeitar robots.txt e rate limit.         |
| SSRF na rota de extração                          | Segurança                      | Validar URL, bloquear rede interna, timeout.               |

**Premissas do MVP:**

- Uma live publicada por criadora por vez.
- Foco exclusivo em C&A na v1 (extração genérica fica para v2).
- Página pública é somente leitura, estática/ISR.

---

_Documento vivo — ajustar conforme decisões de implementação no Claude Code._
