# Documentação — projeto HM Módulos

Índice dos documentos. Estado do projeto: **ESTUDO / MAPEAMENTO** — reunindo
o escopo completo antes de construir.

## Comece por aqui

- **`base-conhecimento.md`** — memória do projeto. Todo o conhecimento técnico
  levantado nos vídeos, as decisões já tomadas e os limites. É o primeiro
  documento a ler ao retomar o projeto.
- **`descobertas-basalt.md`** — mapa dos primeiros dumps reais (Basalt): onde
  ficam VIN e KM no BCCM e no airbag, como estão codificados e o que falta para
  gravar. É a semente do primeiro perfil de módulo.
- **`pendencias.md`** — perguntas em aberto e o que trava cada etapa.
- **`precos-mercado.md`** — referência de preços do mercado e modelos de cobrança do desenvolvimento.

## Documentos de apresentação (HTML, para mostrar ao cliente)

- `escopo.html` — escopo v0.1: as quatro operações de arquivo, matriz de
  permissões, registro encadeado, integração com a OS e as fases de entrega.
- `funcionalidades.html` — catálogo completo (92 funcionalidades em 15 áreas),
  cada uma marcada por fase (F1–F4 / EST) e por núcleo/secundária.
- `seguranca-estrutura.html` — segurança, estrutura (arquitetura) e confiabilidade:
  proteção do arquivo, registro inviolável, falha segura, LGPD e proteção do produto.

## O que trava a entrega (resumo — detalhe em `pendencias.md`)

- **P1** — dumps reais de BCCM/airbag com KM e VIN conhecidos. Sem eles não há
  perfil, e sem perfil o software não lê nada. Também decide a viabilidade do
  eixo Chave.
- **P2** — definir se o SistemaHMMecanica existe em outro lugar (e qual schema)
  ou se o modelo da Ordem de Serviço é definido aqui.

## Regra de dados

Dumps de veículo carregam VIN e quilometragem reais de cliente. **Nunca**
entram no repositório nem são colados no chat. `.gitignore` bloqueia `.bin`,
`.eep`, `.hex` e a pasta `/dumps/`.
