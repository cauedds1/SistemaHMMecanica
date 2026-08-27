# Base de conhecimento — projeto HM Módulos

> Documento de memória do projeto. Reúne tudo que foi levantado no estudo,
> para que na hora de construir nada se perca. Atualizado a cada nova
> informação. **Estado atual: ESTUDO / MAPEAMENTO — nada de código sendo
> construído até o escopo fechar.**

Última atualização: 27 ago 2026

---

## 1. O que é o projeto

Ferramenta de bancada para reparar e sincronizar os arquivos de memória
(dumps) dos módulos eletrônicos dos Citroën **C3, Aircross e Basalt** da
geração atual (2023 em diante). Cliente final: uma oficina (HM Mecânica).
O desenvolvimento é feito para o mecânico, que será quem opera.

A referência é uma ferramenta de terceiro (marca "Enigma"), demonstrada em
dois vídeos. **"Enigma" é marca de terceiro — não usar no produto.**

---

## 2. Conhecimento técnico levantado

### 2.1 Os módulos do carro

- **BCCM** — concentra em um módulo só o que antes era body computer + BSI +
  painel de instrumentos. É o módulo central desses carros.
- **Módulo de airbag** — guarda crash data e trabalha casado com o BCCM.
- **Módulo de injeção** — participa do sistema antifurto (imobilizador).
- **Transponder / chave** — autentica com o sistema para liberar a partida.

### 2.2 Os "casamentos" entre módulos (o cerne do serviço)

1. **BCCM ↔ airbag**, por **VIN + quilometragem**.
   Se um dos dois diverge (colisão, água, troca de módulo), o painel apaga a
   quilometragem e mostra erro. Confirmado nos dois vídeos (desligar o airbag
   → painel dá erro em vez de mostrar KM).

2. **Chave ↔ BSI/BCCM ↔ injeção**, pelo sistema **imobilizador (antifurto)**.
   Sem o transponder casado, o LED fica "procurando", os bicos não acionam e o
   carro não pega. Com a chave casada, o LED pisca alternado e libera a
   partida. Demonstrado no segundo vídeo.

### 2.3 Como os dados ficam gravados no dump

- A **quilometragem** raramente está gravada "limpa". Pode estar:
  invertida (endianness), em complemento de 1, com XOR de chave fixa, em BCD,
  ou com fator de escala. Costuma ter **réplicas espelhadas** (o mesmo valor
  em 2–3 lugares dentro do módulo).
- Cada bloco alterado tem um **checksum** que precisa ser recalculado para o
  módulo aceitar o arquivo. Algoritmo varia por fabricante.
- O **VIN** são 17 caracteres ASCII (sem as letras I, O, Q).

### 2.4 Fluxo de bancada (como o serviço acontece de verdade)

```
CARRO → remove módulos → programador LÊ o chip → arquivo .bin
                                                     ↓
                                          NOSSO SOFTWARE
                                   (diagnostica, sincroniza, salva)
                                                     ↓
CARRO ← reinstala módulos ← programador GRAVA ← arquivo .bin corrigido
```

- O **nosso software nunca toca no carro** (nas fases 1 e 2). Ele edita
  arquivo. Ler e gravar é feito com programador de bancada que o mecânico já
  usa: **Dash Tool, XProg, Orange5** (o vídeo usa Dash Tool).
- Onde os dados moram dentro do módulo (EEPROM 95xxx separada, flash do MCU,
  ou ferramenta dedicada) define qual equipamento é preciso — **a confirmar
  com módulo real**.

### 2.5 Limite importante — a KM não vive só nesses módulos

A quilometragem também aparece em motor, ABS, câmbio, e em registros
externos (telemetria da montadora, concessionária, vistoria, seguradora).
Sincronizar BCCM+airbag resolve o erro no painel, mas **não deixa o carro
"limpo" numa leitura completa de scanner**. Num reparo honesto o carro fica
consistente; numa fraude, os outros módulos entregam a divergência. Isso é
argumento a favor do laudo e da futura leitura multi-módulo (Fase 3).

---

## 3. Os eixos do produto (o que ele vai fazer)

O produto tem **três eixos técnicos**, todos catalogados:

| Eixo | O que é | Estado |
| --- | --- | --- |
| **Arquivo** | KM, VIN, airbag, reparo, troca de painel | Construir — escopado |
| **Chave / imobilizador** | Casar chave, sair do imobilizado, injeção de sucata | **A estudar** — precisa módulo real, talvez hardware |
| **OBD** | Ler pela tomada (F3) e gravar pela tomada (F4) | F3 viável; F4 condicional (seed/key) |

Decisão do cliente (27 ago): **incluir tudo no escopo** — "melhor sobrar do
que faltar". No front cada eixo vira uma aba separada, para não poluir a tela.

Detalhe completo das 92 funcionalidades em `funcionalidades.html` (área por
área, com fase e núcleo/secundária/a-estudar).

---

## 4. Decisões já tomadas

- **Plataforma:** Electron empacotado para Windows (Tauri descartado — não
  compila no ambiente; webkit2gtk ausente).
- **Núcleo:** JavaScript puro, sem dependências, testável fora da interface.
- **Perfis declarativos:** cada módulo é um arquivo de perfil (JSON), não
  código. Módulo novo = perfil novo. É o que evita release por ECU.
- **Quatro operações de arquivo**, sem campo genérico de "definir KM". Em três
  o operador não digita número. Ver README raiz.
- **Registro encadeado por hash, não apagável por ninguém** — nem pelo dono.
- **Original nunca sobrescrito**; toda saída é arquivo novo + backup + hash.
- **Front por abas, um eixo por aba.**
- **Vínculo com OS obrigatório** (mas o SistemaHMMecanica está vazio hoje —
  ver P2).

### Segurança, estrutura e confiabilidade (detalhe em `seguranca-estrutura.html`)

- **Princípio:** na dúvida o software **para**, nunca grava lixo. Módulo
  queimado por arquivo ruim é o pior resultado.
- **Arquivo:** nunca sobrescrever original; backup automático; SHA-256 de
  entrada e saída; desfazer sempre possível.
- **Antes de gravar:** detectar leitura ruim (tamanho errado, bytes vazios,
  cópias internas discordantes); prévia; validar checksums e coerência.
- **Depois de gravar:** conferência por hash (releitura do módulo == arquivo
  gerado).
- **Confiança:** testes automáticos do núcleo + testes contra dumps reais
  (ler 25.100 tem que dar 25.100); operação tudo-ou-nada; log técnico de erro.
- **Acesso:** login por operador, papéis, senha com hash forte (Argon2/bcrypt),
  bloqueio após tentativas.
- **Registro:** cadeia de hash, append-only, não apagável nem pelo dono.
- **Estrutura:** camadas isoladas (núcleo sem dependências / perfis JSON /
  banco SQLite local / adaptadores / UI Electron com processos separados).
- **LGPD:** VIN + KM + cliente = dado pessoal. Local, finalidade de reparo,
  retenção definida, dumps nunca no repositório.
- **Produto:** perfis assinados e embutidos; licenciamento por instalação
  (liga com o modelo de cobrança — sem isso não há mensalidade sustentável).

### Limites de construção (fora de escopo por finalidade)

Estes não serão construídos, e o motivo é técnico/de finalidade, não moral:

- Apagar crash data de airbag sem reparo físico (risco de vida).
- Gravar VIN arbitrário (diferente de sincronizar o VIN do próprio carro).
- Modo lote / atalho de zerar KM / operar sem OS.
- Apagar do módulo a marca de que a KM foi alterada (flag de plausibilidade).
- Distribuir os perfis como arquivo solto.

Nada fora do veículo (servidor da montadora, papel) — impossível por natureza.

---

## 5. Componentes já escritos (núcleo, Fase 1)

| Arquivo | O que faz | Estado |
| --- | --- | --- |
| `src/core/codec.js` | ler/gravar campos: endianness, complemento, XOR, BCD, fator, réplicas, VIN | pronto, sem testes ainda |
| `src/core/checksum.js` | 9 algoritmos de checksum (sum8/16/32, sum16le, xor8, sum8_neg, crc16ccitt, crc16modbus, crc32) | pronto, CRCs conferidos contra vetores padrão |

Nota: o `codec.js` já cobre o padrão de KM do Basalt (fator ×10, LE, réplicas).
O checksum-por-registro do anel de KM ainda não está entre os algoritmos — é
o que falta descobrir (ver `docs/descobertas-basalt.md`).

Falta do núcleo: perfis, detecção de módulo, motor de dump, sincronização,
registro, laudo, permissões, integração OS, interface.

---

## 6. O que destrava tudo

Os três eixos travam no **mesmo ponto: dumps reais**.

- Sem dumps, não há como levantar os perfis (nem KM/VIN, nem antifurto).
- 5 ou 6 pares de BCCM+airbag com KM e VIN conhecidos permitem começar.
- O mesmo módulo na bancada responde se o eixo Chave é viável.

**Pedido concreto ao mecânico:** ler BCCM + airbag (e, se der, injeção) de
alguns C3/Aircross/Basalt que passarem, anotando KM e VIN de cada um.

### Estado da P1 — parcialmente resolvida (27 ago 2026)

Recebidos os **primeiros dumps reais**: 4 arquivos de um **Basalt** (2 painéis
BCCM em KMs diferentes, 2 airbags). Resultado da análise:

- **Leitura de VIN e KM: resolvida** para BCCM e airbag do Basalt. Offsets e
  codificação confirmados por comparação diferencial.
- **Gravação: falta uma peça** — o checksum de 4 bytes por registro do anel de
  quilometragem. É o próximo trabalho técnico.

Detalhe completo em `docs/descobertas-basalt.md`. Continua valendo o pedido de
**mais pares** (mesmo módulo, KMs diferentes) — é o que permite quebrar o
checksum e validar, e faltam dumps de C3 e Aircross.

> Dumps de veículo **nunca** entram no repositório nem são colados no chat —
> são dados reais de cliente (VIN, KM). `.gitignore` já bloqueia `.bin`,
> `.eep`, `.hex` e a pasta `/dumps/`.

---

## 7. Documentos do projeto

| Documento | Conteúdo |
| --- | --- |
| `README.md` (raiz) | visão geral, princípio de projeto, estado |
| `docs/escopo.html` | escopo v0.1: 4 operações, permissões, registro, OS, fases |
| `docs/funcionalidades.html` | catálogo das 92 funcionalidades por área/fase |
| `docs/base-conhecimento.md` | **este** — memória técnica e decisões |
| `docs/descobertas-basalt.md` | mapa dos dumps reais do Basalt (offsets, codificação, o que falta) |
| `docs/pendencias.md` | perguntas em aberto e o que trava cada uma |

Artifacts publicados (apresentação):
- Escopo: https://claude.ai/code/artifact/aaef9b40-16bd-4ee8-af63-24fd59da38d1
- Funcionalidades: https://claude.ai/code/artifact/9e71f9ef-f3b1-407a-821b-4853b18340a3
