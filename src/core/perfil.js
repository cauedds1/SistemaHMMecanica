'use strict';

/**
 * Perfis de módulo — o "mapa" de cada dump.
 *
 * Um perfil descreve, para um módulo específico, onde cada campo mora e como
 * cada checksum é calculado. Módulo novo = perfil novo, sem tocar no motor.
 *
 * Estes são carregados dos arquivos declarativos em /profiles. Mantê-los como
 * JSON permite que a mesma descrição sirva ao motor (Node) e à interface.
 */

const fs = require('fs');
const path = require('path');

const DIR_PERFIS = path.join(__dirname, '..', '..', 'profiles');

/** Carrega todos os perfis do diretório /profiles. */
function carregarPerfis(dir = DIR_PERFIS) {
  const perfis = {};
  for (const arquivo of fs.readdirSync(dir)) {
    if (!arquivo.endsWith('.json')) continue;
    const perfil = JSON.parse(fs.readFileSync(path.join(dir, arquivo), 'utf8'));
    perfis[perfil.id] = perfil;
  }
  return perfis;
}

/**
 * Reconhece qual perfil se aplica a um dump, pelo tamanho e (quando houver)
 * pela assinatura. Devolve o perfil ou null — nunca chuta.
 */
function detectar(buf, perfis) {
  const candidatos = Object.values(perfis).filter((p) => p.tamanho === buf.length);
  for (const p of candidatos) {
    if (!p.assinatura) return p; // só tamanho basta quando não há assinatura
    const { janela, janelaTam, texto } = p.assinatura;
    const trecho = buf.toString('latin1', janela, janela + janelaTam);
    if (trecho.indexOf(texto) >= 0) return p;
  }
  // se sobrou um candidato por tamanho e nenhum tinha assinatura conferível, devolve-o
  return candidatos.length === 1 && !candidatos[0].assinatura ? candidatos[0] : null;
}

module.exports = { DIR_PERFIS, carregarPerfis, detectar };
