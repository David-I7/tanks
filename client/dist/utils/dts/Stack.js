import DoublyLinkedList from "./DoublyLinkedList";
export default class Stack {
    queue = new DoublyLinkedList();
    peek() {
        return this.queue.at(this.queue.size() - 1);
    }
    pop() {
        const top = this.peek();
        this.queue.splice(this.queue.size() - 1);
        return top;
    }
    push(element) {
        this.queue.push(element);
    }
    size() {
        return this.queue.size();
    }
}
