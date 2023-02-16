// Copyright (C) 2023 Wyden and Gyre, LLC
import { tee } from "std/async/tee.ts";
import { Pool } from "./async.ts";
import { Unrendered } from "./transform.ts";

const TIME_ACCURACY_KHZ = 90;

export type Subtitle = {
  startTime: number;
  endTime: number;
  text: string;
};

export async function* ocr(
  workerSpecifier: string | URL,
  wasmBinary: Uint8Array,
  trainedData: Uint8Array,
  unrendered: AsyncIterable<Unrendered>,
): AsyncIterableIterator<Subtitle> {
  const [unrendered1, unrendered2] = tee(unrendered);
  const iter = unrendered2[Symbol.asyncIterator]();

  // at the time of this comment, it was experimentally determined that 4
  // threads performs significantly better than 8 in Safari, with little
  // cost in Chrome and no notable cost in Firefox
  const maxThreads = 4;
  const threadCount = Math.min(navigator.hardwareConcurrency, maxThreads);

  // This deadline seems unreasonably high, but for now tests running on
  // ci seem to require it. This looks like it's because ci is still checking
  // worker.ts rather than loading worker.js without a check.
  const deadlinePerThreadMs = 2_000;
  const initDeadline = threadCount * deadlinePerThreadMs;
  const pool = await Pool.create<Unrendered, string>(
    workerSpecifier,
    { wasmBinary, trainedData },
    { threadCount, initDeadline }
  );

  try {
    for await (const text of pool.process(unrendered1)) {
      let { startTime, endTime } = (await iter.next()).value;
      startTime /= TIME_ACCURACY_KHZ;
      endTime /= TIME_ACCURACY_KHZ;
      yield { startTime, endTime, text };
    }
  } finally {
    pool.kill();
  }
}
