export default class DoublyLinkedList<T> {
  private head: Node<T> | null = null;
  private tail: Node<T> | null = null;
  private length: number = 0;

  constructor() {}

  size() {
    return this.length;
  }

  at(index: number): T | null {
    const node = this._at(index);

    return node ? node.data : null;
  }

  private _at(index: number): Node<T> | null {
    if (index < 0 || index >= this.length) return null;

    if (index < this.length / 2) {
      let cur = this.head;
      for (let i = 0; i < index; ++i) {
        cur = cur!.next;
      }
      return cur;
    }

    let cur = this.tail;
    for (let i = this.length - 1; i > index; --i) {
      cur = cur!.prev;
    }

    return cur;
  }

  push(element: T): void {
    if (this.tail === null) {
      this.head = new Node(element);
      this.tail = this.head;
      ++this.length;
      return;
    }

    this.tail.next = new Node(element, this.tail);
    this.tail = this.tail.next;
    ++this.length;
  }

  find(cb: (element: T, index: number) => boolean): T | null {
    let cur = this.head;
    for (let i = 0; i < this.length; ++i) {
      if (cb(cur!.data, i)) return cur!.data;
      cur = cur!.next;
    }

    return null;
  }

  splice(index: number, deleteCount: number = 1) {
    if (index >= this.length || index < 0 || deleteCount <= 0) return;

    let left = this._at(index);

    if (index + deleteCount >= this.length) {
      const actualDeleteCount = this.length - index;

      // deleted all elements
      if (index === 0) {
        this.head = null;
        this.tail = null;
        this.length -= actualDeleteCount;
        return;
      }

      this.tail = left!.prev;
      this.tail!.next = null;
      left!.prev = null;
      this.length -= actualDeleteCount;
    } else {
      let right: Node<T> | null = left;

      for (let i = 0; i < deleteCount; ++i) {
        right = right!.next;
      }

      if (index === 0) {
        this.head = right;
        right!.prev!.next = null;
        this.head!.prev = null;
      } else {
        left!.prev!.next = right;
        right!.prev = left!.prev;
        left!.prev = null;
        left!.next = null;
      }

      this.length -= deleteCount;
    }
  }

  pop(): T | null {
    if (this.length === 0) return null;

    const popped = this.tail!;
    this.deleteElement(popped);

    return popped.data;
  }

  includes(element: T): boolean {
    if (this.length === 0) return false;

    let cur = this.head;
    for (let i = 0; i < this.length; ++i) {
      if (cur!.data === element) return true;
      cur = cur!.next;
    }

    return false;
  }

  forEach(cb: (element: T, index: number) => void) {
    if (this.length === 0) return;

    let cur = this.head;
    for (let i = 0; i < this.length; ++i) {
      cb(cur!.data, i);
      cur = cur!.next;
    }
  }

  map<R>(mappingFn: (element: T, index: number) => R): DoublyLinkedList<R> {
    const mapped = new DoublyLinkedList<R>();

    if (this.length === 0) return mapped;

    let cur = this.head;
    for (let i = 0; i < this.length; ++i) {
      mapped.push(mappingFn(cur!.data, i));
      cur = cur!.next;
    }

    return mapped;
  }

  filter(
    predicate: (element: T, index: number) => boolean,
  ): DoublyLinkedList<T> {
    const filtered = new DoublyLinkedList<T>();

    if (this.length === 0) return filtered;

    let cur = this.head;
    for (let i = 0; i < this.length; ++i) {
      if (predicate(cur!.data, i)) {
        filtered.push(cur!.data);
      }
      cur = cur!.next;
    }

    return filtered;
  }

  private deleteElement(node: Node<T>) {
    if (this.length === 1) {
      this.head = null;
      this.tail = null;
      --this.length;
      return;
    }

    if (node === this.tail) {
      node.prev!.next = null;
      this.tail = node.prev;
    } else if (node === this.head) {
      this.head = this.head.next;
      this.head!.prev = null;
    } else {
      node.prev!.next = node.next;
      node.next!.prev = node.prev;
    }

    node.next = null;
    node.prev = null;
    --this.length;
  }
}

class Node<T> {
  data: T;
  next: Node<T> | null;
  prev: Node<T> | null;

  constructor(
    data: T,
    prev: Node<T> | null = null,
    next: Node<T> | null = null,
  ) {
    this.data = data;
    this.next = next;
    this.prev = prev;
  }
}
