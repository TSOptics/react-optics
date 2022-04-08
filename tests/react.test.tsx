import React, { memo, useCallback, useRef } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import createStore from '../src/react/createStore';
import { act } from 'react-test-renderer';
import { Optic } from '../src/Optic';
import { render, fireEvent } from '@testing-library/react';
import useOptic from '../src/react/useOptic';
import Provider from '../src/react/provider';
import { total } from '../src/types';
import { optic } from '../src/constructors';
import useKeyedOptics from '../src/react/useKeyedOptics';

describe('useOptic', () => {
    it('should set state', () => {
        const onRoot = createStore({ test: 42 });
        const { result } = renderHook(() => useOptic(onRoot), { wrapper: Provider });
        act(() => result.current[1]((prev) => ({ test: prev.test * 2 })));
        expect(result.current[0]).toStrictEqual({ test: 84 });
    });
    it('should return referentially stable state and setter', () => {
        const onRoot = createStore({ test: 42 });
        const { result, rerender } = renderHook(() => useOptic(onRoot), {
            wrapper: Provider,
        });
        const [prevState, prevSetState] = result.current;
        rerender();
        const [state, setState] = result.current;
        expect(prevState).toBe(state);
        expect(prevSetState).toBe(setState);
    });
    it('should not rerender when calling setter with the same reference', () => {
        const onRoot = createStore({ test: 42 });
        const { result } = renderHook(() => useOptic(onRoot), {
            wrapper: Provider,
        });
        const initialResult = result.current;
        act(() => initialResult[1]((prev) => prev));
        expect(result.current).toBe(initialResult);
    });

    it('should only accept optics with the stores as root', () => {
        const onA: Optic<string, total, any> = optic<{ a: string }>().focus('a');
        const {
            result: { error },
        } = renderHook(() => useOptic(onA), { wrapper: Provider });
        expect(error?.message).toBe("This optic isn't linked to a store");
    });
    it('should update state if optic changes', () => {
        const onRoot = createStore({ test: 42 });
        const timesTwo = onRoot.convert(
            (a) => ({
                test: a.test * 2,
            }),
            (b) => ({
                test: b.test / 2,
            }),
        );
        const { result, rerender } = renderHook(
            ({ initialValue }: { initialValue: typeof onRoot }) => useOptic(initialValue),
            {
                wrapper: Provider,
                initialProps: { initialValue: onRoot },
            },
        );
        rerender({ initialValue: timesTwo });
        expect(result.current[0]).toEqual({ test: 84 });
    });
    it('should not exhibit the zombie child problem', () => {
        const onState = createStore<number[]>([42]);
        const onFirst = onState.focus(0);

        const Children = ({ onElem }: { onElem: Optic<number> }) => {
            const [elem] = useOptic(onElem);
            return <>{elem.toString()}</>;
        };
        const Parent = () => {
            const [state, setState] = useOptic(onState);
            return (
                <>
                    {state.length > 0 ? <Children onElem={onFirst} /> : null}
                    <button onClick={() => setState([])}>delete</button>
                </>
            );
        };

        const { getByText } = render(<Parent />, { wrapper: Provider });
        const button = getByText('delete');
        fireEvent.click(button);
    });
});
describe('useKeyedOptics', () => {
    const Number = memo(({ onNumber }: { onNumber: Optic<number> }) => {
        const [n] = useOptic(onNumber);
        const renders = useRef(0);
        renders.current = renders.current + 1;

        return (
            <div data-testid="elems">
                <h1 data-testid="renders">{renders.current}</h1>
                <h1 data-testid="display">{n}</h1>
            </div>
        );
    });

    const Numbers = ({ onArray }: { onArray: Optic<number[]> }) => {
        const [array, setArray] = useOptic(onArray);
        const getOptic = useKeyedOptics(onArray, (n) => n.toString());

        const prepend = useCallback(() => {
            setArray((prev) => [prev[0] - 1, ...prev]);
        }, [setArray]);

        return (
            <div>
                <button onClick={prepend}>prepend</button>
                {array.map((n) => {
                    const key = n.toString();
                    return <Number onNumber={getOptic(key)} key={key} />;
                })}
            </div>
        );
    };
    const onArray = createStore([1, 2, 3, 4, 5]);

    it('should not rerender the cells when prepending', () => {
        const { getAllByTestId, getByText } = render(<Numbers onArray={onArray} />, { wrapper: Provider });
        const prepend = getByText('prepend');
        fireEvent.click(prepend);
        const elems = getAllByTestId('display');
        const renders = getAllByTestId('renders');
        expect(elems.map((x) => x.textContent)).toStrictEqual(['0', '1', '2', '3', '4', '5']);
        expect(renders.map((x) => x.textContent)).toEqual(['1', '1', '1', '1', '1', '1']);
    });
    it('should only accept optics with the stores as root', () => {
        const onArray: Optic<number[], total, any> = optic<number[]>();
        const {
            result: { error },
        } = renderHook(() => useKeyedOptics(onArray, (n) => n.toString()), { wrapper: Provider });
        expect(error?.message).toBe("This optic isn't linked to a store");
    });
    it('should update if the optic changes', () => {
        const onEvens = createStore([0, 2, 4, 6]);
        const onOdds = createStore([1, 3, 5, 7]);
        const { result, rerender } = renderHook(
            ({ optic }: { optic: typeof onEvens }) => useKeyedOptics(optic, (n) => n.toString()),
            {
                wrapper: Provider,
                initialProps: { optic: onEvens },
            },
        );

        const evenKeys = ['0', '2', '4', '6'];
        const oddKeys = ['1', '3', '5', '7'];
        for (const evenKey of evenKeys) {
            expect(result.current(evenKey)).toBeDefined();
        }
        for (const oddKey of oddKeys) {
            expect(result.current(oddKey)).toBeUndefined();
        }

        rerender({ optic: onOdds });
        for (const oddKey of oddKeys) {
            expect(result.current(oddKey)).toBeDefined();
        }
        for (const evenKey of evenKeys) {
            expect(result.current(evenKey)).toBeUndefined();
        }
    });
});
