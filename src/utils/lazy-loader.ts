
export class LazyLoader {
  private cache = new Map<string, any>();
  private loading = new Map<string, Promise<any>>();

  async load(url: string): Promise<any> {
    if (this.cache.has(url)) return this.cache.get(url);
    if (this.loading.has(url)) return this.loading.get(url);

    const promise = fetch(url)
      .then(r => r.arrayBuffer())
      .then(data => {
        this.cache.set(url, data);
        this.loading.delete(url);
        return data;
      });

    this.loading.set(url, promise);
    return promise;
  }

  dispose(url: string) {
    this.cache.delete(url);
  }

  disposeAll() {
    this.cache.clear();
  }
}
