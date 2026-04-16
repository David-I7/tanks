export default class DoublyLinkedList {
    head = null;
    tail = null;
    length = 0;
    constructor() { }
    size() {
        return this.length;
    }
    at(index) {
        const node = this._at(index);
        return node ? node.data : null;
    }
    _at(index) {
        if (index < 0 || index >= this.length)
            return null;
        if (index < this.length / 2) {
            let cur = this.head;
            for (let i = 0; i < index; ++i) {
                cur = cur.next;
            }
            return cur;
        }
        let cur = this.tail;
        for (let i = this.length - 1; i > index; --i) {
            cur = cur.prev;
        }
        return cur;
    }
    push(element) {
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
    find(cb) {
        let cur = this.head;
        for (let i = 0; i < this.length; ++i) {
            if (cb(cur.data, i))
                return cur.data;
            cur = cur.next;
        }
        return null;
    }
    splice(index, deleteCount = 1) {
        if (index >= this.length || index < 0 || deleteCount <= 0)
            return;
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
            this.tail = left.prev;
            this.tail.next = null;
            left.prev = null;
            this.length -= actualDeleteCount;
        }
        else {
            let right = left;
            for (let i = 0; i < deleteCount; ++i) {
                right = right.next;
            }
            if (index === 0) {
                this.head = right;
                right.prev.next = null;
                this.head.prev = null;
            }
            else {
                left.prev.next = right;
                right.prev = left.prev;
                left.prev = null;
                left.next = null;
            }
            this.length -= deleteCount;
        }
    }
    pop() {
        if (this.length === 0)
            return null;
        const popped = this.tail;
        this.deleteElement(popped);
        return popped.data;
    }
    includes(element) {
        if (this.length === 0)
            return false;
        let cur = this.head;
        for (let i = 0; i < this.length; ++i) {
            if (cur.data === element)
                return true;
            cur = cur.next;
        }
        return false;
    }
    forEach(cb) {
        if (this.length === 0)
            return;
        let cur = this.head;
        for (let i = 0; i < this.length; ++i) {
            cb(cur.data, i);
            cur = cur.next;
        }
    }
    map(mappingFn) {
        const mapped = new DoublyLinkedList();
        if (this.length === 0)
            return mapped;
        let cur = this.head;
        for (let i = 0; i < this.length; ++i) {
            mapped.push(mappingFn(cur.data, i));
            cur = cur.next;
        }
        return mapped;
    }
    filter(predicate) {
        const filtered = new DoublyLinkedList();
        if (this.length === 0)
            return filtered;
        let cur = this.head;
        for (let i = 0; i < this.length; ++i) {
            if (predicate(cur.data, i)) {
                filtered.push(cur.data);
            }
            cur = cur.next;
        }
        return filtered;
    }
    deleteElement(node) {
        if (this.length === 1) {
            this.head = null;
            this.tail = null;
            --this.length;
            return;
        }
        if (node === this.tail) {
            node.prev.next = null;
            this.tail = node.prev;
        }
        else if (node === this.head) {
            this.head = this.head.next;
            this.head.prev = null;
        }
        else {
            node.prev.next = node.next;
            node.next.prev = node.prev;
        }
        node.next = null;
        node.prev = null;
        --this.length;
    }
}
class Node {
    data;
    next;
    prev;
    constructor(data, prev = null, next = null) {
        this.data = data;
        this.next = next;
        this.prev = prev;
    }
}
