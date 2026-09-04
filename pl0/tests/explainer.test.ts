import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ParseAndValidate } from '../core/validator';
import { InitModel, NextStep } from '../core/operations';
import { ExplainInstruction } from '../core/explainer';
import i18next from 'i18next';
import csCore from '../localization/cs/core.json';
import enCore from '../localization/en/core.json';

// Ensure i18next is initialized for the tests
if (!i18next.isInitialized) {
    i18next.init({
        lng: 'en',
        fallbackLng: 'en',
        resources: {
            cs: { core: csCore },
            en: { core: enCore },
        },
    });
}

describe('Instruction Explainer', () => {
    it('describes the actual operation for the last instruction in a program', () => {
        const code = [
            'lit 0 10',
            'lit 0 20',
            'lit 0 30',
            'opr 0 3',
            'opr 0 4',
        ].join('\n');

        const parseResult = ParseAndValidate(code);
        assert.strictEqual(parseResult.parseOK, true);
        assert.strictEqual(parseResult.validationOK, true);
        const instructions = parseResult.instructions;

        const model = InitModel(1024, 250);

        // Step through 4 instructions so we arrive at the 5th (and last) instruction: opr 0 4
        for (let i = 0; i < 4; i++) {
            NextStep({ model, instructions, input: '' });
        }

        // Now pc is 4 (the last instruction: opr 0 4)
        assert.strictEqual(model.pc, 4);
        assert.strictEqual(instructions[model.pc].parameter, 4);

        // Explain instruction at pc = 4
        const explanation = ExplainInstruction({ model, instructions, input: '' });

        // It must NOT be the bogus "Next instruction does not exist" message
        assert.notStrictEqual(explanation.message, i18next.t('core:explainerEndNoMoreInstructions'));
        assert.notStrictEqual(explanation.message, 'Next instruction does not exist');
        assert.notStrictEqual(explanation.message, 'Další instrukce neexistuje');

        // It MUST describe the multiplication operation
        assert.strictEqual(
            explanation.message,
            i18next.t('core:explainerOPR4')
        );
        // It should have placeholders for operands on stack
        assert.strictEqual(explanation.placeholders.length, 2);
    });

    it('performs and describes last instruction in Czech as well', () => {
        i18next.changeLanguage('cs');
        try {
            const code = [
                'lit 0 10',
                'lit 0 20',
                'opr 0 2',
            ].join('\n');

            const parseResult = ParseAndValidate(code);
            const instructions = parseResult.instructions;
            const model = InitModel(1024, 250);

            // Step 2 instructions to arrive at opr 0 2 (ADD)
            NextStep({ model, instructions, input: '' });
            NextStep({ model, instructions, input: '' });

            assert.strictEqual(model.pc, 2);
            const explanation = ExplainInstruction({ model, instructions, input: '' });

            assert.notStrictEqual(explanation.message, 'Další instrukce neexistuje');
            assert.strictEqual(
                explanation.message,
                i18next.t('core:explainerOPR2')
            );
            assert.strictEqual(explanation.placeholders.length, 2);
        } finally {
            i18next.changeLanguage('en');
        }
    });

    it('describes a single-instruction program correctly without saying next does not exist', () => {
        const code = 'lit 0 42';
        const parseResult = ParseAndValidate(code);
        const instructions = parseResult.instructions;
        const model = InitModel(1024, 250);

        assert.strictEqual(model.pc, 0);
        const explanation = ExplainInstruction({ model, instructions, input: '' });

        assert.strictEqual(explanation.message, i18next.t('core:explainerLIT'));
        assert.strictEqual(explanation.placeholders.length, 1);
        assert.strictEqual(explanation.placeholders[0].value, '42');
    });
});
