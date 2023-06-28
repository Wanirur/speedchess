type Callback = (arg?: object) => void;

class EventEmitter {
  private _listeners: Map<string, Callback>;

  constructor() {
    this._listeners = new Map<string, Callback>();
  }

  on(name: string, callback: Callback) {
    this._listeners.set(name, callback);
  }

  emit(name: string, data?: object) {
    const callback = this._listeners.get(name);
    if (callback) {
      callback(data);
    }
  }

  once(name: string, callback: Callback) {
    const onceCallback = (data?: object) => {
      this.removeEventListener(name);
      callback(data);
    };
    this.on(name, onceCallback);
  }

  addEventListener(name: string, callback: Callback) {
    this.on(name, callback);
  }

  removeEventListener(name: string) {
    this._listeners.delete(name);
  }
}

export default EventEmitter;
