# Referência — iProg Pro (concorrente e ferramental)

> Levantamento sobre o iProg Pro (iprog.pro), o programador que o mecânico
> usa. Serve de duas coisas: entender o concorrente e ter um **checklist de
> completude** do que uma ferramenta desse mercado faz. 28 ago 2026.

## O que é o iProg Pro

Programador automotivo profissional, **modular** e **baseado em scripts**.
Não é um scanner OBD comum — foca em **ler/escrever memória** (EEPROM, MCU) e
programação profunda de módulos. Origem russa, fórum grande e ativo.

**Ponto-chave da arquitetura:** a cobertura vem de **scripts** (`.ipp` + Lua)
que são **comprados ou desenvolvidos separadamente** e adicionados ao software.
O IDE oficial para criar scripts é o **Emvima** (liberado só para donos de
hardware original). A linguagem é parecida com C, com Lua para cálculos.

> Isto **valida a nossa arquitetura de perfis**: eles fazem "um script por
> módulo", nós fazemos "um perfil por módulo". Mesma filosofia. Módulo novo =
> item novo, sem reescrever o programa.

## Como ele se encaixa no NOSSO fluxo (não competimos com o hardware)

O iProg é o **hardware que lê e grava** o chip (via adaptadores EEPROM, BENCH,
BDM, CAN, K-Line, etc.). Nosso software é o **cérebro do arquivo**. O fluxo de
bancada que já desenhamos encaixa perfeito:

```
iProg LÊ o chip → arquivo .bin → NOSSO software conserta → iProg GRAVA
```

Ou seja: o mecânico continua usando o iProg (ou clone) como programador; a
nossa ferramenta entra no meio, produzindo o `.bin` corrigido, com registro e
laudo — o que o iProg puro não dá.

## Checklist de completude — funções do iProg × nosso escopo

| Função do iProg | Temos no escopo? | Observação |
| --- | --- | --- |
| Correção de odômetro (KM) | ✅ núcleo | nosso eixo principal |
| Airbag: ler/apagar DTC, reparo de CFG | ✅ (parcial) | ver flag abaixo sobre crash data |
| Airbag: apagar **crash data** | ⚠️ **fora por segurança** | apagar sem reparo físico = risco de vida (nosso limite) |
| IMMO / chaves / transponder | 🔶 área 15 "a estudar" | mesmo eixo que o vídeo 2 |
| Extração de PIN code (de dump/ABS) | 🔶 candidato | legítimo para trabalho de chave; a estudar |
| Ler/escrever EEPROM e MCU | ⛔ é o **hardware** (iProg), não nosso software | nós tratamos o arquivo, não o chip |
| Rádio / multimídia: desbloqueio, reset | 🆕 **não temos** | possível adição; avaliar demanda |
| ECU: IMMO OFF | ⚠️ zona cinza | desliga antifurto; avaliar caso a caso |
| ECU: **DPF OFF** (remoção de filtro) | ⚠️ **flag legal** | anula controle de emissão; ilegal para uso em via em muitos lugares |
| Calculadoras diversas (conversões) | ✅ fácil | ex.: milhas→km, checksum |
| Conversão milhas → km | ✅ candidato simples | útil e limpo |

Legenda: ✅ temos · 🔶 a estudar · 🆕 ideia nova · ⚠️/⛔ flag ou fora de escopo.

## Leituras estratégicas

1. **A cobertura do iProg depende de existir um script para o módulo.** Para os
   PSA novos (C3/Basalt BCCM), o script pode **não existir ainda** — reforça a
   escassez e o nicho. Vale o mecânico confirmar: existe script iProg que faz a
   KM desses carros? Se não, é exatamente o nosso espaço.

2. **Não competimos com o hardware do iProg — complementamos.** Isso é bom: não
   precisamos construir programador nem adaptadores. Usamos o que ele já tem.

3. **Nosso diferencial permanece o mesmo:** registro encadeado, laudo para o
   cliente, vínculo com OS, e foco nos PSA novos. O iProg é genérico e forte,
   mas não entrega esse "pacote de oficina" nem cobre esses carros (a confirmar).

4. **"Ser completo" tem um limite que a gente já definiu:** completude não
   inclui apagar crash data sem reparo, nem DPF OFF (emissão). Essas funções o
   iProg tem, mas carregam flag de segurança/lei — mesma linha que já traçamos
   para a KM. Completo em serviço legítimo, não em tudo.

## Pergunta a levar ao mecânico

- Existe script/calculadora iProg que faça a correção de KM do C3/Basalt novo?
  (Se não existir, confirma nosso nicho. Se existir, entender por que ele
  ainda quer a nossa — provavelmente pelo registro/laudo e por não depender de
  comprar script a script.)
