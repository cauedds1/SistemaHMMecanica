'use strict';

/**
 * Codecs de leitura/escrita de campos dentro de um dump binario.
 *
 * Um campo raramente esta gravado "limpo" na EEPROM. Os fabricantes
 * costumam usar alguma combinacao de:
 *   - endianness invertida
 *   - complemento de 1 (a replica guarda o valor invertido bit a bit)
 *   - XOR com uma chave fixa
 *   - BCD (cada nibble e um digito decimal)
 *   - um fator de escala (o valor gravado e km/10, por exemplo)
 *
 * Cada replica de um campo pode ter seu proprio encoding, porque e comum
 * o mesmo valor aparecer duas vezes no dump: uma vez cru e outra invertido.
 */

const ENCODINGS = ['raw', 'complemento', 'xor', 'bcd'];

function lerInteiro(buf, offset, tamanho, endian) {
  if (offset < 0 || offset + tamanho > buf.length) {
    throw new RangeError(
      `leitura fora do dump: offset 0x${offset.toString(16)} + ${tamanho} bytes excede ${buf.length}`
    );
  }
  let valor = 0;
  for (let i = 0; i < tamanho; i++) {
    const b = buf[endian === 'be' ? offset + i : offset + tamanho - 1 - i];
    valor = valor * 256 + b;
  }
  return valor;
}

function escreverInteiro(buf, offset, tamanho, endian, valor) {
  if (offset < 0 || offset + tamanho > buf.length) {
    throw new RangeError(
      `escrita fora do dump: offset 0x${offset.toString(16)} + ${tamanho} bytes excede ${buf.length}`
    );
  }
  const max = Math.pow(256, tamanho) - 1;
  if (valor < 0 || valor > max) {
    throw new RangeError(`valor ${valor} nao cabe em ${tamanho} byte(s) (maximo ${max})`);
  }
  let restante = valor;
  for (let i = 0; i < tamanho; i++) {
    const b = restante % 256;
    restante = Math.floor(restante / 256);
    buf[endian === 'be' ? offset + tamanho - 1 - i : offset + i] = b;
  }
}

function normalizarChave(chave, tamanho) {
  if (chave === undefined || chave === null) {
    throw new Error('encoding "xor" exige o campo "chave" na replica');
  }
  const bytes = Array.isArray(chave) ? chave.slice() : [chave];
  if (bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) {
    throw new Error('chave XOR deve conter apenas bytes (0-255)');
  }
  const saida = [];
  for (let i = 0; i < tamanho; i++) saida.push(bytes[i % bytes.length]);
  return saida;
}

function bcdParaInteiro(buf, offset, tamanho) {
  let texto = '';
  for (let i = 0; i < tamanho; i++) {
    const b = buf[offset + i];
    const alto = b >> 4;
    const baixo = b & 0x0f;
    if (alto > 9 || baixo > 9) {
      throw new Error(
        `byte invalido para BCD em 0x${(offset + i).toString(16)}: 0x${b.toString(16).padStart(2, '0')}`
      );
    }
    texto += String(alto) + String(baixo);
  }
  return parseInt(texto, 10);
}

function inteiroParaBcd(buf, offset, tamanho, valor) {
  const digitos = tamanho * 2;
  const texto = String(valor);
  if (texto.length > digitos) {
    throw new RangeError(`valor ${valor} nao cabe em ${digitos} digitos BCD`);
  }
  const pad = texto.padStart(digitos, '0');
  for (let i = 0; i < tamanho; i++) {
    buf[offset + i] = (Number(pad[i * 2]) << 4) | Number(pad[i * 2 + 1]);
  }
}

/** Le uma replica e devolve o valor logico (ja com fator aplicado). */
function lerReplica(buf, replica, fator = 1) {
  const { offset, tamanho, encoding = 'raw', endian = 'le' } = replica;
  if (!ENCODINGS.includes(encoding)) {
    throw new Error(`encoding desconhecido: ${encoding}`);
  }

  if (encoding === 'bcd') {
    return bcdParaInteiro(buf, offset, tamanho) * fator;
  }

  let bruto = lerInteiro(buf, offset, tamanho, endian);

  if (encoding === 'complemento') {
    bruto = Math.pow(256, tamanho) - 1 - bruto;
  } else if (encoding === 'xor') {
    const chave = normalizarChave(replica.chave, tamanho);
    // reaplica o XOR byte a byte respeitando a ordem fisica no arquivo
    const temp = Buffer.alloc(tamanho);
    for (let i = 0; i < tamanho; i++) temp[i] = buf[offset + i] ^ chave[i];
    bruto = lerInteiro(temp, 0, tamanho, endian);
  }

  return bruto * fator;
}

/** Grava um valor logico em uma replica, aplicando o encoding dela. */
function escreverReplica(buf, replica, valorLogico, fator = 1) {
  const { offset, tamanho, encoding = 'raw', endian = 'le' } = replica;
  if (!ENCODINGS.includes(encoding)) {
    throw new Error(`encoding desconhecido: ${encoding}`);
  }

  if (valorLogico % fator !== 0) {
    throw new RangeError(
      `valor ${valorLogico} nao e multiplo do fator ${fator} deste campo; ` +
        `o dump so consegue representar multiplos de ${fator}`
    );
  }
  const bruto = valorLogico / fator;

  if (encoding === 'bcd') {
    inteiroParaBcd(buf, offset, tamanho, bruto);
    return;
  }

  if (encoding === 'complemento') {
    const max = Math.pow(256, tamanho) - 1;
    if (bruto < 0 || bruto > max) {
      throw new RangeError(`valor ${valorLogico} nao cabe em ${tamanho} byte(s)`);
    }
    escreverInteiro(buf, offset, tamanho, endian, max - bruto);
    return;
  }

  if (encoding === 'xor') {
    const chave = normalizarChave(replica.chave, tamanho);
    const temp = Buffer.alloc(tamanho);
    escreverInteiro(temp, 0, tamanho, endian, bruto);
    for (let i = 0; i < tamanho; i++) buf[offset + i] = temp[i] ^ chave[i];
    return;
  }

  escreverInteiro(buf, offset, tamanho, endian, bruto);
}

/* ------------------------------------------------------------------ */
/* VIN                                                                 */
/* ------------------------------------------------------------------ */

// I, O e Q sao proibidos no VIN justamente para nao confundir com 1 e 0.
const VIN_VALIDO = /^[A-HJ-NPR-Z0-9]{17}$/;

function validarVin(vin) {
  return typeof vin === 'string' && VIN_VALIDO.test(vin.toUpperCase());
}

function lerVin(buf, replica) {
  const { offset, tamanho = 17 } = replica;
  if (offset + tamanho > buf.length) {
    throw new RangeError(`leitura de VIN fora do dump em 0x${offset.toString(16)}`);
  }
  return buf.toString('ascii', offset, offset + tamanho).replace(/\0+$/, '').trim();
}

function escreverVin(buf, replica, vin) {
  const { offset, tamanho = 17, preenchimento = 0x00 } = replica;
  const texto = String(vin).toUpperCase();
  if (texto.length > tamanho) {
    throw new RangeError(`VIN "${texto}" excede ${tamanho} caracteres`);
  }
  for (let i = 0; i < tamanho; i++) {
    buf[offset + i] = i < texto.length ? texto.charCodeAt(i) : preenchimento;
  }
}

module.exports = {
  ENCODINGS,
  lerInteiro,
  escreverInteiro,
  lerReplica,
  escreverReplica,
  validarVin,
  lerVin,
  escreverVin,
};
