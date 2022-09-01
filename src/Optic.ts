import { BaseOptic } from './BaseOptic';
import { FocusedValue, Lens, OpticType, total } from './types';
import { Store, stores } from './Store';

export class Optic<A, TOpticType extends OpticType = total, S = any> extends BaseOptic<A, TOpticType, S> {
    private storeId: Optic<any, TOpticType, S>;
    private cachedS: any;
    private cachedA: any;

    constructor(lenses: Lens[], private initialValue: S, _storeId?: Optic<any, TOpticType, S>) {
        super(lenses);
        this.storeId = _storeId ?? this;
    }

    protected override derive(newLenses: Lens[]) {
        return new Optic([...this.lenses, ...newLenses], this.initialValue, this.storeId);
    }

    private getStore(): Store<S> {
        const store = stores.get(this.storeId);
        if (!store) {
            const newStore: Store<S> = { state: this.initialValue, listeners: new Set() };
            stores.set(this.storeId, newStore);
            return newStore;
        }
        return store;
    }

    getState = (): FocusedValue<A, TOpticType> => {
        const store = this.getStore();
        if (store.state === this.cachedS && this.cachedA !== undefined) return this.cachedA;
        const a = this.get(store.state);
        this.cachedS = store.state;
        this.cachedA = a;
        return a;
    };

    setState = (a: A | ((prev: A) => A)) => {
        const store = this.getStore();
        store.state = this.set(a, store.state);
        store.listeners.forEach((listener) => listener(store.state));
    };

    subscribe = (listener: (a: FocusedValue<A, TOpticType>) => void) => {
        const store = this.getStore();
        const stateListener = (s: S) => listener(this.get(s));
        store.listeners.add(stateListener);
        return () => {
            store.listeners.delete(stateListener);
        };
    };
}

declare module './BaseOptic' {
    export interface ResolveClass<TOptic extends BaseOptic<any, OpticType>, A, TOpticType extends OpticType, S> {
        (): TOptic extends Optic<any, OpticType> ? Optic<A, TOpticType, S> : BaseOptic<A, TOpticType, S>;
    }
}
