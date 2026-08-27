'use strict';

/**
 * Algoritmos de checksum usados em EEPROM/flash automotiva.
 *
 * Um dump editado so e aceito pelo modulo se o checksum do bloco alterado
 * bater. Cada fabricante usa um algoritmo diferente, entao o perfil do
 * modulo declara qual usar, sobre qual faixa, e onde gravar o resultado.
 */

const { lerInteiro, escreverInteiro } = require('./codec');

function fatiar(buf, inicio, fim) {
  if (inicio < 0 || fim >= buf.length || inicio > fim) {
    throw new RangeError(
      `faixa invalida 0x${inicio.toString(16)}-0x${fim.toString(16)} para dump de ${buf.length} bytes`
    );
  }
  return buf.subarray(inicio, fim + 1);
}

const ALGORITMOS = {
  /** Soma simples de todos os bytes, truncada em 8 bits. */
  sum8(dados) {
    let s = 0;
    for (const b of dados) s = (s + b) & 0xff;
    return s;
  },

  /** Soma de todos os bytes, truncada em 16 bits. O caso mais comum. */
  sum16(dados) {
    let s = 0;
    for (const b of dados) s = (s + b) & 0xffff;
    return s;
  },

  /** Soma de todos os bytes, truncada em 32 bits. */
  sum32(dados) {
    let s = 0;
    for (const b of dados) s = (s + b) >>> 0;
    return s >>> 0;
  },

  /** Soma de palavras de 16 bits little-endian. */
  sum16le(dados) {
    let s = 0;
    for (let i = 0; i + 1 < dados.length; i += 2) {
      s = (s + (dados[i] | (dados[i + 1] << 8))) & 0xffff;
    }
    return s;
  },

  /** XOR de todos os bytes. */
  xor8(dados) {
    let s = 0;
    for (const b of dados) s ^= b;
    return s & 0xff;
  },

  /** Complemento de 2 da soma: usado quando o bloco inteiro deve somar zero. */
  sum8_neg(dados) {
    let s = 0;
    for (const b of dados) s = (s + b) & 0xff;
    return (0x100 - s) & 0xff;
  },

  /** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF). */
  crc16ccitt(dados) {
    let crc = 0xffff;
    for (const b of dados) {
      crc ^= b << 8;
      for (let i = 0; i < 8; i++) {
        crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
      }
    }
    return crc;
  },

  /** CRC-16/MODBUS (poly 0xA001 refletido, init 0xFFFF). */
  crc16modbus(dados) {
    let crc = 0xffff;
    for (const b of dados) {
      crc ^= b;
      for (let i = 0; i < 8; i++) {
        crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
      }
    }
    return crc & 0xffff;
  },

  /** CRC-32 (poly 0xEDB88320 refletido) — o mesmo do zip. */
  crc32(dados) {
    let crc = 0xffffffff;
    for (const b of dados) {
      crc ^= b;
      for (let i = 0; i < 8; i++) {
        crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  },
};

const NOMES = Object.keys(ALGORITMOS);

/**
 * Calcula o checksum de uma especificacao contra o dump.
 * A faixa coberta exclui automaticamente os bytes onde o proprio checksum
 * mora, quando eles caem dentro dela — senao o resultado nunca converge.
 */
function calcular(buf, spec) {
  const fn = ALGORITMOS[spec.algoritmo];
  if (!fn) {
    throw new Error(`algoritmo de checksum desconhecido: "${spec.algoritmo}" (use ${NOMES.join(', ')})`);
  }
  const tamanho = spec.tamanho || 2;
  const dados = fatiar(buf, spec.inicio, spec.fim);

  const destinoDentro = spec.destino >= spec.inicio && spec.destino <= spec.fim;
  if (!destinoDentro) return fn(dados);

  // zera a area do checksum antes de calcular, sem tocar no dump original
  const copia = Buffer.from(dados);
  const rel = spec.destino - spec.inicio;
  for (let i = 0; i < tamanho && rel + i < copia.length; i++) copia[rel + i] = 0;
  return fn(copia);
}

/** Le o checksum que esta gravado no dump. */
function lerGravado(buf, spec) {
  return lerInteiro(buf, spec.destino, spec.tamanho || 2, spec.endian || 'le');
}

/** Verifica uma spec: devolve o esperado, o gravado e se batem. */
function verificar(buf, spec) {
  const esperado = calcular(buf, spec);
  const gravado = lerGravado(buf, spec);
  return {
    nome: spec.nome,
    algoritmo: spec.algoritmo,
    esperado,
    gravado,
    ok: esperado === gravado,
  };
}

/** Recalcula e grava o checksum no dump. Devolve o que mudou. */
function aplicar(buf, spec) {
  const anterior = lerGravado(buf, spec);
  const novo = calcular(buf, spec);
  escreverInteiro(buf, spec.destino, spec.tamanho || 2, spec.endian || 'le', novo);
  return { nome: spec.nome, anterior, novo, alterado: anterior !== novo };
}

module.exports = { ALGORITMOS, NOMES, calcular, lerGravado, verificar, aplicar };
