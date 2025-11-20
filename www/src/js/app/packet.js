export class PacketEncoder {
    encode(header, data) {
        const headerBytes = new TextEncoder().encode(header);

        // Calculate length of packet
        const packetLength = 2 + headerBytes.length + data.byteLength;

        // Create packet of that length
        const packet = new Uint8Array(packetLength);

        // Fill packet
        const view = new DataView(packet.buffer);
        view.setUint16(0, headerBytes.length);
        packet.set(headerBytes, 2);
        packet.set(new Uint8Array(data), 2 + headerBytes.length);

        return packet;
    }
}

export class PacketDecoder {
    decode(packet) {
        const view = new DataView(packet);

        const headerEnd = 2 + view.getUint16(0);
        const headerBytes = new Uint8Array(packet.slice(2, headerEnd));
        const headerJSON = new TextDecoder().decode(headerBytes);

        return { header: JSON.parse(headerJSON), data: packet.slice(headerEnd) };
    }
}

export class PacketSender {
    #socket;
    #packetEncoder = new PacketEncoder();

    constructor(socket) {
        this.#socket = socket
    }

    send(header, data) {
        if (this.#socket.readyState === WebSocket.OPEN) {
            const dataCopy = new ArrayBuffer(data.byteLength);
            data.copyTo(dataCopy);
            this.#socket.send(this.#packetEncoder.encode(JSON.stringify(header), dataCopy));
        }
    }
}

export class PacketReceiver {
    #socket;
    #packetDecoder = new PacketDecoder();

    constructor(socket, callback) {
        this.#socket = socket;
        this.#socket.onmessage = (message) => {this.#receive(message.data, callback)}
    }

    #receive(packet, callback) {
        if (this.#socket.readyState === WebSocket.OPEN) {
            const result = this.#packetDecoder.decode(packet);
            const header = result.header;
            const data = result.data;
            callback(header, data);
        }
    }
}