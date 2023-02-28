import { mapped, partial, total } from './types';
import { pureOptic } from './pureOptic';
import { PureOptic } from './PureOptic.types';

const expectType = <T extends any>(t: T) => {};
const expectPartial = <TOpticType extends partial>(
    optic: PureOptic<any, TOpticType>,
    t: TOpticType extends total ? never : true,
) => {};

const expectTotal = (optic: PureOptic<any, total>) => {};
const expectMapped = (optic: PureOptic<any, mapped>) => {};

describe('lens', () => {
    const obj = { a: { as: [1, 2, 3] } };
    const onAsFirst = pureOptic<typeof obj>().a.as[0];

    it('should be referentially stable', () => {
        expect(onAsFirst.set(1, obj)).toBe(obj);
        expect(onAsFirst.set((prev) => prev, obj)).toBe(obj);
    });
});
describe('optional', () => {
    type TestObj = { a: { b?: { c: number } } };
    const onC = pureOptic<TestObj>().a.b.c;
    const testObj: TestObj = { a: { b: undefined } };
    it('should return undefined', () => {
        expect(onC.get(testObj)).toBeUndefined();
    });
    it('should noop when setting value', () => {
        expect(onC.set(42, testObj)).toBe(testObj);
    });
});
describe('refine', () => {
    type FooBar = { type: 'foo'; foo: string } | { type: 'bar'; bar: number };
    const foo: FooBar = { type: 'foo', foo: 'test' };
    it('should focus on a part of the union', () => {
        const onFoo = pureOptic<FooBar>().refine((a) => a.type === 'foo' && a);
        expect(onFoo.get(foo)?.foo).toBe('test');

        const updated = onFoo.set({ type: 'foo', foo: 'newFoo' }, foo);
        expect(onFoo.get(updated)?.foo).toBe('newFoo');
    });
    it('should handle the type narrowing failing', () => {
        const onBar = pureOptic<FooBar>().refine((a) => a.type === 'bar' && a);
        expect(onBar.get(foo)).toBeUndefined();
        expect(onBar.set({ type: 'bar', bar: 99 }, foo)).toBe(foo);
    });
});
describe('convert', () => {
    const onObject = pureOptic<[string, number]>().convert(
        ([name, age]) => ({ name, age }),
        ({ name, age }) => [name, age],
    );

    it('should convert from tuple to object', () => {
        expect(onObject.get(['Jean', 42])).toStrictEqual({ name: 'Jean', age: 42 });
        expect(onObject.set({ name: 'Albert', age: 65 }, ['Jean', 34])).toStrictEqual(['Albert', 65]);
    });
    it('should convert from celcius to fahrenheit', () => {
        const onTemp = pureOptic<number>().convert(
            (celcius) => celcius * (9 / 5) + 32,
            (fahrenheit) => (fahrenheit - 32) * (5 / 9),
        );

        expect(onTemp.get(0)).toBe(32);
        expect(onTemp.get(100)).toBe(212);
        expect(onTemp.set(212, 0)).toBe(100);
    });
});
describe('if', () => {
    const onEvenNumber = pureOptic<number>().if((n) => n % 2 === 0);

    const onMajorName = pureOptic<{ age: number; name: string }>().if(({ age }) => age >= 18).name;
    const major = { age: 42, name: 'Louis' };
    const minor = { age: 15, name: 'Killian' };
    it('should get result with predicate true', () => {
        expect(onEvenNumber.get(2)).toBe(2);
        expect(onEvenNumber.set(4, 2)).toBe(4);

        expect(onMajorName.get(major)).toBe('Louis');
        expect(onMajorName.set('François', major)).toStrictEqual({ name: 'François', age: 42 });
    });
    it('should return undefined with predicate false', () => {
        expect(onEvenNumber.get(3)).toBeUndefined();
        expect(onEvenNumber.set(2, 3)).toBe(3);

        expect(onMajorName.get(minor)).toBeUndefined();
        expect(onMajorName.set('Titouan', minor)).toBe(minor);
    });
});
describe('focus string key', () => {
    const countryCodes: Record<string, number> = { france: 33, germany: 49, italy: 39 };
    const onCountryCodes = pureOptic<typeof countryCodes>();

    it('should focus on the value indexed by the key', () => {
        const onFrance = onCountryCodes['france'];
        expect(onFrance.get(countryCodes)).toBe(33);
        expect(onFrance.set(-1, countryCodes)).toStrictEqual({ france: -1, germany: 49, italy: 39 });
    });
    it('should find no key and return undefined', () => {
        const onSpain = onCountryCodes['spain'];
        expect(onSpain.get(countryCodes)).toBeUndefined();
    });
    it("should allow to set a key if it doesn't exist yet", () => {
        const onSpain = onCountryCodes['spain'];
        expect(onSpain.set(34, countryCodes)).toEqual({ france: 33, germany: 49, italy: 39, spain: 34 });
    });
});
describe('default', () => {
    type Test = { a?: { b?: number } };
    const onB = pureOptic<Test>().a.b.default(() => 42);

    it('should use fallback', () => {
        const test: Test = { a: { b: undefined } };
        expect(onB.get(test)).toBe(42);
        expect(onB.set(90, test)).toEqual({ a: { b: 90 } });
    });
});
describe('toPartial', () => {
    const onA = pureOptic<{ a?: number }>().a.toPartial();
    expectPartial(onA, true);
    expect(onA.get({ a: undefined })).toBe(undefined);
    expect(onA.set((prev) => prev + 10, { a: undefined })).toEqual({ a: undefined });
    expect(onA.set((prev) => prev + 10, { a: 42 })).toEqual({ a: 52 });

    const onB = pureOptic<{ a?: { b?: number } }>().a.b.toPartial();
    expectPartial(onB, true);
    expect(onB.get({ a: { b: undefined } })).toBe(undefined);
    expect(onB.set((prev) => prev + 10, { a: { b: undefined } })).toEqual({ a: { b: undefined } });
    expect(onB.set((prev) => prev + 10, { a: { b: 42 } })).toEqual({ a: { b: 52 } });

    const onAs = pureOptic<{ a?: number }[]>().map().a.toPartial();
    expectMapped(onAs);
    expect(onAs.get([{ a: undefined }, { a: 42 }])).toEqual([42]);
    expect(onAs.set((prev) => prev + 10, [{ a: undefined }, { a: 42 }])).toEqual([{ a: undefined }, { a: 52 }]);
});
describe('entries', () => {
    const state: Record<string, number> = { a: 42, b: 67, c: 1000, d: 90 };
    const onState = pureOptic<typeof state>();
    it('should map over object entries', () => {
        const onEntries = onState.entries();
        expect(onEntries.get(state)).toEqual([
            ['a', 42],
            ['b', 67],
            ['c', 1000],
            ['d', 90],
        ]);
        const newState = onEntries.set((prev) => prev.map(([k, v]) => [k.toUpperCase(), v * 2]), state);
        expect(newState).toEqual({ A: 84, B: 134, C: 2000, D: 180 });
    });
    it('should map over object values', () => {
        const onValues = onState.values();
        expect(onValues.get(state)).toEqual([42, 67, 1000, 90]);
        const newState = onValues.set((prev) => prev.map((value) => value * 2), state);
        expect(newState).toEqual({ a: 84, b: 134, c: 2000, d: 180 });
    });
});
describe('custom optic', () => {
    const onEvenNums = pureOptic(
        (s: number[]) => s.filter((n) => n % 2 === 0),
        (a) => a,
        'onEven',
    );
    const nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    it('should work', () => {
        expect(onEvenNums.get(nums)).toStrictEqual([0, 2, 4, 6, 8]);
        expect(onEvenNums.set([42, 84], nums)).toStrictEqual([42, 84]);
    });

    const countryInfos: Record<string, { capital: string }> = {
        france: { capital: 'Paris' },
        germany: { capital: 'Berlin' },
    };
    it('should work', () => {
        const onCountry = (country: string) =>
            pureOptic(
                (s: typeof countryInfos) => s[country],
                (a, s) => (s[country] !== undefined ? { ...s, [country]: a } : s),
                'onCountry ' + country,
            );
        const onFrance = onCountry('france');
        const onSpain = onCountry('spain');

        expect(onFrance.get(countryInfos)?.capital).toBe('Paris');
        expect(onSpain.get(countryInfos)?.capital).toBeUndefined();
        expect(onFrance.set({ capital: 'Marseille' }, countryInfos)['france']).toStrictEqual({ capital: 'Marseille' });
        expect(onSpain.set({ capital: 'Barcelona' }, countryInfos)).toBe(countryInfos);
    });
});