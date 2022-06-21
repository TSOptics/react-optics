import React, { memo, useCallback, useRef } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { createStore } from './Store';
import { act } from 'react-test-renderer';
import { render, fireEvent } from '@testing-library/react';
import useOptic from './useOptic';
import { partial, total } from '../types';
import { optic } from '../constructors';
import useKeyedOptics from './useKeyedOptics';
import useOpticReducer from './useOpticReducer';
import { StoreOptic } from './StoreOptic';
import { Optic } from '../Optic';
import { noop } from '../utils';

const expectType = <T extends any>(t: T) => noop();

describe('StoreOptic', () => {
    it('should be a subtype of Optic', () => {
        const storeOptic = {} as StoreOptic<number>;
        const baseOptic: Optic<number> = storeOptic;
    });
    it('should be covariant on type param TOpticType', () => {
        const storeOptic = {} as StoreOptic<number>;
        const basePartialOptic: Optic<number, partial> = storeOptic;
        const storePartialOptic: StoreOptic<number, partial> = storeOptic;
    });
    it('should compose with plain optics', () => {
        const onState = createStore({ a: { b: 42 } });
        const onNumber = optic<{ b: number }>().focus('b');
        const onNumberFromState = onState.focus('a').compose(onNumber);
        expectType<StoreOptic<number, total, { a: { b: number } }>>(onNumberFromState);
        expect(onNumberFromState.getState()).toBe(42);
    });
});
describe('useOptic', () => {
    it('should set state', () => {
        const onRoot = createStore({ test: 42 });
        const { result } = renderHook(() => useOptic(onRoot));
        act(() => result.current[1]((prev) => ({ test: prev.test * 2 })));
        expect(result.current[0]).toStrictEqual({ test: 84 });
    });
    it('should return referentially stable state and setter', () => {
        const onRoot = createStore({ test: 42 });
        const { result, rerender } = renderHook(() => useOptic(onRoot));
        const [prevState, prevSetState] = result.current;
        rerender();
        const [state, setState] = result.current;
        expect(prevState).toBe(state);
        expect(prevSetState).toBe(setState);
    });
    it('should not rerender when calling setter with the same reference', () => {
        const onRoot = createStore({ test: 42 });
        const { result } = renderHook(() => useOptic(onRoot));
        const initialResult = result.current;
        act(() => initialResult[1]((prev) => prev));
        expect(result.current).toBe(initialResult);
    });

    it("shouldn't only accept base optics", () => {
        const onA: Optic<any> = optic<{ a: string }>().focus('a');
        // @ts-expect-error
        renderHook(() => useOptic(onA));
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
                initialProps: { initialValue: onRoot },
            },
        );
        rerender({ initialValue: timesTwo });
        expect(result.current[0]).toEqual({ test: 84 });
    });
    it('should not exhibit the zombie child problem', () => {
        const onState = createStore<number[]>([42]);
        const onFirst = onState.focus(0);

        const Children = ({ onElem }: { onElem: StoreOptic<number> }) => {
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

        const { getByText } = render(<Parent />);
        const button = getByText('delete');
        fireEvent.click(button);
    });
});
describe('useKeyedOptics', () => {
    const Number = memo(({ onNumber }: { onNumber: StoreOptic<number> }) => {
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

    const Numbers = ({ onArray }: { onArray: StoreOptic<number[]> }) => {
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
        const { getAllByTestId, getByText } = render(<Numbers onArray={onArray} />);
        const prepend = getByText('prepend');
        fireEvent.click(prepend);
        const elems = getAllByTestId('display');
        const renders = getAllByTestId('renders');
        expect(elems.map((x) => x.textContent)).toStrictEqual(['0', '1', '2', '3', '4', '5']);
        expect(renders.map((x) => x.textContent)).toEqual(['1', '1', '1', '1', '1', '1']);
    });
    it('should only accept optics with the stores as root', () => {
        const onArray = optic<number[]>();
        // @ts-expect-error
        renderHook(() => useKeyedOptics(onArray, (n) => n.toString()));
    });
    it('should update if the optic changes', () => {
        const onEvens = createStore([0, 2, 4, 6]);
        const onOdds = createStore([1, 3, 5, 7]);
        const { result, rerender } = renderHook(
            ({ optic }: { optic: typeof onEvens }) => useKeyedOptics(optic, (n) => n.toString()),
            {
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
describe('useOpticReducer', () => {
    type State = { counter: number; step: number };
    type Action =
        | { type: 'increment' }
        | { type: 'decrement' }
        | { type: 'changeStep'; step: number }
        | { type: 'reset' };
    const initialValue: State = { counter: 0, step: 1 };
    const onState = createStore(initialValue);
    const reducer = (state: State, action: Action): State => {
        switch (action.type) {
            case 'increment':
                return { ...state, counter: state.counter + state.step };
            case 'decrement':
                return { ...state, counter: state.counter - state.step };
            case 'changeStep':
                return { ...state, step: action.step };
            case 'reset':
                return initialValue;
        }
    };
    const reducerWithOptic = (state: State, action: Action, onState: Optic<State, total, State>): State => {
        const onCounter = onState.focus('counter');
        const onStep = onState.focus('step');
        switch (action.type) {
            case 'increment':
                return onCounter.set((prev) => prev + state.step, state);
            case 'decrement':
                return onCounter.set((prev) => prev - state.step, state);
            case 'changeStep':
                return onStep.set(action.step, state);
            case 'reset':
                return initialValue;
        }
    };
    it('should dispatch actions', () => {
        const { result, rerender } = renderHook(({ initialReducer }) => useOpticReducer(onState, initialReducer), {
            initialProps: { initialReducer: reducer as typeof reducerWithOptic },
        });
        const dispatchActions = () => {
            result.current[1]({ type: 'increment' });
            result.current[1]({ type: 'increment' });
            result.current[1]({ type: 'changeStep', step: 20 });
            result.current[1]({ type: 'increment' });
            result.current[1]({ type: 'changeStep', step: 5 });
            result.current[1]({ type: 'decrement' });
        };
        act(dispatchActions);
        expect(result.current[0]).toEqual({ counter: 17, step: 5 });

        act(() => result.current[1]({ type: 'reset' }));
        rerender({ initialReducer: reducerWithOptic });
        expect(result.current[0]).toEqual({ counter: 0, step: 1 });

        act(dispatchActions);
        expect(result.current[0]).toEqual({ counter: 17, step: 5 });
    });
});
describe('direct store access', () => {
    const onState = createStore({ a: 42 });
    expect(onState.getState()).toEqual({ a: 42 });

    onState.setState({ a: 100 });
    expect(onState.getState()).toEqual({ a: 100 });

    const onNumber = onState.focus('a');
    const listener = jest.fn();
    onNumber.subscribe(listener);
    onState.setState({ a: 42 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(42);
});