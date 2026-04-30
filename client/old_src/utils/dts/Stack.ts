import DoublyLinkedList from "./DoublyLinkedList";

export default class Stack<T> {
  private queue: DoublyLinkedList<T> = new DoublyLinkedList();

  peek(): T | null {
    return this.queue.at(this.queue.size() - 1);
  }

  pop(): T | null {
    const top = this.peek();
    this.queue.splice(this.queue.size() - 1);
    return top;
  }

  push(element: T) {
    this.queue.push(element);
  }

  size() {
    return this.queue.size();
  }
}
