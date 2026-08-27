# Ferramenta de sincronismo BCCM / airbag

Aplicativo de bancada para leitura, diagnostico, reparo e sincronizacao de
arquivos de memoria (dumps) dos modulos **BCCM** e **airbag** dos Citroen
C3, Aircross e Basalt.

Nesses veiculos o BCCM (body computer + BSI + painel em um modulo so)
trabalha casado com o modulo de airbag, e o casamento e feito por **VIN +
quilometragem**. Quando um dos dois diverge — colisao, alagamento ou troca
de modulo — o painel apaga a quilometragem e passa a exibir erro.

## Principio de projeto

A ferramenta escreve quilometragem em modulo de veiculo. Isso e uma
operacao legitima de reparo e e tambem o mecanismo da fraude de hodometro.
A diferenca entre as duas esta no registro e na forma da operacao, nao na
intencao do operador.

Por isso nao existe um campo generico de "definir quilometragem". Sao
quatro operacoes distintas e, em tres delas, **o operador nao digita numero
nenhum** — o valor e preservado ou copiado do outro modulo do mesmo carro:

| Operacao | De onde vem o valor | Justificativa |
| --- | --- | --- |
| Diagnosticar | nao altera nada | nao |
| Reparar arquivo | de lugar nenhum; preserva KM e VIN | nao |
| Sincronizar modulos | do outro dump do mesmo veiculo | motivo |
| Restaurar KM documentada | digitado pelo operador | completa |

A quarta e restrita ao responsavel tecnico e existe para o caso real de
substituicao de modulo, onde nao ha um segundo modulo de onde copiar.

Escopo completo em [`docs/escopo.html`](docs/escopo.html).

## Estado atual

Fase 1 iniciada. O nucleo e JavaScript puro, sem dependencias, testavel
fora da interface.

- `src/core/codec.js` — leitura e escrita de campos no dump: endianness,
  complemento de 1, XOR, BCD, fator de escala, replicas espelhadas e VIN.
- `src/core/checksum.js` — sete algoritmos (`sum8`, `sum16`, `sum32`,
  `sum16le`, `xor8`, `sum8_neg`, `crc16ccitt`, `crc16modbus`, `crc32`),
  conferidos contra os vetores de teste padrao.

Pendente: perfis de modulo, motor de dump, sincronizacao, registro de
operacoes e interface.

## Aviso

Alterar quilometragem sem vinculo com reparo documentado e fraude. Toda
operacao desta ferramenta gera registro encadeado por hash, e o registro
nao e apagavel por nenhum perfil de usuario.

## Desenvolvimento

```sh
npm install
npm test      # testes do nucleo
npm start     # aplicativo (Electron)
```

Dumps de veiculo nao entram no repositorio — ver `.gitignore`.
