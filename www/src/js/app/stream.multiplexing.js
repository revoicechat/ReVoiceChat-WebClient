export class Multiplexer {
    static VIDEO = 0;
    static AUDIO = 1;

    /** Audio packet format :
     * [ 1 byte  ] Type
     * [ 4 bytes ] Timestamp (uint32)
     * [ 4 bytes ] Audio chunk length
     * [ X bytes ] Audio chunk 
    */
    processAudio(timestamp, chunk) {
        const payload = new Uint8Array(chunk.byteLength);
        const buffer = new ArrayBuffer(9 + payload.length);
        const view = new DataView(buffer);
        chunk.copyTo(payload);
        let offset = 0;

        // Stream type
        view.setUint8(offset, Multiplexer.AUDIO);
        offset += 1;

        // Timestamp
        view.setUint32(offset, Number.parseInt(timestamp / 1000), true);
        offset += 4;

        // Audio chunk length
        view.setUint32(offset, payload.length, true);
        offset += 4;

        // Audio chunk
        new Uint8Array(buffer, offset, payload.length).set(payload);
 
        return buffer;
    }

    processVideo(header, chunk) {
        const headerBytes = header ? new TextEncoder().encode(JSON.stringify(header)) : new Uint8Array(0);
        const payload = new Uint8Array(chunk.byteLength);
        chunk.copyTo(payload);

        const headerSize = 1 + 4 + headerBytes.length + 4;
        const buffer = new ArrayBuffer(headerSize + payload.length);
        const view = new DataView(buffer);
        let offset = 0;

        // Stream type (0 = video)
        view.setUint8(offset, Multiplexer.VIDEO);
        offset += 1;

        // Header length
        view.setUint32(offset, headerBytes.length, true);
        offset += 4;

        // Header
        new Uint8Array(buffer, offset, headerBytes.length).set(headerBytes);
        offset += headerBytes.length;

        // Payload (chunk)
        view.setUint32(offset, payload.length, true); offset += 4;
        new Uint8Array(buffer, offset, payload.length).set(payload);

        return buffer;
    }
}

export class Demultiplexer {
    #audioCallback;
    #videoCallback;

    constructor(audioCallback, videoCallback) {
        this.#audioCallback = audioCallback;
        this.#videoCallback = videoCallback;
    }

    process(rawData) {
        const buffer = rawData;
        const view = new DataView(buffer);
        let offset = 0;

        const streamType = view.getUint8(offset);

        if(streamType === Multiplexer.AUDIO){
            this.#processAudio(buffer, view);
        }else{
            this.#processVideo(buffer, view);
        }
    }

    #processAudio(buffer, view){
        let offset = 1;

        // Timestamp
        const timestamp = view.getUint32(offset, true); 
        offset += 4;

        // Payload length
        const payloadLength = view.getUint32(offset, true); 
        offset += 4;

        // Payload
        const payload = new Uint8Array(buffer, offset, payloadLength);
        
        this.#audioCallback(timestamp, payload);
    }

    #processVideo(buffer, view) {
        let offset = 1;

        const configLen = view.getUint32(offset, true);
        offset += 4;

        let header = null;
        if (configLen > 0) {
            const configJson = new TextDecoder().decode(
                new Uint8Array(buffer, offset, configLen)
            );
            header = JSON.parse(configJson);
        }
        offset += configLen;

        const payloadLen = view.getUint32(offset, true);
        offset += 4;

        const payload = new Uint8Array(buffer, offset, payloadLen);

        this.#videoCallback(header, payload);
    }
}