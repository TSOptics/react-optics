import { optic } from '../src/Optic';

describe('Focus method', () => {
    const obj = { a: { as: [1, 2, 3] } };
    const onAsFirst = optic<typeof obj>().focus('a', 'as', 0);

    it('should focus object', () => {
        const newObj = onAsFirst.set(42, obj);
        expect(onAsFirst.get(newObj)).toBe(42);
    });
});
