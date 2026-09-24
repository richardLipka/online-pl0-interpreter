/**
 * Utilities for passing and extracting PL/0 programs to and from URLs.
 * Supports URL-encoded plain text, literal newline normalization, and Base64 (UTF-8).
 */

export interface UrlProgramResult {
    code: string;
    input?: string;
}

/**
 * Normalizes Base64 strings (both standard and URL-safe) and decodes to a UTF-8 string.
 */
export function decodeBase64Utf8(str: string): string {
    // Replace URL-safe base64 characters with standard ones
    let b64 = str.trim().replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) {
        b64 += '=';
    }

    if (typeof Buffer !== 'undefined') {
        return Buffer.from(b64, 'base64').toString('utf-8');
    }

    // Browser environment
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Encodes a UTF-8 string into standard or URL-safe Base64.
 */
export function encodeBase64Utf8(str: string, urlSafe: boolean = true): string {
    let b64 = '';
    if (typeof Buffer !== 'undefined') {
        b64 = Buffer.from(str, 'utf-8').toString('base64');
    } else {
        // Browser environment
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        b64 = btoa(binary);
    }

    if (urlSafe) {
        return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    return b64;
}

/**
 * Decodes raw instruction code passed in URL parameters.
 * Automatically handles:
 * - Explicit `base64:` prefix
 * - Auto-detected Base64 payload
 * - Standard URL-encoding (with '+' or '%20' for spaces)
 * - Escaped newline sequences ('\\n', '\\r\\n')
 *
 * Pass alreadyUrlDecoded = true for values that were already decoded (e.g. by URLSearchParams);
 * decoding them again would turn '+' into spaces and break '%' sequences.
 */
export function decodeProgramCode(raw: string, alreadyUrlDecoded: boolean = false): string {
    if (!raw) return '';

    let decoded = raw.trim();

    // 1. If explicit base64 prefix
    if (decoded.toLowerCase().startsWith('base64:')) {
        try {
            return normalizeNewlines(decodeBase64Utf8(decoded.slice(7)));
        } catch {
            // fallback if malformed
        }
    }

    // 2. Decode percent-encoding first if present
    if (!alreadyUrlDecoded) {
        try {
            decoded = decodeURIComponent(decoded.replace(/\+/g, ' '));
        } catch {
            // if percent-decode fails, continue with original
        }
    }

    // 3. Auto-detect if string is pure Base64 without spaces/newlines
    const isBase64Pattern = /^[A-Za-z0-9+/_-]{4,}={0,2}$/.test(decoded);
    if (isBase64Pattern && !decoded.includes('\n') && !decoded.includes(' ')) {
        try {
            const b64Decoded = decodeBase64Utf8(decoded);
            // Heuristic check: decoded string should contain readable characters or instructions/newlines
            const hasCommonMnemonics =
                /\b(LIT|OPR|LOD|STO|CAL|INT|JMP|JMC|RET|REA|WRI|NEW|DEL|LDA|STA|PLD|PST|ITR|RTI|OPF)\b/i.test(
                    b64Decoded
                );
            const hasNewlines = b64Decoded.includes('\n');
            if (hasCommonMnemonics || (hasNewlines && /^[\x20-\x7E\r\n\t\u00A0-\uFFFF]*$/.test(b64Decoded))) {
                return normalizeNewlines(b64Decoded);
            }
        } catch {
            // Not a valid base64 payload, proceed with plain text
        }
    }

    // 4. Normalize literal escaped newlines (e.g. '\\n' without real newlines)
    if (!decoded.includes('\n') && decoded.includes('\\n')) {
        decoded = decoded.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
    }

    return normalizeNewlines(decoded);
}

/**
 * Normalizes all carriage returns and line endings to single '\n'.
 */
export function normalizeNewlines(str: string): string {
    return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\0/g, '\n');
}

/**
 * Extracts a PL/0 program and optional input from URL search query string or hash fragment.
 */
export function extractProgramFromUrl(
    search?: string,
    hash?: string
): UrlProgramResult | null {
    let searchStr = search;
    let hashStr = hash;

    if (searchStr === undefined && typeof window !== 'undefined') {
        searchStr = window.location.search;
    }
    if (hashStr === undefined && typeof window !== 'undefined') {
        hashStr = window.location.hash;
    }

    const codeParamKeys = [
        'code',
        'instructions',
        'program',
        'pcode',
        'code_b64',
        'b64',
        'instructions_b64',
    ];
    const inputParamKeys = ['input', 'in'];

    let rawCode: string | null = null;
    let rawInput: string | null = null;

    // 1. Try search parameters (?code=...)
    if (searchStr) {
        try {
            const searchParams = new URLSearchParams(
                searchStr.startsWith('?') ? searchStr.slice(1) : searchStr
            );
            for (const key of codeParamKeys) {
                const val = searchParams.get(key);
                if (val) {
                    rawCode = key.includes('b64') && !val.startsWith('base64:') ? `base64:${val}` : val;
                    break;
                }
            }
            for (const key of inputParamKeys) {
                const val = searchParams.get(key);
                if (val !== null) {
                    rawInput = val;
                    break;
                }
            }
        } catch {
            // URLSearchParams error fallback
        }
    }

    // 2. If code not found in search, try hash parameters (#code=... or #?code=...)
    if (!rawCode && hashStr) {
        try {
            let hashContent = hashStr.startsWith('#') ? hashStr.slice(1) : hashStr;
            if (hashContent.startsWith('/') || hashContent.startsWith('?')) {
                hashContent = hashContent.replace(/^[\/?]+/, '');
            }
            const hashParams = new URLSearchParams(hashContent);
            for (const key of codeParamKeys) {
                const val = hashParams.get(key);
                if (val) {
                    rawCode = key.includes('b64') && !val.startsWith('base64:') ? `base64:${val}` : val;
                    break;
                }
            }
            if (rawInput === null) {
                for (const key of inputParamKeys) {
                    const val = hashParams.get(key);
                    if (val !== null) {
                        rawInput = val;
                        break;
                    }
                }
            }
        } catch {
            // Hash parsing fallback
        }
    }

    if (!rawCode || !rawCode.trim()) {
        return null;
    }

    // URLSearchParams has already decoded the values
    const decodedCode = decodeProgramCode(rawCode, true);
    if (!decodedCode.trim()) {
        return null;
    }

    return {
        code: decodedCode,
        input: rawInput ?? undefined,
    };
}

/**
 * Encodes code and optional input into a complete URL.
 */
export function encodeProgramToUrl(
    baseUrl: string,
    code: string,
    input?: string,
    options?: { useBase64?: boolean }
): string {
    try {
        const url = new URL(baseUrl, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
        const codeValue = options?.useBase64
            ? encodeBase64Utf8(code, true)
            : code;

        url.searchParams.set('code', codeValue);

        if (input && input.trim().length > 0) {
            url.searchParams.set('input', input);
        } else {
            url.searchParams.delete('input');
        }

        // Clean up redundant aliases if they were in the original URL
        url.searchParams.delete('instructions');
        url.searchParams.delete('program');
        url.searchParams.delete('pcode');
        url.searchParams.delete('code_b64');
        url.searchParams.delete('b64');

        return url.toString();
    } catch {
        // Fallback for simple string concatenation
        const encodedCode = options?.useBase64
            ? encodeBase64Utf8(code, true)
            : encodeURIComponent(code);
        let result = `${baseUrl.split('?')[0]}?code=${encodedCode}`;
        if (input && input.trim().length > 0) {
            result += `&input=${encodeURIComponent(input)}`;
        }
        return result;
    }
}
