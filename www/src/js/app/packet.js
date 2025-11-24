class PacketEncoder {
    encode(header, data) {
        const headerBytes = new TextEncoder().encode(header);
        const dataCopy = new ArrayBuffer(data.byteLength);
        data.copyTo(dataCopy);

        // Calculate length of packet
        const packetLength = 2 + headerBytes.length + dataCopy.byteLength;

        // Create packet of that length
        const packet = new Uint8Array(packetLength);

        // Fill packet
        const view = new DataView(packet.buffer);
        view.setUint16(0, headerBytes.length);
        packet.set(headerBytes, 2);
        packet.set(new Uint8Array(dataCopy), 2 + headerBytes.length);

        return packet;
    }
}

class PacketDecoder {
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
            this.#socket.send(this.#packetEncoder.encode(JSON.stringify(header), data));
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
            callback(result.header, result.data);
        }
    }
}

export class BigPacketSender{
    static chunkMaxSize = 61440; // 60KB data (4KB reserved)

    #packetEncoder = new PacketEncoder();
    #socket;
    
    constructor(socket){
        this.#socket = socket;
    }

    send(header, data){
        if (this.#socket.readyState === WebSocket.OPEN) {
            // Make a full packet
            const fullPacket = this.#packetEncoder.encode(JSON.stringify(header), data);
            const totalChunks = Math.ceil(fullPacket.byteLength / BigPacketSender.chunkMaxSize);

            for(let i = 0; i < totalChunks; i++){
                const start = i * BigPacketSender.chunkMaxSize;
                const end = Math.min(start + BigPacketSender.chunkMaxSize, fullPacket.byteLength);
                const chunk = fullPacket.slice(start, end);

                // Header : index of chunk, total of chunk, total size
                const header = new Uint16Array([i, totalChunks, fullPacket.byteLength]);

                const packet = new Uint8Array(header.byteLength + chunk.byteLength);
                packet.set(new Uint8Array(header.buffer), 0);
                packet.set(new Uint8Array(chunk), header.byteLength);

                this.#socket.send(packet);
            }
        }
    }
}

export class BigPacketReceiver{
    #packetDecoder = new PacketDecoder();
    #socket;
    #buffer = [];
    #received = 0;
    
    constructor(socket, callback){
        this.#socket = socket;
        this.#socket.onmessage = (message) => {this.#receive(message.data, callback)}
    }

    #receive(data, callback){
        const array = new Uint8Array(data);
        const view = new DataView(array.buffer);

        const index = view.getUint16(0, true);
        const total = view.getUint16(2, true);
        const byteLength = view.getUint16(4, true);
        const chunkData = array.slice(6);

        this.#buffer[index] = chunkData;
        this.#received++;

        if(this.#received === total){
            const fullPacket = new Uint8Array(byteLength);
            
            let offset = 0;
            for(const chunk of this.#buffer){
                fullPacket.set(new Uint8Array(chunk), offset);
                offset += chunk.length;
            }

            // Cleanup for next fullPacket
            this.#received = 0;
            this.#buffer = [];

            // Finally call the callback function
            const decodedResult = this.#packetDecoder.decode(fullPacket.buffer);
            callback(decodedResult.header, decodedResult.data);
        }
    }
}