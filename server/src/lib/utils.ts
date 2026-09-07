export namespace Utils {
  export const fetchHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7,zh-Hant;q=0.6"
  }

  export function createCookieString(cookies: Record<string, string | number | boolean>): string {
    return Object.entries(cookies)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("; ");
  }

  export function enumerate<T>(rec: Record<string, T>, key: string, def: any = undefined) {
    if (!Object.hasOwn(rec, key)) {
      console.warn(`Enum key "${key}" not found in record ${JSON.stringify(rec, null, 2)}`);
      return def;
    }
    return rec[key]!;
  }
}