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
    type?: 'fold' | 'foldN' | 'map';
}

type StrictMode = null extends string ? false : true;
export type IsNullable<T> = StrictMode extends false
    ? false
    : null extends T
    ? true
    : undefined extends T
    ? true
    : false;

type RecursivePath<T, K = Exclude<keyof NonNullable<T>, keyof any[] | keyof Date>> = K extends string
    ? [T] extends [Record<string, any>]
        ?
              | K
              | `${K}${IsNullable<T[K]> extends true ? '?.' : '.'}${T[K] extends null | undefined
                    ? never
                    : unknown extends T[K]
                    ? never
                    : RecursivePath<NonNullable<T[K]>>}`
        : never
    : never;

export type Path<T> = unknown extends T
    ? [T] extends [boolean]
        ? string
        : never
    : any[] extends T
    ? T extends [any, ...any]
        ? RecursivePath<T>
        : number
    : RecursivePath<T>;

export type PathType<T, P extends string | number> = P extends keyof NonNullable<T>
    ? NonNullable<T>[P]
    : P extends `${infer Head}${'.' | '?.'}${infer Tail}`
    ? Head extends keyof NonNullable<T>
        ? PathType<NonNullable<T>[Head], Tail>
        : never
    : never;

export type PathOpticType<T, P extends string | number> = IsNullable<T> extends true
    ? partial
    : P extends `${string}?.${string}`
    ? partial
    : total;

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
