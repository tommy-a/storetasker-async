export type Task = ConstructorParameters<PromiseConstructor>[0]; // (i.e. (resolve(), reject()) => void )

// typings for auto({ key: value })
export type TaskMap = Record<
    string,
    Task | [...dependencies: string[], cb: (results: Record<string, never>, ...executor: Parameters<Task>) => void]
>;

export async function parallel(tasks: Task[]) {
    return Promise.all(tasks.map((t) => new Promise(t)));
}

export async function series(tasks: Task[]) {
    const results = [];

    for (const t of tasks) {
        results.push(await new Promise(t));
    }

    return results;
}

export async function auto(tasks: TaskMap) {
    const results: Record<string, unknown> = {};

    const promises: Record<string, Promise<unknown>> = {};
    const resolvers: Record<string, (value: unknown) => void> = {};

    // establish a Promise for all task keys
    for (const [key, value] of Object.entries(tasks)) {
        if (typeof value === 'function') {
            // construct and execute a promise for each non-dependent task
            promises[key] = new Promise(value).then((v) => {
                results[key] = v;
            });
        } else {
            // construct a pending unresolved promise for tasks with dependencies
            promises[key] = new Promise((res) => {
                resolvers[key] = res;
            });
        }
    }

    // wait for all tasks to complete
    await Promise.all(
        Object.entries(tasks).map(([key, value]) => {
            if (typeof value == 'function') {
                // non-dependent tasks have already started executing
                return promises[key];
            } else {
                // get dependent task execution info
                const dependencies = value.slice(0, -1) as string[];

                // bind results before starting the task;
                // keys get added before dependency Promises get resolved
                const cb = (value.slice(-1)[0] as () => void).bind(this, results);

                // wait for all dependencies to finish first
                return Promise.all(dependencies.map((d) => promises[d])).then(() => {
                    // then execute the task
                    return new Promise(cb).then((v) => {
                        results[key] = v; // map the result
                        resolvers[key](v); // satisfy as a dependency for all outstanding dependent tasks
                    });
                });
            }
        })
    );

    return results;
}
