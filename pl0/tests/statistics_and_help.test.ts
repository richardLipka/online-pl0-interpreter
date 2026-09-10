import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runProgram } from './test_helpers';
import csUi from '../localization/cs/ui.json';
import enUi from '../localization/en/ui.json';
import { NextStep, InitModel } from '../core/operations';
import { ParseAndValidate } from '../core/validator';

describe('Execution Statistics & Profiling', () => {
    it('tracks instruction counts and categories accurately for basic arithmetic', () => {
        const code = `
            INT 0, 3
            LIT 0, 10
            LIT 0, 20
            OPR 0, 2
            STO 0, 3
            RET 0, 0
        `;
        const result = runProgram(code);
        assert.strictEqual(result.isEnd, true);

        const stats = result.model.stats;
        assert.ok(stats);

        assert.strictEqual(stats.totalInstructionsExecuted, 6);
        assert.strictEqual(stats.completedNormally, true);
        assert.strictEqual(stats.haltedOnError, false);

        assert.strictEqual(stats.instructionCounts['INT'], 1);
        assert.strictEqual(stats.instructionCounts['LIT'], 2);
        assert.strictEqual(stats.instructionCounts['OPR'], 1);
        assert.strictEqual(stats.instructionCounts['STO'], 1);
        assert.strictEqual(stats.instructionCounts['RET'], 1);

        assert.strictEqual(stats.categoryCounts.arithmeticLogic, 1);
        assert.strictEqual(stats.categoryCounts.memoryStack, 4); // INT, LIT*2, STO
        assert.strictEqual(stats.categoryCounts.procedureCalls, 1); // RET
        assert.strictEqual(stats.categoryCounts.controlFlow, 0);
        assert.strictEqual(stats.categoryCounts.heapOperations, 0);
    });

    it('profiles branches (taken vs not taken) in a loop', () => {
        // 0: INT 0, 4
        // 1: LIT 0, 3
        // 2: STO 0, 3
        // 3: LOD 0, 3
        // 4: LIT 0, 0
        // 5: OPR 0, 12  (check if 0 > i; when i==0, 0 > 0 is false (0))
        // 6: JMC 0, 12
        // 7: LOD 0, 3
        // 8: LIT 0, 1
        // 9: OPR 0, 3   (i - 1)
        // 10: STO 0, 3
        // 11: JMP 0, 3
        // 12: RET 0, 0
        const code = `
            INT 0, 4
            LIT 0, 3
            STO 0, 3
            LOD 0, 3
            LIT 0, 0
            OPR 0, 12
            JMC 0, 12
            LOD 0, 3
            LIT 0, 1
            OPR 0, 3
            STO 0, 3
            JMP 0, 3
            RET 0, 0
        `;
        const result = runProgram(code);
        assert.strictEqual(result.isEnd, true);

        const stats = result.model.stats;
        assert.ok(stats);

        assert.strictEqual(stats.conditionalJumpsExecuted, 4);
        assert.strictEqual(stats.conditionalJumpsTaken, 1);
        assert.strictEqual(stats.conditionalJumpsNotTaken, 3);
        assert.strictEqual(stats.branchTakenRatio, 25); // 1 / 4 = 25%

        assert.strictEqual(stats.jumpsExecuted, 3);
    });

    it('profiles procedure calls, returns and peak call stack depth', () => {
        // 0: JMP 0, 6
        // 1: INT 0, 3
        // 2: RET 0, 0
        // 3: INT 0, 3
        // 4: CAL 0, 1
        // 5: RET 0, 0
        // 6: INT 0, 3
        // 7: CAL 0, 3
        // 8: RET 0, 0
        const code = `
            JMP 0, 6
            INT 0, 3
            RET 0, 0
            INT 0, 3
            CAL 0, 1
            RET 0, 0
            INT 0, 3
            CAL 0, 3
            RET 0, 0
        `;
        const result = runProgram(code);
        assert.strictEqual(result.isEnd, true);

        const stats = result.model.stats;
        assert.ok(stats);

        assert.strictEqual(stats.procedureCallsCount, 2);
        assert.strictEqual(stats.procedureReturnsCount, 3); // 2 from procedures, 1 from main
        // Main frame (1), CAL 0, 3 (2), CAL 0, 1 (3)
        assert.strictEqual(stats.peakCallStackDepth, 3);
    });

    it('tracks memory footprint and dynamic heap allocations/deallocations', () => {
        const code = `
            INT 0, 3
            LIT 0, 5
            NEW 0, 0
            STO 0, 3
            LOD 0, 3
            LIT 0, 42
            STA 0, 0
            LOD 0, 3
            DEL 0, 0
            RET 0, 0
        `;
        const result = runProgram(code);
        assert.strictEqual(result.isEnd, true);

        const stats = result.model.stats;
        assert.ok(stats);

        assert.strictEqual(stats.categoryCounts.heapOperations, 3); // NEW, STA, DEL
        assert.strictEqual(stats.totalHeapAllocations, 1);
        assert.strictEqual(stats.totalHeapDeallocations, 1);
        assert.strictEqual(stats.peakHeapBlocks, 1);
        assert.strictEqual(stats.activeHeapBlocks, 0); // Freed at the end
        assert.strictEqual(stats.peakHeapAllocatedCells, 5);
        assert.strictEqual(stats.currentHeapAllocatedCells, 0);
        assert.ok(stats.peakStackSize >= 4);
        assert.ok(stats.peakTotalMemoryOccupied >= 9);
    });

    it('records haltedOnError flag when execution encounters fatal exception', () => {
        const code = `
            INT 0, 3
            LIT 0, 10
            LIT 0, 0
            OPR 0, 5
            RET 0, 0
        `;
        const parsed = ParseAndValidate(code);
        const model = InitModel(1024, 250);

        let caughtError = false;
        try {
            for (let i = 0; i < 10; i++) {
                NextStep({ model, instructions: parsed.instructions, input: '' });
            }
        } catch (e) {
            caughtError = true;
            if (model.stats) {
                model.stats.haltedOnError = true;
            }
        }

        assert.strictEqual(caughtError, true);
        assert.strictEqual(model.stats?.haltedOnError, true);
        assert.strictEqual(model.stats?.completedNormally, false);
        assert.strictEqual(model.stats?.instructionCounts['OPR'], 1);
    });
});

describe('Instruction Help Texts & Halting Consistency', () => {
    const allInstructions = [
        'lit', 'opr', 'lod', 'sto', 'cal', 'int',
        'jmp', 'jmc', 'ret', 'rea', 'wri', 'new',
        'del', 'lda', 'sta', 'pld', 'pst', 'itr',
        'rti', 'opf',
    ];

    it('all instructions have halting notes in both Czech and English ui.json', () => {
        for (const op of allInstructions) {
            const haltKey = `help_${op}_halt` as keyof typeof enUi;
            assert.ok(enUi[haltKey], `Missing EN key help_${op}_halt`);
            assert.strictEqual(typeof enUi[haltKey], 'string');
            assert.ok((enUi[haltKey] as string).length > 5);

            assert.ok(csUi[haltKey], `Missing CS key help_${op}_halt`);
            assert.strictEqual(typeof csUi[haltKey], 'string');
            assert.ok((csUi[haltKey] as string).length > 5);
        }
    });

    it('all statistics localization keys exist in both Czech and English ui.json', () => {
        const requiredStatKeys = [
            'headerStatistics',
            'tabWarnings',
            'tabStatistics',
            'statsOverview',
            'statsInstructions',
            'statsMemory',
            'statsBranches',
            'statsProcedures',
            'statsTotalSteps',
            'statsPeakStack',
            'statsCurrentStack',
            'statsPeakHeap',
            'statsCurrentHeap',
            'statsPeakTotalMemory',
            'statsPeakHeapBlocks',
            'statsTotalHeapAllocations',
            'statsTotalHeapDeallocations',
            'statsBranchTakenRatio',
            'statsBranchesTaken',
            'statsBranchesNotTaken',
            'statsTotalBranches',
            'statsUnconditionalJumps',
            'statsProcedureCalls',
            'statsProcedureReturns',
            'statsPeakCallDepth',
            'statsStatus',
            'statsCompletedNormally',
            'statsHaltedOnError',
            'statsRunning',
            'statsNotStarted',
            'statsWarningsCount',
            'statsCategoryArithmetic',
            'statsCategoryMemory',
            'statsCategoryControl',
            'statsCategoryProcedures',
            'statsCategoryHeap',
            'statsCategoryIO',
            'statsPercentage',
            'statsCount',
            'statsMnemonic',
            'statsCategory',
            'statsNoData',
            'helpSystemHaltHeader',
            'helpCanHaltYes',
            'helpCanHaltNo',
            'helpHaltConditions',
            'btnStop',
            'speedLabel',
            'stepDelay',
            'speedFast',
            'speedSlow',
            'msPerStep',
            'swapPanels',
            'maximizeStats',
            'maximizeMemory',
            'splitEvenly',
            'dragToResize',
        ];

        for (const key of requiredStatKeys) {
            assert.ok(enUi[key as keyof typeof enUi], `Missing EN key: ${key}`);
            assert.ok(csUi[key as keyof typeof csUi], `Missing CS key: ${key}`);
        }
    });
});
