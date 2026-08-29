'use strict';

/**
 * Registro — o caderninho encadeado por hash.
 *
 * Cada entrada carrega a impressão digital da anterior, formando uma cadeia.
 * Alterar ou apagar qualquer entrada do meio quebra a cadeia e isso é
 * detectável. Este módulo é a lógica pura (sem armazenamento) — quem persiste
 * é a camada de banco (SQLite no .exe; localStorage no protótipo web).
 */

const crypto = require('crypto');

const GENESIS = 'genesis';

/** Serialização canônica de uma entrada, sem o próprio hash. */
function corpoCanonico(ent) {
  return JSON.stringify({
    seq: ent.seq,
    ts: ent.ts,
    operador: ent.operador,
    os: ent.os ?? null,
    tipo: ent.tipo,
    resumo: ent.resumo,
    detalhes: ent.detalhes ?? null,
    hashPrev: ent.hashPrev,
  });
}

function sha256Hex(texto) {
  return crypto.createHash('sha256').update(texto, 'utf8').digest('hex');
}

/**
 * Cria a próxima entrada encadeada a partir da lista atual.
 * Não muta a lista; devolve a nova entrada com hash calculado.
 */
function novaEntrada(lista, { tipo, resumo, detalhes = null, operador = '—', os = null, ts = null }) {
  const seq = lista.length + 1;
  const hashPrev = lista.length ? lista[lista.length - 1].hash : GENESIS;
  const ent = {
    seq,
    ts: ts || new Date().toISOString(),
    operador,
    os,
    tipo,
    resumo,
    detalhes,
    hashPrev,
  };
  ent.hash = sha256Hex(corpoCanonico(ent));
  return ent;
}

/**
 * Verifica a integridade da cadeia inteira.
 * Devolve { ok: true, n } ou { ok: false, em: <seq da primeira quebra> }.
 */
function verificarCadeia(lista) {
  let prev = GENESIS;
  for (const ent of lista) {
    if (ent.hashPrev !== prev) return { ok: false, em: ent.seq };
    if (sha256Hex(corpoCanonico(ent)) !== ent.hash) return { ok: false, em: ent.seq };
    prev = ent.hash;
  }
  return { ok: true, n: lista.length };
}

module.exports = { GENESIS, novaEntrada, verificarCadeia, corpoCanonico, sha256Hex };
