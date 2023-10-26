class CircularBuffer {
    constructor (length) {
        this.length = length;
        this.head = 0;
        this.tail = 0;
        this.buffer = new Array();
        this.full = false;
        this.count = 0;
    }

    push (element) {
        if (this.count === this.length) {
            this.full = true;
        }

        if(!this.full) {
            this.buffer.push(element);
            this.count ++;
        }
        else {
            this.head++;
        }
        this.buffer[this.tail] = element;
        this.tail = (this.tail + 1) % this.length;
    }

    toArray () {
        const arr = [];
        for(let i = 0; i < this.count; i++) {
            arr.push(this.buffer[(this.head + i) % this.length]);
        }

        return arr;
    }

    read () {
        const element = this.buffer[this.head % this.length];
        this.head = (this.head + 1) % this.length;
        this.count -= 1;

        return element;
    }

    clear () {
        this.buffer = [];
    }
}

export { CircularBuffer };

