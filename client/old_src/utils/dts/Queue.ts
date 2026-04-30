import DoublyLinkedList from "./DoublyLinkedList";

export default class Queue<T> {
  private queue: DoublyLinkedList<T> = new DoublyLinkedList();

  peek(): T | null {
    return this.queue.at(0);
  }

  pop(): T | null {
    const top = this.peek();
    this.queue.splice(0);
    return top;
  }

  push(element: T) {
    this.queue.push(element);
  }

  size() {
    return this.queue.size();
  }
}
