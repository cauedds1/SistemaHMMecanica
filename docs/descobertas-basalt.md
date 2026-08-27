# Descobertas dos dumps reais — Basalt (BCCM + airbag)

> Análise dos primeiros dumps reais recebidos (27 ago 2026). É a semente do
> primeiro perfil de módulo. **Confirmado por comparação diferencial** entre
> dumps do mesmo módulo com quilometragens diferentes.
>
> Dados de veículo reais (VIN, KM) não ficam aqui em cru — o VIN de exemplo
> aparece mascarado. Os dumps em si nunca entram no repositório.

## Material analisado

Quatro dumps do **mesmo veículo** (Citroën Basalt), VIN `935CPFCA5SB5569**`:

| Papel | Módulo | Tamanho | KM |
| --- | --- | --- | --- |
| Painel A | BCCM / painel (DFRASH) | 64 KB | 25.100 |
| Painel B | BCCM / painel (DFRASH) | 64 KB | 85.219 |
| Airbag A | Airbag | 32 KB | 25.100 |
| Airbag B | Airbag | 32 KB | ~85.2xx (original) |

Ter o mesmo módulo em duas quilometragens permitiu localizar os campos por
diferença (o que muda entre os dois É o que depende da KM).

- Painel (BCCM): 64 KB → compatível com EEPROM **95512**.
- Airbag: 32 KB → compatível com EEPROM **95256**.

## BCCM / painel — mapa parcial confirmado

### VIN (chassi)
- **Offset `0x0B00`**, 17 bytes ASCII. Idêntico nos dois painéis. ✓
- Perto dele: string `"BCCM"` (~`0x0AC1`), part numbers `"4441811002"` (`0x1BC3`)
  e `"C3125011"` (`0x1BF2`) — candidatos a identificação/assinatura do perfil.

### Quilometragem
- **Codificação: KM × 10, little-endian** (unidade de 100 m).
  - Painel 25.100 → grava `251000` (`78 D4 03`).
  - Painel 85.219 → grava `852199` (display trunca 852199/10 = 85.219). ✓
- Guardada em **anel de registros** (wear leveling), não em posição única.
  - Registro-âncora observado em **`0x4BA0`**, com **cópia espelhada em `0x4BB0`**.
  - Cópia adicional relacionada em `0x4BC0`.
  - Estrutura do registro (12 bytes): `[KM×10 : 3-4 b LE][checksum : 4 b][?? 2 b][contador : 2 b]`.
  - O **checksum de 4 bytes muda junto com a KM** (25.100 → `c170bacc`;
    85.219 → `adb16baf`), e o contador também (335 → 244).
  - Há um **segundo banco do anel** espelhando a mesma faixa por volta de
    `0x97E0–0x9B70` (o conteúdo dos registros bate com o bloco `0x4B90+`).

### Pendência crítica do BCCM
Ler KM: **resolvido**. Gravar KM: **falta quebrar o checksum de 4 bytes por
registro**. Sem ele o painel rejeita o arquivo. Para gravar uma KM nova é
preciso reescrever todos os registros do anel (os dois bancos) e recalcular o
checksum de cada um. Atacar com os pares casados (registro + checksum) dos
dumps disponíveis. **É a peça que separa "só leitura" de "leitura e escrita".**

## Airbag — mapa parcial confirmado

### VIN (chassi)
- **Offset `0x4C5E`**, 17 bytes ASCII (precedido de um byte `{`). Idêntico nos
  dois airbags. ✓
- Outras strings: `"5E1Y000008468"` (`0x451E`), `"RBG"` (`0x5687`),
  números longos em `0x3E46` e `0x4856` — candidatos a assinatura.

### Quilometragem
- **Codificação: valor cru (sem ×10), 2 bytes little-endian.**
  - Airbag 25.100 → grava `0C 62` (= `0x620C` = 25100). ✓
- Também em **registros repetidos/espelhados**, cada um precedido de um
  **hash de 4 bytes** que muda com a KM (no airbag A, KM constante → hash
  constante `d2c61580`).
- No airbag B, os registros carregam um contador de 3 bytes crescente
  (`?? 4C 01`), padrão de anel igual ao do painel.

### Pendência crítica do airbag
Mesma do painel: ler resolvido; gravar depende de quebrar o hash de 4 bytes
por registro.

## O que isto significa para o produto

- O **primeiro perfil real** (Basalt BCCM + airbag) já existe em parte:
  detecção por tamanho, leitura de VIN e de KM estão mapeadas e confirmadas.
- A operação **Diagnosticar** (só leitura) já é construível para o Basalt.
- As operações que **gravam** (Reparar, Sincronizar, Restaurar KM) dependem de
  resolver o checksum-por-registro. É o próximo trabalho técnico.
- O padrão observado (KM×10 no painel, anel de registros com checksum próprio,
  bancos espelhados) é típico de Stellantis/PSA e deve se repetir no C3 e no
  Aircross — a confirmar quando chegarem dumps desses.

## Próximos passos técnicos

1. Quebrar o checksum de 4 bytes por registro (painel e airbag).
2. Confirmar os limites exatos de cada faixa de checksum e dos dois bancos.
3. Formalizar o perfil `basalt-bccm` e `basalt-airbag` no formato declarativo.
4. Pedir mais pares (mesmos módulos, KMs diferentes) para validar o checksum.
5. Repetir para C3 e Aircross quando houver dumps.
