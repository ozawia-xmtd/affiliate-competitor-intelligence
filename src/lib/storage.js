const memoryStore = new Map();

function getStore() {
  try {
    return window.localStorage;
  } catch {
    return {
      getItem: key => memoryStore.get(key) ?? null,
      setItem: (key, value) => memoryStore.set(key, value),
      removeItem: key => memoryStore.delete(key)
    };
  }
}

export function readJson(key, fallback) {
  try {
    const raw = getStore().getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  getStore().setItem(key, JSON.stringify(value));
}

export function createId(prefix = 'record') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

