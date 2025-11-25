class PacketEncoder {
    encode(header, data) {
        const headerBytes = new TextEncoder().encode(JSON.stringify(header));
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
            this.#socket.send(this.#packetEncoder.encode(header, data));
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

/**
 * This class represent a Large Packet Sender.
 * With it, you can transmit larger data than websocket allow (i.e more than 64KB),
 * by sclicing and sending those slices one at a time.
 * Overhead is minimal (only 16 Bytes).
 * Data size can be up to 4GB (limit of header using Uint32 to represent the size of data)
 * @constructor Take a WebSocket as parameter
 */
export class LargePacketSender{
    static headerByteLength = 16;
    static maxPayloadByteLength = 64 * 1024 - 16; // 64KB - 16B (reserved for header)

    #packetEncoder = new PacketEncoder();
    #socket;
    
    constructor(socket){
        this.#socket = socket;
    }

    send(header, data){
        if (this.#socket.readyState === WebSocket.OPEN) {
            const fullPayload = this.#packetEncoder.encode(header, data);
            const total = Math.ceil(fullPayload.byteLength / LargePacketSender.maxPayloadByteLength);

            for(let index = 0; index < total; index++){
                const start = index * LargePacketSender.maxPayloadByteLength;
                const end = Math.min(start + LargePacketSender.maxPayloadByteLength, fullPayload.byteLength);
                const payload = fullPayload.slice(start, end);

                // Header 16B (4x 4B) : fullPayload byte length | index of payload | total of payload | reserved 
                const header = new Uint32Array([fullPayload.byteLength, index, total]);
                const packet = new Uint8Array(LargePacketSender.headerByteLength + payload.byteLength);

                packet.set(new Uint8Array(header.buffer), 0);
                packet.set(new Uint8Array(payload), LargePacketSender.headerByteLength);

                this.#socket.send(packet);
            }
        }
    }
}

export class LargePacketReceiver{
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

        const fullPayloadByteLength = view.getUint32(0, true);
        const index = view.getUint32(4, true);
        const total = view.getUint32(8, true);
        const chunkData = array.slice(LargePacketSender.headerByteLength);

        this.#buffer[index] = chunkData; 
        this.#received++;

        if(this.#received === total){
            const fullPayload = new Uint8Array(fullPayloadByteLength);
            
            // Reconstruct full payload
            let offset = 0;
            for(const payload of this.#buffer){
                fullPayload.set(new Uint8Array(payload), offset);
                offset += payload.length;
            }

            // Cleanup for next fullPayload
            this.#received = 0;
            this.#buffer = [];

            // Finally call the callback function
            const decodedResult = this.#packetDecoder.decode(fullPayload.buffer);
            callback(decodedResult.header, decodedResult.data);
        }
    }
}