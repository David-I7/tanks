export abstract class Component<S = any> {
  protected el?: HTMLElement;
  protected parent: HTMLElement;
  protected state: S;

  constructor(parent: HTMLElement, initialState: S) {
    this.parent = parent;
    this.state = initialState;
  }

  // Each component defines its own DOM
  abstract create(): HTMLElement;

  setState(newState: S) {
    if (this.state === newState) return;
    this.state = newState;
    this.update();
  }

  update() {
    const newEl = this.create();
    this.el!.remove();
    this.parent.replaceChild(newEl, this.el!);
  }

  mount() {
    this.el = this.create();
    this.parent.append(this.el);
  }

  unMount() {
    this.el?.remove();
  }

  getDomElement() {
    return this.el;
  }
}
