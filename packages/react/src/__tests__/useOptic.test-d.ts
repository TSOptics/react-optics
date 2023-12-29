/* eslint-disable react-hooks/rules-of-hooks */
import {
    AsyncOptic,
    AsyncReadOptic,
    Optic,
    PureOptic,
    ReadOptic,
    createState,
    mapped,
    partial,
    total,
} from '@optics/state';
import { expectAssignable, expectNotAssignable, expectType } from 'tsd';
import { Dispatch, SetStateAction } from 'react';
import { useOptic } from '../useOptic';

describe('optic type', () => {
    it('should return the value and a setter for write optics', () => {
        expectAssignable<[number, { setState: Dispatch<SetStateAction<number>> }]>(useOptic({} as Optic<number>));
        expectAssignable<[number, { setState: Dispatch<SetStateAction<number>> }]>(useOptic({} as AsyncOptic<number>));
    });
    it('should return only the value for read optics', () => {
        expectNotAssignable<[number, { setState: Dispatch<SetStateAction<number>> }]>(
            useOptic({} as ReadOptic<number>),
        );
        expectNotAssignable<[number, { setState: Dispatch<SetStateAction<number>> }]>(
            useOptic({} as AsyncReadOptic<number>),
        );
    });
    it("shouldn't accept non stateful optics", () => {
        // @ts-expect-error
        useOptic({} as PureOptic<number>);
    });
});

describe('optic scope', () => {
    it('should return a nullable value for partial optic', () => {
        expectType<number | undefined>(useOptic({} as Optic<number, partial>)[0]);
    });
    it('should return an array for mapped optic', () => {
        expectAssignable<[number[], { setState: Dispatch<SetStateAction<number>> }]>(
            useOptic({} as Optic<number, mapped>),
        );
    });
});

describe('getOptics', () => {
    it('should return the getOptic function when the focused type is an array', () => {
        expectAssignable<{ getOptics: (getKey: (t: number) => string) => readonly [string, Optic<number>][] }>(
            useOptic({} as Optic<number[]>)[1],
        );
        expectNotAssignable<{ getOptics: (getKey: (t: number) => string) => readonly [string, Optic<number>][] }>(
            useOptic({} as Optic<number>)[1],
        );
    });
    it('should return the getOpticFromMapping function when the optic is mapped', () => {
        expectAssignable<{
            getOpticsFromMapping: (getKey: (t: number) => string) => readonly [string, Optic<number>][];
        }>(useOptic({} as Optic<number, mapped>)[1]);
        expectNotAssignable<{
            getOpticsFromMapping: (getKey: (t: number) => string) => readonly [string, Optic<number>][];
        }>(useOptic({} as Optic<number>)[1]);
    });
    it('should return both functions when the optic is mapped and the focused type is an array', () => {
        expectAssignable<{
            getOptics: (getKey: (t: number) => string) => readonly [string, Optic<number>][];
            getOpticsFromMapping: (getKey: (t: number[]) => string) => readonly [string, Optic<number[]>][];
        }>(useOptic({} as Optic<number[], mapped>)[1]);
    });
});

describe('references', () => {
    type StateWithRef = { a: Optic<{ b: number }> };
    it("should return the normalized value if denormalized isn't explicitly set to true", () => {
        expectType<StateWithRef>(useOptic({} as Optic<StateWithRef>)[0]);
        expectType<StateWithRef>(useOptic({} as Optic<StateWithRef>, {})[0]);
        expectType<StateWithRef>(useOptic({} as Optic<StateWithRef>, { denormalize: false })[0]);
    });
    it('should return the denormalized value if denormalized is explicitly set to true', () => {
        expectType<{ a: { b: number } }>(useOptic({} as Optic<StateWithRef>, { denormalize: true })[0]);
    });
});

describe('hasValue', () => {
    const optic = {} as Optic<number | undefined, partial>;
    const [, { hasValue }] = useOptic(optic);

    it('should narrow a partial to a non-nullable total if predicate is true', () => {
        hasValue((totalOptic) => expectType<Optic<number, total>>(totalOptic));
    });

    it('should return the union of null and the type returned by the function', () => {
        expectType<number | null>(hasValue(() => 42));
    });
});

describe('guard', () => {
    type A = {
        type: 'a';
        a: number;
    };
    type B = {
        type: 'b';
        b: string;
    };
    type Union = A | B;

    const unionOptic = createState<Union>({ type: 'a', a: 42 });
    const [, { guard }] = useOptic(unionOptic);

    it('should narrow the union to the type returned by the predicate', () => {
        guard((union) => union.type === 'a' && union)((optic) => expectType<Optic<A, total>>(optic));
    });

    it('should narrow the union to the type specified by the type guard', () => {
        guard((union): union is A => union.type === 'a')((optic) => expectType<Optic<A, total>>(optic));
    });

    it('should return the union of null and the type returned by the function', () => {
        expectType<number | null>(guard((union) => union.type === 'a' && union)(() => 42));
    });
});
