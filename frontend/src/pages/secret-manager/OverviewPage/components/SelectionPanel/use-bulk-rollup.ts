import { useMemo, useState } from "react";

export type BulkRollupItemState = "pending" | "saving" | "saved" | "error";

/**
 * Tracks per-item outcome state for a bulk action and runs the per-item work with
 * a concurrency cap, so the UI can surface a "X of N succeeded" rollup and a
 * per-row pending/saving/saved/error badge instead of a single batched result.
 */
export const useBulkRollup = () => {
  const [states, setStates] = useState<Record<string, BulkRollupItemState>>({});

  const setItemState = (id: string, state: BulkRollupItemState) =>
    setStates((prev) => ({ ...prev, [id]: state }));

  const reset = () => setStates({});

  const tally = useMemo(() => {
    const values = Object.values(states);
    return {
      total: values.length,
      pending: values.filter((s) => s === "pending").length,
      saving: values.filter((s) => s === "saving").length,
      saved: values.filter((s) => s === "saved").length,
      error: values.filter((s) => s === "error").length
    };
  }, [states]);

  const run = async (
    ids: string[],
    perItem: (id: string) => Promise<void>,
    concurrency = 4
  ): Promise<{ succeeded: string[]; failed: string[] }> => {
    setStates(Object.fromEntries(ids.map((id) => [id, "pending" as BulkRollupItemState])));
    const succeeded: string[] = [];
    const failed: string[] = [];
    let cursor = 0;

    const worker = async () => {
      while (cursor < ids.length) {
        const id = ids[cursor];
        cursor += 1;
        setItemState(id, "saving");
        try {
          // eslint-disable-next-line no-await-in-loop
          await perItem(id);
          setItemState(id, "saved");
          succeeded.push(id);
        } catch {
          setItemState(id, "error");
          failed.push(id);
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.max(1, Math.min(concurrency, ids.length)) }, () => worker())
    );

    return { succeeded, failed };
  };

  return { states, tally, setItemState, reset, run };
};
