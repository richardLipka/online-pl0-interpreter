import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    decodeBase64Utf8,
    encodeBase64Utf8,
    decodeProgramCode,
    normalizeNewlines,
    extractProgramFromUrl,
    encodeProgramToUrl,
} from '../utils/urlProgram';
import { ParseAndValidate } from '../core/validator';

describe('URL Program Extraction & Decoding', () => {
    const sampleProgram = 'INT 0, 3\nLIT 0, 5\nSTO 0, 3';

    it('decodes standard URL-encoded plain text', () => {
        const encoded = encodeURIComponent(sampleProgram);
        const decoded = decodeProgramCode(encoded);
        assert.strictEqual(decoded, sampleProgram);
    });

    it('decodes plain text with spaces encoded as plus signs (+)', () => {
        const urlStr = 'INT+0,+3%0ALIT+0,+5%0ASTO+0,+3';
        const decoded = decodeProgramCode(urlStr);
        assert.strictEqual(decoded, sampleProgram);
    });

    it('normalizes literal escaped newlines (\\n) when no actual newlines exist', () => {
        const raw = 'INT 0, 3\\nLIT 0, 5\\nSTO 0, 3';
        const decoded = decodeProgramCode(raw);
        assert.strictEqual(decoded, sampleProgram);
    });

    it('normalizes Windows carriage returns (\\r\\n) to standard (\\n)', () => {
        const raw = 'INT 0, 3\r\nLIT 0, 5\r\nSTO 0, 3';
        const decoded = decodeProgramCode(raw);
        assert.strictEqual(decoded, sampleProgram);
    });

    it('encodes and decodes Base64 UTF-8 correctly', () => {
        const textWithAccents = '; Příliš žluťoučký kůň úpěl ďábelské ódy\nLIT 0, "Ahoj světe"\nWRI 0, 0';
        const b64 = encodeBase64Utf8(textWithAccents, true);
        const decoded = decodeBase64Utf8(b64);
        assert.strictEqual(decoded, textWithAccents);
    });

    it('auto-detects and decodes valid Base64 code in decodeProgramCode', () => {
        const b64 = encodeBase64Utf8(sampleProgram, true);
        const decoded = decodeProgramCode(b64);
        assert.strictEqual(decoded, sampleProgram);
    });

    it('handles explicit base64: prefix', () => {
        const b64 = encodeBase64Utf8(sampleProgram, false);
        const decoded = decodeProgramCode(`base64:${b64}`);
        assert.strictEqual(decoded, sampleProgram);
    });

    it('extracts program from ?code= query parameter', () => {
        const search = `?code=${encodeURIComponent(sampleProgram)}`;
        const result = extractProgramFromUrl(search);
        assert.ok(result);
        assert.strictEqual(result.code, sampleProgram);
        assert.strictEqual(result.input, undefined);
    });

    it('extracts program from ?instructions= alias', () => {
        const search = `?instructions=${encodeURIComponent(sampleProgram)}`;
        const result = extractProgramFromUrl(search);
        assert.ok(result);
        assert.strictEqual(result.code, sampleProgram);
    });

    it('extracts program from ?program= and ?pcode= aliases', () => {
        const search1 = `?program=${encodeURIComponent(sampleProgram)}`;
        assert.strictEqual(extractProgramFromUrl(search1)?.code, sampleProgram);

        const search2 = `?pcode=${encodeURIComponent(sampleProgram)}`;
        assert.strictEqual(extractProgramFromUrl(search2)?.code, sampleProgram);
    });

    it('extracts optional &input= parameter for REA instructions', () => {
        const search = `?code=${encodeURIComponent('REA 0, 0\nWRI 0, 0')}&input=Hello+World`;
        const result = extractProgramFromUrl(search);
        assert.ok(result);
        assert.strictEqual(result.code, 'REA 0, 0\nWRI 0, 0');
        assert.strictEqual(result.input, 'Hello World');
    });

    it('extracts program from hash fragment (#code=...)', () => {
        const hash = `#code=${encodeURIComponent(sampleProgram)}`;
        const result = extractProgramFromUrl('', hash);
        assert.ok(result);
        assert.strictEqual(result.code, sampleProgram);
    });

    it('extracts program from hash fragment with leading slash (#/code=...)', () => {
        const hash = `#/code=${encodeURIComponent(sampleProgram)}`;
        const result = extractProgramFromUrl('', hash);
        assert.ok(result);
        assert.strictEqual(result.code, sampleProgram);
    });

    it('returns null when no code parameters are present', () => {
        assert.strictEqual(extractProgramFromUrl('?other=123', '#section'), null);
        assert.strictEqual(extractProgramFromUrl('', ''), null);
        assert.strictEqual(extractProgramFromUrl('?code=', ''), null);
    });

    it('encodes program to clean URL with encodeProgramToUrl', () => {
        const url = encodeProgramToUrl('https://example.com/pl0', sampleProgram);
        assert.ok(url.includes('?code='));
        const extracted = extractProgramFromUrl(url.substring(url.indexOf('?')));
        assert.ok(extracted);
        assert.strictEqual(extracted.code, sampleProgram);
    });

    it('encodes program with input and base64 option', () => {
        const url = encodeProgramToUrl('https://example.com/pl0', sampleProgram, 'test input', { useBase64: true });
        assert.ok(url.includes('?code='));
        assert.ok(url.includes('input=test+input') || url.includes('input=test%20input'));
        const extracted = extractProgramFromUrl(url.substring(url.indexOf('?')));
        assert.ok(extracted);
        assert.strictEqual(extracted.code, sampleProgram);
        assert.strictEqual(extracted.input, 'test input');
    });

    it('validates and parses program extracted from URL', () => {
        const search = `?code=${encodeURIComponent(sampleProgram)}`;
        const result = extractProgramFromUrl(search);
        assert.ok(result);
        const pav = ParseAndValidate(result.code);
        assert.strictEqual(pav.parseOK, true);
        assert.strictEqual(pav.validationOK, true);
        assert.strictEqual(pav.instructions.length, 3);
    });

    it('normalizes embedded null characters (\\0) to newlines for robustness', () => {
        const codeWithNull = 'LIT 0, 1\u0000LIT 0, 2\u0000OPR 0, 2';
        const normalized = normalizeNewlines(codeWithNull);
        assert.strictEqual(normalized, 'LIT 0, 1\nLIT 0, 2\nOPR 0, 2');
    });
});
