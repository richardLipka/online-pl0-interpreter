#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { runHeadless, formatTextReport, formatJsonReport, CliOptions, CliRunResult } from './runner';

function printHelp(lang: 'en' | 'cs' = 'en') {
    if (lang === 'cs') {
        console.log(`
PL/0 Headless CLI Interpret & Testovací prostředí
=================================================

Použití:
  npx tsx cli/index.ts [přepínače] <soubor.pl0 ...>
  npm run cli -- [přepínače] <soubor.pl0 ...>

Přepínače:
  -i, --input <text|soubor>   Vstupní řetězec nebo cesta k souboru se vstupem pro instrukci REA
  -s, --max-steps <číslo>     Maximální počet kroků na program (výchozí: 100000)
  -t, --trace                 Zapne podrobný trasovací výpis každé provedené instrukce
  --stats                     Vypíše souhrnné statistiky běhu a profilování instrukcí
  --no-debug                  Vypne provádění ladicích direktiv v komentářích
  -f, --format <text|json>    Formát výstupu: 'text' (přehledný pro terminál) nebo 'json' (pro CI/CD)
  --lang <cs|en>              Jazyk chybových zpráv a popisků (výchozí: en)
  -h, --help                  Zobrazí tuto nápovědu a seznam direktiv

Direktivy v komentářích pro ladění a testování:
  Direktivy lze umístit na samostatný řádek (např. &REGS) nebo do komentáře (např. ; &REGS, // &STK).
  Direktiva se provede v místě svého výskytu a neposouvá adresy/čítač instrukcí programu.

  &REGS                     Vypíše obsah registrů báze (BASE), vrcholu zásobníku (SP) a čítače instrukcí (PC).
  &STK                      Vypíše obsah celého zásobníku od indexu 0 po SP.
  &STKA                     Vypíše obsah zásobníku od registru báze (aktuální aktivační záznam / rámec).
  &STKN <číslo n>           Vypíše posledních n položek na vrcholu zásobníku.
  &STKRG <adresa a> <adresa b> Vypíše obsah zásobníku od indexu a do indexu b včetně.
  &ECHO <řetězec>           Vypíše libovolný textový řetězec na ladicí výstup.
  &MEM                      Vypíše souhrn využití paměti (velikost zásobníku, alokované buňky a bloky haldy).
  &HEAP                     Vypíše detailní stav alokovaných bloků na dynamické haldě.
  &ASSERT_TOS <hodnota>     Ověří, že na vrcholu zásobníku je očekávaná hodnota (bez odebrání ze zásobníku).
  &STATS                    Vypíše aktuální statistiky profilování instrukcí.

Příklady:
  npx tsx cli/index.ts program.pl0
  npx tsx cli/index.ts program.pl0 -i "42" --stats
  npx tsx cli/index.ts test1.pl0 test2.pl0 --format json
`);
    } else {
        console.log(`
PL/0 Headless CLI Interpreter & Testing Environment
===================================================

Usage:
  npx tsx cli/index.ts [options] <file.pl0 ...>
  npm run cli -- [options] <file.pl0 ...>

Options:
  -i, --input <text|file>     Input text string or path to input file for REA instruction
  -s, --max-steps <number>    Maximum instruction execution limit per program (default: 100000)
  -t, --trace                 Enable per-step execution trace (shows step, PC, opcode, TOS)
  --stats                     Display execution statistics and instruction profiling breakdown
  --no-debug                  Disable execution of comment directives
  -f, --format <text|json>    Output format: 'text' (terminal friendly) or 'json' (for automated CI/CD)
  --lang <en|cs>              Language for messages and diagnostics (default: en)
  -h, --help                  Display this help message and directive documentation

Comment Directives for Debugging and Compiler Verification:
  Directives can be placed on a standalone line (e.g. &REGS) or inside comments (e.g. ; &REGS, // &STK).
  They execute at their source location without altering bytecode instruction indices or jump targets.

  &REGS                     Prints register contents: Base register (BASE), Stack Pointer (SP), and Program Counter (PC).
  &STK                      Prints entire stack contents from index 0 up to SP.
  &STKA                     Prints stack contents from the base register (the current activation record / frame).
  &STKN <number n>          Prints the last n items on the stack top.
  &STKRG <addr a> <addr b>  Prints stack contents from index a to index b inclusive.
  &ECHO <string>            Prints arbitrary text string to the debug output.
  &MEM                      Prints memory footprint summary (stack depth, heap data cells, active blocks).
  &HEAP                     Prints active heap blocks, data addresses, and allocated values.
  &ASSERT_TOS <value>       Asserts that the top of stack equals <value> without popping.
  &STATS                    Prints an execution statistics and profiling snapshot.

Examples:
  npx tsx cli/index.ts program.pl0
  npx tsx cli/index.ts program.pl0 -i "42" --stats
  npx tsx cli/index.ts test1.pl0 test2.pl0 --format json
`);
    }
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
        const langArgIdx = args.indexOf('--lang');
        const lang = langArgIdx !== -1 && args[langArgIdx + 1] === 'cs' ? 'cs' : 'en';
        printHelp(lang);
        process.exit(0);
    }

    const options: CliOptions = {
        maxSteps: 100000,
        enableDirectives: true,
        trace: false,
        includeStats: false,
        format: 'text',
        language: 'en',
    };

    const files: string[] = [];

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '-i' || arg === '--input') {
            const inputVal = args[++i];
            if (inputVal) {
                if (fs.existsSync(inputVal)) {
                    options.input = fs.readFileSync(inputVal, 'utf8');
                } else {
                    options.input = inputVal;
                }
            }
        } else if (arg === '-s' || arg === '--max-steps') {
            const stepsVal = parseInt(args[++i], 10);
            if (!isNaN(stepsVal)) {
                options.maxSteps = stepsVal;
            }
        } else if (arg === '-t' || arg === '--trace') {
            options.trace = true;
        } else if (arg === '--stats') {
            options.includeStats = true;
        } else if (arg === '--no-debug') {
            options.enableDirectives = false;
        } else if (arg === '-d' || arg === '--debug') {
            options.enableDirectives = true;
        } else if (arg === '-f' || arg === '--format') {
            const fmt = args[++i];
            if (fmt === 'json' || fmt === 'text') {
                options.format = fmt;
            }
        } else if (arg === '--lang') {
            const l = args[++i];
            if (l === 'cs' || l === 'en') {
                options.language = l;
            }
        } else if (!arg.startsWith('-')) {
            files.push(arg);
        }
    }

    if (files.length === 0) {
        console.error('Error: No PL/0 input files specified. Use --help for usage.');
        process.exit(2);
    }

    const results: CliRunResult[] = [];
    let overallExitCode = 0;

    for (const file of files) {
        if (!fs.existsSync(file)) {
            console.error(`Error: File not found: ${file}`);
            overallExitCode = Math.max(overallExitCode, 2);
            continue;
        }

        const sourceCode = fs.readFileSync(file, 'utf8');
        const fileOpts: CliOptions = { ...options, filePath: file };
        const result = runHeadless(sourceCode, fileOpts);
        results.push(result);

        if (result.exitCode !== 0) {
            overallExitCode = Math.max(overallExitCode, result.exitCode);
        }
    }

    if (options.format === 'json') {
        if (results.length === 1) {
            console.log(formatJsonReport(results[0]));
        } else {
            console.log(
                JSON.stringify(
                    {
                        total: results.length,
                        passed: results.filter((r) => r.success).length,
                        failed: results.filter((r) => !r.success).length,
                        results,
                    },
                    null,
                    2
                )
            );
        }
    } else {
        for (let i = 0; i < results.length; i++) {
            if (i > 0) console.log('\n' + '='.repeat(60) + '\n');
            console.log(formatTextReport(results[i], options));
        }

        if (results.length > 1) {
            const passed = results.filter((r) => r.success).length;
            const failed = results.filter((r) => !r.success).length;
            console.log('\n' + '-'.repeat(60));
            console.log(`Suite Summary: ${results.length} files | ${passed} PASSED | ${failed} FAILED`);
        }
    }

    process.exit(overallExitCode);
}

main().catch((err) => {
    console.error('Fatal CLI Error:', err);
    process.exit(1);
});
