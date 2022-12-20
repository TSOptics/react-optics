export interface partial {
    partial: 'partial';
}

export interface total extends partial {
    total: 'total';
}

export interface mapped {
    map: 'map';
}

export type OpticType = mapped | partial;

export interface Lens<A = any, S = any> {
    key: string;
    get: (s: S) => A;
    set: (a: A, s: S) => S;
    type?: 'fold' | 'foldN' | 'map' | 'nullable';
}

type StrictMode = null extends string ? false : true;
export type IsNullable<T> = StrictMode extends false
    ? false
    : null extends T
    ? true
    : undefined extends T
    ? true
    : false;

export type ComposedOpticType<TOpticTypeA extends OpticType, TOpticTypeB extends OpticType, A> = mapped extends
    | TOpticTypeA
    | TOpticTypeB
    ? mapped
    : partial extends TOpticTypeA | TOpticTypeB
    ? partial
    : IsNullable<A> extends true
    ? partial
    : total;

export type FocusedValue<T, TOpticType extends OpticType> = TOpticType extends mapped
    ? T[]
    : TOpticType extends total
    ? T
    : T | undefined;

export type GetStateOptions = {
    denormalize?: boolean;
};

export type SubscribeOptions = {
    denormalize?: boolean;
};
