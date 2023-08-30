export type Callback = (arg: any) => void;

class EventEmitter {
  private _callbacks: Map<string, Callback[]>;

  constructor() {
    this._callbacks = new Map<string, Callback[]>();
  }

  bind(name: string, callback: Callback) {
    let callbacks = this._callbacks.get(name);
    if (!callbacks) {
      callbacks = [];
      this._callbacks.set(name, callbacks);
    }
    callbacks.push(callback);
  }

  emit(name: string, data: unknown) {
    const callbacks = this._callbacks.get(name);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  bindOnce(name: string, callback: Callback) {
    const onceCallback = (data: unknown) => {
      this.unbind(name, callback);
      callback(data);
    };

    this.bind(name, onceCallback);
  }

  addEventListener(name: string, callback: Callback) {
    this.bind(name, callback);
  }

  removeEventListener(name: string) {
    this._callbacks.delete(name);
  }

  unbind(name: string, callback: Callback) {
    const callbacks = this._callbacks.get(name);
    if (!callbacks) {
      return;
    }

    callbacks.filter((current) => current !== callback);
  }
}

export default EventEmitter;
