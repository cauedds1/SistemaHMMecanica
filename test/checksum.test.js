'use strict';

const test = require('node:test');
const assert = require('node:assert');
const cs = require('../src/core/checksum');

// Vetor de teste padrão da indústria: a string "123456789".
const V = Buffer.from('123456789');

test('CRC-16/CCITT-FALSE bate com o vetor padrão (0x29B1)', () => {
  assert.strictEqual(cs.ALGORITMOS.crc16ccitt(V), 0x29b1);
});

test('CRC-16/MODBUS bate com o vetor padrão (0x4B37)', () => {
  assert.strictEqual(cs.ALGORITMOS.crc16modbus(V), 0x4b37);
});

test('CRC-32 bate com o vetor padrão (0xCBF43926)', () => {
  assert.strictEqual(cs.ALGORITMOS.crc32(V) >>> 0, 0xcbf43926);
});

test('sum8/sum16/sum32 somam corretamente', () => {
  const b = Buffer.from([0x10, 0x20, 0x30]);
  assert.strictEqual(cs.ALGORITMOS.sum8(b), 0x60);
  assert.strictEqual(cs.ALGORITMOS.sum16(b), 0x60);
  assert.strictEqual(cs.ALGORITMOS.sum32(b), 0x60);
});

test('sum8 trunca em 8 bits', () => {
  assert.strictEqual(cs.ALGORITMOS.sum8(Buffer.from([0xff, 0x02])), 0x01);
});

test('xor8 faz XOR de todos os bytes', () => {
  assert.strictEqual(cs.ALGORITMOS.xor8(Buffer.from([0xf0, 0x0f, 0xff])), 0x00);
});

test('aplicar recalcula e grava o checksum no destino', () => {
  const buf = Buffer.alloc(16, 0);
  for (let i = 0; i < 14; i++) buf[i] = i;
  const spec = { algoritmo: 'sum16', inicio: 0, fim: 15, destino: 14, tamanho: 2, endian: 'le' };
  const r = cs.aplicar(buf, spec);
  assert.strictEqual(r.alterado, true);
  // depois de aplicado, verificar deve bater
  assert.strictEqual(cs.verificar(buf, spec).ok, true);
});

test('verificar detecta checksum quebrado', () => {
  const buf = Buffer.alloc(16, 0);
  const spec = { algoritmo: 'sum16', inicio: 0, fim: 15, destino: 14, tamanho: 2, endian: 'le' };
  cs.aplicar(buf, spec);
  buf[3] ^= 0xff; // corrompe um byte da área coberta
  assert.strictEqual(cs.verificar(buf, spec).ok, false);
});
