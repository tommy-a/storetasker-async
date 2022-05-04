import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

import { auto, parallel, series, Task, TaskMap } from '../src/async';

const ERROR = '~Cya world~';

describe('async', () => {
    let tasks: Task[] | TaskMap;

    describe('parallel', () => {
        it('resolves parallelly in order', async () => {
            const callOrder: number[] = [];

            tasks = [
                (res) => res(callOrder.push(1)),
                (res) => res(callOrder.push(2)),
                (res) => res(callOrder.push(3)),
                (res) => setTimeout(() => res(callOrder.push(4)), 250),
                (res) => setTimeout(() => res(callOrder.push(5)), 25),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (res) => res(callOrder.push(7))
            ];

            const results = await parallel(tasks);

            // the order in which numbers are pushed corresponds with
            // the length of callOrder at that moment in time
            expect(callOrder).to.eql([1, 2, 3, 7, 5, 6, 4]);
            expect(results).to.eql([1, 2, 3, 7, 5, 6, 4]);
        });

        it('rejects at the first synchronous task to fail', async () => {
            const callOrder: number[] = [];

            tasks = [
                (_, rej) => rej(ERROR),
                (res) => res(callOrder.push(2)),
                (res) => res(callOrder.push(3)),
                (res) => setTimeout(() => res(callOrder.push(4)), 250),
                (res) => setTimeout(() => res(callOrder.push(5)), 25),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (res) => res(callOrder.push(7))
            ];

            await expect(parallel(tasks)).to.eventually.be.rejectedWith(ERROR);

            // the synchronous tasks resolve upon Promise construction,
            // right before the first task is checked for rejection
            expect(callOrder).to.eql([2, 3, 7]);
        });

        it('rejects at the first asynchronous task to fail', async () => {
            const callOrder: number[] = [];

            tasks = [
                (_, rej) => setTimeout(() => rej(ERROR), 250),
                (res) => res(callOrder.push(2)),
                (res) => res(callOrder.push(3)),
                (res) => setTimeout(() => res(callOrder.push(4)), 250),
                (res) => setTimeout(() => res(callOrder.push(5)), 25),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (res) => res(callOrder.push(7))
            ];

            await expect(parallel(tasks)).to.eventually.be.rejectedWith(ERROR);

            expect(callOrder).to.eql([2, 3, 7, 5, 6]);
        });

        it('rejects inbetween synchronous tasks', async () => {
            const callOrder: number[] = [];

            tasks = [
                (res) => res(callOrder.push(1)),
                (_, rej) => rej(ERROR),
                (res) => res(callOrder.push(3)),
                (res) => setTimeout(() => res(callOrder.push(4)), 250),
                (res) => setTimeout(() => res(callOrder.push(5)), 25),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (res) => res(callOrder.push(7))
            ];

            await expect(parallel(tasks)).to.eventually.be.rejectedWith(ERROR);

            expect(callOrder).to.eql([1, 3, 7]);
        });

        it('rejects inbetween asynchronous tasks', async () => {
            const callOrder: number[] = [];

            tasks = [
                (res) => res(callOrder.push(1)),
                (res) => res(callOrder.push(2)),
                (res) => res(callOrder.push(3)),
                (res) => setTimeout(() => res(callOrder.push(4)), 250),
                (_, rej) => setTimeout(() => rej(ERROR), 25),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (res) => res(callOrder.push(7))
            ];

            await expect(parallel(tasks)).to.eventually.be.rejectedWith(ERROR);

            expect(callOrder).to.eql([1, 2, 3, 7]);
        });

        it('rejects inbetween sync -> async tasks', async () => {
            const callOrder: number[] = [];

            tasks = [
                (res) => res(callOrder.push(1)),
                (res) => res(callOrder.push(2)),
                (_, rej) => rej(ERROR),
                (res) => setTimeout(() => res(callOrder.push(4)), 250),
                (res) => setTimeout(() => res(callOrder.push(5)), 25),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (res) => res(callOrder.push(7))
            ];

            await expect(parallel(tasks)).to.eventually.be.rejectedWith(ERROR);

            expect(callOrder).to.eql([1, 2, 7]);
        });

        it('rejects inbetween async -> sync tasks', async () => {
            const callOrder: number[] = [];

            tasks = [
                (res) => res(callOrder.push(1)),
                (res) => res(callOrder.push(2)),
                (res) => res(callOrder.push(3)),
                (_, rej) => setTimeout(() => rej(ERROR), 250),
                (res) => res(callOrder.push(4)),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (res) => res(callOrder.push(7))
            ];

            await expect(parallel(tasks)).to.eventually.be.rejectedWith(ERROR);

            expect(callOrder).to.eql([1, 2, 3, 4, 7, 6]);
        });

        it('rejects at the last synchronous task to fail', async () => {
            const callOrder: number[] = [];

            tasks = [
                (res) => res(callOrder.push(1)),
                (res) => res(callOrder.push(2)),
                (res) => res(callOrder.push(3)),
                (res) => setTimeout(() => res(callOrder.push(4)), 250),
                (res) => setTimeout(() => res(callOrder.push(5)), 25),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (_, rej) => rej(ERROR)
            ];

            await expect(parallel(tasks)).to.eventually.be.rejectedWith(ERROR);

            expect(callOrder).to.eql([1, 2, 3]);
        });

        it('rejects at the last asynchronous task to fail', async () => {
            const callOrder: number[] = [];

            tasks = [
                (res) => res(callOrder.push(1)),
                (res) => res(callOrder.push(2)),
                (res) => res(callOrder.push(3)),
                (res) => setTimeout(() => res(callOrder.push(4)), 250),
                (res) => setTimeout(() => res(callOrder.push(5)), 25),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (_, rej) => setTimeout(() => rej(ERROR), 250)
            ];

            await expect(parallel(tasks)).to.eventually.be.rejectedWith(ERROR);

            expect(callOrder).to.eql([1, 2, 3, 5, 6, 4]);
        });
    });

    describe('series', () => {
        it('resolves sequentially in order', async () => {
            const callOrder: number[] = [];

            tasks = [
                (res) => res(callOrder.push(1)),
                (res) => res(callOrder.push(2)),
                (res) => res(callOrder.push(3)),
                (res) => setTimeout(() => res(callOrder.push(4)), 250),
                (res) => setTimeout(() => res(callOrder.push(5)), 25),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (res) => res(callOrder.push(7))
            ];

            const results = await series(tasks);

            // the order in which numbers are pushed
            // corresponds with the length of callOrder at that same time
            expect(callOrder).to.eql([1, 2, 3, 4, 5, 6, 7]);
            expect(results).to.eql([1, 2, 3, 4, 5, 6, 7]);
        });

        it('rejects at the first synchronous task to fail', async () => {
            const callOrder: number[] = [];

            tasks = [
                (_, rej) => rej(ERROR),
                (res) => res(callOrder.push(2)),
                (res) => res(callOrder.push(3)),
                (res) => setTimeout(() => res(callOrder.push(4)), 250),
                (res) => setTimeout(() => res(callOrder.push(5)), 25),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (res) => res(callOrder.push(7))
            ];

            await expect(series(tasks)).to.eventually.be.rejectedWith(ERROR);

            expect(callOrder).to.eql([]);
        });

        it('rejects at the first asynchronous task to fail', async () => {
            const callOrder: number[] = [];

            tasks = [
                (_, rej) => setTimeout(() => rej(ERROR), 250),
                (res) => res(callOrder.push(2)),
                (res) => res(callOrder.push(3)),
                (res) => setTimeout(() => res(callOrder.push(4)), 250),
                (res) => setTimeout(() => res(callOrder.push(5)), 25),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (res) => res(callOrder.push(7))
            ];

            await expect(series(tasks)).to.eventually.be.rejectedWith(ERROR);

            expect(callOrder).to.eql([]);
        });

        it('rejects inbetween synchronous tasks', async () => {
            const callOrder: number[] = [];

            tasks = [
                (res) => res(callOrder.push(1)),
                (_, rej) => rej(ERROR),
                (res) => res(callOrder.push(3)),
                (res) => setTimeout(() => res(callOrder.push(4)), 250),
                (res) => setTimeout(() => res(callOrder.push(5)), 25),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (res) => res(callOrder.push(7))
            ];

            await expect(series(tasks)).to.eventually.be.rejectedWith(ERROR);

            expect(callOrder).to.eql([1]);
        });

        it('rejects inbetween asynchronous tasks', async () => {
            const callOrder: number[] = [];

            tasks = [
                (res) => res(callOrder.push(1)),
                (res) => res(callOrder.push(2)),
                (res) => res(callOrder.push(3)),
                (res) => setTimeout(() => res(callOrder.push(4)), 250),
                (_, rej) => setTimeout(() => rej(ERROR), 25),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (res) => res(callOrder.push(7))
            ];

            await expect(series(tasks)).to.eventually.be.rejectedWith(ERROR);

            expect(callOrder).to.eql([1, 2, 3, 4]);
        });

        it('rejects inbetween sync -> async tasks', async () => {
            const callOrder: number[] = [];

            tasks = [
                (res) => res(callOrder.push(1)),
                (res) => res(callOrder.push(2)),
                (_, rej) => rej(ERROR),
                (res) => setTimeout(() => res(callOrder.push(4)), 250),
                (res) => setTimeout(() => res(callOrder.push(5)), 25),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (res) => res(callOrder.push(7))
            ];

            await expect(series(tasks)).to.eventually.be.rejectedWith(ERROR);

            expect(callOrder).to.eql([1, 2]);
        });

        it('rejects inbetween async -> sync tasks', async () => {
            const callOrder: number[] = [];

            tasks = [
                (res) => res(callOrder.push(1)),
                (res) => res(callOrder.push(2)),
                (res) => res(callOrder.push(3)),
                (_, rej) => setTimeout(() => rej(ERROR), 250),
                (res) => res(callOrder.push(4)),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (res) => res(callOrder.push(7))
            ];

            await expect(series(tasks)).to.eventually.be.rejectedWith(ERROR);

            expect(callOrder).to.eql([1, 2, 3]);
        });

        it('rejects at the last synchronous task to fail', async () => {
            const callOrder: number[] = [];

            tasks = [
                (res) => res(callOrder.push(1)),
                (res) => res(callOrder.push(2)),
                (res) => res(callOrder.push(3)),
                (res) => setTimeout(() => res(callOrder.push(4)), 250),
                (res) => setTimeout(() => res(callOrder.push(5)), 25),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (_, rej) => rej(ERROR)
            ];

            await expect(series(tasks)).to.eventually.be.rejectedWith(ERROR);

            expect(callOrder).to.eql([1, 2, 3, 4, 5, 6]);
        });

        it('rejects at the last asynchronous task to fail', async () => {
            const callOrder: number[] = [];

            tasks = [
                (res) => res(callOrder.push(1)),
                (res) => res(callOrder.push(2)),
                (res) => res(callOrder.push(3)),
                (res) => setTimeout(() => res(callOrder.push(4)), 250),
                (res) => setTimeout(() => res(callOrder.push(5)), 25),
                (res) => setTimeout(() => res(callOrder.push(6)), 50),
                (_, rej) => setTimeout(() => rej(ERROR), 250)
            ];

            await expect(series(tasks)).to.eventually.be.rejectedWith(ERROR);

            expect(callOrder).to.eql([1, 2, 3, 4, 5, 6]);
        });
    });

    describe('auto', () => {
        it('resolves the example file correctly', async () => {
            const callOrder: number[] = [];

            const [first, second] = [2, 5];

            tasks = {
                firstTimesFive: (res) =>
                    setTimeout(() => {
                        const value = first * 5;

                        callOrder.push(value);
                        res(value);
                    }, 250),
                secondMinusTwo: (res) => {
                    const value = second - 2;

                    callOrder.push(value);
                    res(value);
                },
                sumTheResult: [
                    'firstTimesFive',
                    'secondMinusTwo',
                    (results, res) => {
                        const value = results.firstTimesFive + results.secondMinusTwo;

                        callOrder.push(value);
                        res(value);
                    }
                ],
                squareIt: [
                    'sumTheResult',
                    (results, res) =>
                        setTimeout(() => {
                            const value = results.sumTheResult * results.sumTheResult;

                            callOrder.push(value);
                            res(value);
                        }, 250)
                ]
            };

            const results = await auto(tasks);

            expect(results).to.eql({
                secondMinusTwo: 3,
                firstTimesFive: 10,
                sumTheResult: 13,
                squareIt: 169
            });

            expect(callOrder).to.eql([3, 10, 13, 169]);
        });
    });
});
