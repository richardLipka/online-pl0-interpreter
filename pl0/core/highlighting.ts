import { Placeholder, HighlightType } from './explainer';

export const hightlightColors: string[] = ['#FFC482', '#E2B6CE', '#A4F9C8', '#b6f7fc'];

export interface ExplanationMessagePart {
    content: string;
    placeholder: Placeholder | null;
    color: string | null;
}

export function SplitExplanationMessageParts(
    message: string,
    placeholders: Placeholder[]
): ExplanationMessagePart[] {
    const parts: ExplanationMessagePart[] = [];
    let lastColorIndexUsed = -1;

    const splParts = message.split('%') ?? [];
    let first = true;
    for (const p of splParts) {
        const trimmed = p.trim();

        if (first) {
            // first do not start with placeholde
            first = false;

            if (trimmed.length > 0) {
                const part: ExplanationMessagePart = {
                    content: p,
                    placeholder: null,
                    color: null,
                };

                parts.push(part);
            }
        } else {
            if (trimmed.length == 0) {
                continue;
            }

            const first = p.substring(0, 1);
            const rest = p.substring(1);

            if (first.length > 0) {
                const placeholdersValid =
                    placeholders.filter((e) => e.placeholder == first) ?? [];

                if (placeholdersValid[0]) {
                    lastColorIndexUsed =
                        (lastColorIndexUsed + 1) % hightlightColors.length;
                }
                parts.push({
                    content: first,
                    placeholder: placeholdersValid[0] ?? null,
                    color: hightlightColors[lastColorIndexUsed],
                });
            }
            if (rest.length > 0) {
                parts.push({ content: rest, placeholder: null, color: null });
            }
        }
    }

    return parts ?? [];
}

export function FilterParts(parts: ExplanationMessagePart[]) {
    return parts.filter((p) => p.placeholder !== null);
}

export function StackToBeHighlighted(
    parts: ExplanationMessagePart[] | null
): Map<number, string> {
    if (!parts) {
        return new Map<number, string>();
    }
    let colorMap = new Map<number, string>();

    for (const part of FilterParts(parts)) {
        if (part.placeholder?.stack && part.color) {
            for (const stck of part.placeholder?.stack) {
                colorMap.set(stck, part.color);
            }
        }
    }

    return colorMap;
}

export interface InstructionsHighligting {
    rowColors: Map<number, string>;
    level: string | null;
    parameter: string | null;
}
export function InstructionsToBeHighlighted(
    parts: ExplanationMessagePart[] | null
): InstructionsHighligting {
    const ih: InstructionsHighligting = {
        rowColors: new Map<number, string>(),
        level: null,
        parameter: null,
    };

    if (!parts) {
        return ih;
    }

    for (const part of FilterParts(parts)) {
        if (part.placeholder && part.color) {
            if (part.placeholder.instructions) {
                for (const instructions of part.placeholder.instructions) {
                    ih.rowColors.set(instructions, part.color);
                }
            }

            if (part.placeholder.level) {
                ih.level = part.color;
            }
            if (part.placeholder.parameter) {
                ih.parameter = part.color;
            }
        }
    }

    return ih;
}

export function HeapToBeHighlighted(
    parts: ExplanationMessagePart[] | null
): Map<number, string> {
    if (!parts) {
        return new Map<number, string>();
    }
    let colorMap = new Map<number, string>();

    for (const part of FilterParts(parts)) {
        if (part.placeholder?.heap && part.color) {
            for (const heap of part.placeholder.heap) {
                colorMap.set(heap, part.color);
            }
        }
    }

    return colorMap;
}
