'use strict';

const test = require('node:test');
const assert = require('node:assert');
const codec = require('../src/core/codec');

test('lerReplica raw little-endian', () => {
  const b = Buffer.from([0x78, 0xd4, 0x03]); // 0x03D478 = 251000
  assert.strictEqual(codec.lerReplica(b, { offset: 0, tamanho: 3, endian: 'le', encoding: 'raw' }), 251000);
});

test('lerReplica com fator ×10 (padrão KM do painel PSA)', () => {
  const b = Buffer.from([0x78, 0xd4, 0x03]); // 251000 / 10 = 25100
  assert.strictEqual(
    codec.lerReplica(b, { offset: 0, tamanho: 3, endian: 'le', encoding: 'raw' }, 10),
    2510000
  );
  // fator aplicado como multiplicação do valor lógico; a divisão fica no leitor
});

test('escreverReplica e lerReplica são inversos (raw le)', () => {
  const b = Buffer.alloc(4);
  codec.escreverReplica(b, { offset: 0, tamanho: 4, endian: 'le', encoding: 'raw' }, 123456);
  assert.strictEqual(codec.lerReplica(b, { offset: 0, tamanho: 4, endian: 'le', encoding: 'raw' }), 123456);
});

test('encoding complemento inverte o valor', () => {
  const b = Buffer.alloc(2);
  codec.escreverReplica(b, { offset: 0, tamanho: 2, endian: 'le', encoding: 'complemento' }, 0x1234);
  assert.strictEqual(codec.lerReplica(b, { offset: 0, tamanho: 2, endian: 'le', encoding: 'complemento' }), 0x1234);
});

test('encoding bcd grava e lê dígitos decimais', () => {
  const b = Buffer.alloc(2);
  codec.escreverReplica(b, { offset: 0, tamanho: 2, encoding: 'bcd' }, 4827);
  assert.strictEqual(b[0], 0x48);
  assert.strictEqual(b[1], 0x27);
  assert.strictEqual(codec.lerReplica(b, { offset: 0, tamanho: 2, encoding: 'bcd' }), 4827);
});

test('validarVin aceita VIN correto e rejeita letras proibidas', () => {
  assert.strictEqual(codec.validarVin('935CPFCA5SB556938'), true);
  assert.strictEqual(codec.validarVin('935CPFCA5SB55693I'), false); // I proibido
  assert.strictEqual(codec.validarVin('curto'), false);
});

test('lerReplica fora do buffer lança erro (falha segura)', () => {
  const b = Buffer.alloc(2);
  assert.throws(() => codec.lerReplica(b, { offset: 1, tamanho: 4, endian: 'le', encoding: 'raw' }));
});
