const memoryCache = new Map();

export const getCachedJson = async (key, fetcher, ttlMs = 5 * 60 * 1000) => {
    const now = Date.now();
    const memoryValue = memoryCache.get(key);
    if (memoryValue && now - memoryValue.createdAt < ttlMs) return memoryValue.data;

    try {
        const stored = sessionStorage.getItem(`otakucircle-cache:${key}`);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (now - parsed.createdAt < ttlMs) {
                memoryCache.set(key, parsed);
                return parsed.data;
            }
            sessionStorage.removeItem(`otakucircle-cache:${key}`);
        }
    } catch (error) {
        console.warn('Unable to read cached data', error);
    }

    const data = await fetcher();
    const entry = { createdAt: now, data };
    memoryCache.set(key, entry);
    try {
        sessionStorage.setItem(`otakucircle-cache:${key}`, JSON.stringify(entry));
    } catch (error) {
        console.warn('Unable to store cached data', error);
    }
    return data;
};

export const invalidateCachedJson = (key) => {
    memoryCache.delete(key);
    sessionStorage.removeItem(`otakucircle-cache:${key}`);
};
