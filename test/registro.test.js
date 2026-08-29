'use strict';

const test = require('node:test');
const assert = require('node:assert');
const reg = require('../src/core/registro');

function cadeiaExemplo() {
  const lista = [];
  lista.push(reg.novaEntrada(lista, { tipo: 'Diagnóstico', resumo: 'Painel VIN X · 25100 km', operador: 'João', os: '1024', ts: '2026-08-28T10:00:00Z' }));
  lista.push(reg.novaEntrada(lista, { tipo: 'Sincronismo', resumo: 'casado', operador: 'João', os: '1024', ts: '2026-08-28T10:05:00Z' }));
  lista.push(reg.novaEntrada(lista, { tipo: 'Laudo emitido', resumo: 'OS 1024', operador: 'João', os: '1024', ts: '2026-08-28T10:10:00Z' }));
  return lista;
}

test('a cadeia recém-criada é íntegra', () => {
  const r = reg.verificarCadeia(cadeiaExemplo());
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.n, 3);
});

test('cada entrada aponta para o hash da anterior', () => {
  const l = cadeiaExemplo();
  assert.strictEqual(l[0].hashPrev, reg.GENESIS);
  assert.strictEqual(l[1].hashPrev, l[0].hash);
  assert.strictEqual(l[2].hashPrev, l[1].hash);
});

test('alterar uma entrada do meio quebra a cadeia (detectável)', () => {
  const l = cadeiaExemplo();
  l[1].resumo = 'fora de sincronia'; // adulteração
  const r = reg.verificarCadeia(l);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.em, 2); // seq da entrada adulterada
});

test('apagar uma entrada do meio quebra a cadeia', () => {
  const l = cadeiaExemplo();
  l.splice(1, 1); // remove a segunda
  const r = reg.verificarCadeia(l);
  assert.strictEqual(r.ok, false);
});

test('cadeia vazia é considerada íntegra', () => {
  assert.strictEqual(reg.verificarCadeia([]).ok, true);
});
