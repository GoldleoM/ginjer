export const DEVICE_REFRESH_INTERVAL_MS = 10_000;

// One request at a time; callers handle errors and cancel their request on stop.
export function startDevicePolling(load: (initial: boolean) => Promise<void>, isActive: () => boolean) {
  let stopped = false;
  let pending = false;
  async function run(initial = false) {
    if (stopped || pending || (!initial && !isActive())) return;
    pending = true;
    try { await load(initial); } finally { pending = false; }
  }
  void run(true);
  const timer = setInterval(() => { void run(); }, DEVICE_REFRESH_INTERVAL_MS);
  return {
    refresh: () => { void run(); },
    stop: () => { stopped = true; clearInterval(timer); },
  };
}
