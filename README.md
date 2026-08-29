# HM Módulos

Ferramenta de bancada para leitura, sincronização e reparo de arquivos de
memória (dumps) dos módulos **BCCM (painel)** e **airbag** dos Citroën C3,
Aircross e Basalt. Escrita para uma oficina que precisa provar o que fez, não
apenas fazer.

> Nome do produto ainda a definir (pendência P3). "Enigma" é marca de terceiro
> e não é usado.

## Onde começar

- **Documento-mestre e plano:** `docs/escopo.html` (o quê) e
  `docs/plano-construcao.html` (como e em que ordem).
- **Memória técnica:** `docs/base-conhecimento.md` e `docs/descobertas-basalt.md`.
- Índice completo dos documentos em `docs/README.md`.

## Como funciona

O software trabalha com **arquivos**, não com o carro. O mecânico lê o módulo
com o programador de bancada (iProg Pro, Dash Tool, etc.), corrige o arquivo
aqui, e grava de volta com o mesmo programador.

```
programador LÊ o chip → arquivo .bin → HM Módulos (diagnostica/corrige) → programador GRAVA
```

## Arquitetura

Camadas separadas — o motor (a parte perigosa) fica isolado e testável, longe
da interface.

| Pasta | O que é |
| --- | --- |
| `src/core/` | O **motor**, JavaScript puro e testável, sem interface: `codec.js` (ler/gravar campos), `checksum.js` (algoritmos), `perfil.js` (carrega e detecta perfis), `leitor.js` (diagnóstico), `registro.js` (caderninho encadeado por hash). |
| `profiles/` | Os **perfis** (mapas) de cada módulo, declarativos em JSON. Módulo novo = perfil novo. Hoje: `psa-bccm` (cobre C3/Aircross/Basalt) e `psa-airbag`. |
| `src/main/` | O **Electron**: `main.js` (processo principal + motor) e `preload.js` (ponte segura). Empacota o programa `.exe`. |
| `web/` | A **interface** (renderer). Hoje roda também como versão de teste no navegador. |
| `test/` | Os **testes automáticos** do motor. |

## Segurança e confiabilidade

- **Na dúvida, o software para** — nunca grava lixo. Perfil não reconhecido → recusa, não chuta.
- **O original é sagrado** — nunca sobrescrito; toda saída é arquivo novo, com hash SHA-256.
- **Registro em cadeia de hash**, não apagável.
- **Electron isolado**: `contextIsolation` ligado, `nodeIntegration` desligado, sandbox — a interface não toca no sistema.
- Detalhe em `docs/seguranca-estrutura.html`.

## Desenvolvimento

```sh
npm install
npm test      # testes do motor (headless)
npm start     # abre o programa (Electron) — precisa de ambiente com tela
npm run dist  # gera o instalador .exe (electron-builder) — no Windows
```

Dumps de veículo **nunca** entram no repositório (dados reais de cliente:
VIN, KM). Ver `.gitignore`.

## Estado

Etapa **E3** em andamento (ver `docs/plano-construcao.html`):

- **E0 — base e leitura:** feito. Motor testado (27 testes), leitura de VIN e
  KM do painel PSA confirmada.
- **E1 — código de proteção:** aguardando material do mecânico (antes/depois
  com KM conhecida). Trava a gravação.
- **E3 — programa instalável:** em andamento. Motor virou módulo testado;
  esqueleto Electron montado.
