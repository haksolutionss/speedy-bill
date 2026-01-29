import { DbTable } from "@/types/database";

export const sortTablesByNumber = (a: DbTable, b: DbTable) => {
    const parse = (value: string) => {
        const match = value.match(/^([A-Za-z]+)?(\d+)$/);
        if (!match) return { prefix: value, num: 0 };

        return {
            prefix: match[1] ?? '',
            num: Number(match[2]),
        };
    };

    const aVal = parse(a.number);
    const bVal = parse(b.number);

    // First sort by prefix (T, A, P)
    if (aVal.prefix !== bVal.prefix) {
        return aVal.prefix.localeCompare(bVal.prefix);
    }

    // Then by numeric value
    return aVal.num - bVal.num;
};
