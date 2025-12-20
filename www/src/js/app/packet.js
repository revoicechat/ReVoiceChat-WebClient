export class EncodedPacket {
    data;

    constructor(header, data){
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

        this.data = packet;
    }
}

export class DecodedPacket {
    header = null;
    data = null;

    constructor(encodedPacket){
        const view = new DataView(encodedPacket);

        const headerEnd = 2 + view.getUint16(0);
        const headerBytes = new Uint8Array(encodedPacket.slice(2, headerEnd));
        const headerJSON = new TextDecoder().decode(headerBytes);

        this.header = JSON.parse(headerJSON);
        this.data = encodedPacket.slice(headerEnd);
    }
}

/**
 * This class represent a Large Packet Sender.
 * With this, you can transmit data larger than websocket allow (i.e more than 64KB),
 * by sclicing and sending those slices one at a time.
 * Overhead is minimal (only 16 Bytes).
 * Data size can be up to 4GB (limit of header using Uint32 to represent the size of data)
 * @constructor Take a WebSocket as parameter
 */
export class LargePacketSender{
    static headerByteLength = 16;
    static maxPayloadByteLength = 64 * 1024 - 16; // 64KB - 16B (reserved for header)

    #socket;
    
    /**
     * 
     * @param {WebSocket} socket WebSocket setup to send data to a LargePacketReceiver
     */
    constructor(socket){
        this.#socket = socket;
    }

    /**
     * Send data through socket
     * @param {*} rawData Any data
     */
    send(rawData){
        if (this.#socket.readyState === WebSocket.OPEN) {
            const total = Math.ceil(rawData.byteLength / LargePacketSender.maxPayloadByteLength);

            for(let index = 0; index < total; index++){
                const start = index * LargePacketSender.maxPayloadByteLength;
                const end = Math.min(start + LargePacketSender.maxPayloadByteLength, rawData.byteLength);
                const payload = rawData.slice(start, end);

                // Header 16B (4x 4B) : rawData byte length | index of payload | total of payload | reserved 
                const header = new Uint32Array([rawData.byteLength, index, total]);
                const packet = new Uint8Array(LargePacketSender.headerByteLength + payload.byteLength);

                packet.set(new Uint8Array(header.buffer), 0);
                packet.set(new Uint8Array(payload), LargePacketSender.headerByteLength);

                this.#socket.send(packet);
            }
        }
    }
}

/**
 * This class represent a Large Packet Receiver.
 * With this, you can receive data larger than websocket allow (i.e more than 64KB),
 * by receiveing slice of data and regrouping them.
 * Use this with LargePacketSender
 */
export class LargePacketReceiver{
    #buffer = [];
    #received = 0;

    /**
     * @param {WebSocket} socket WebSocket setup to received data send from LargePacketSender
     * @param {*} callback Function to call when all rawData as been received
     */
    init(socket, callback) {
        socket.onmessage = (message) => {this.#receive(message.data, callback)}
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
            const rawData = new Uint8Array(fullPayloadByteLength);
            
            // Reconstruct full payload
            let offset = 0;
            for(const payload of this.#buffer){
                rawData.set(new Uint8Array(payload), offset);
                offset += payload.length;
            }

            // Cleanup for next rawData
            this.#received = 0;
            this.#buffer = [];

            // Finally call the callback function
            callback(rawData.buffer);
        }
    }
}