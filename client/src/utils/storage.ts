

export class BrowserStorage<Value> {

  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  set(key: string, value: Value): void {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  }

  get(key: string): Value | null {
    try {
      const value = this.storage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  getAndRemove(key: string): Value | null {
    try {
      const value = this.get(key);
      this.remove(key);
      return value;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  remove(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      console.error(error);
    }
  }
}
