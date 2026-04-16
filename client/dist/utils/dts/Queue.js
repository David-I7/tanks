import DoublyLinkedList from "./DoublyLinkedList";
export default class Queue {
    queue = new DoublyLinkedList();
    peek() {
        return this.queue.at(0);
    }
    pop() {
        const top = this.peek();
        this.queue.splice(0);
        return top;
    }
    push(element) {
        this.queue.push(element);
    }
    size() {
        return this.queue.size();
    }
}
