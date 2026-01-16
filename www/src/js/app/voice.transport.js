/**
 * Voice Transport
 * Structure :
 * [  4 bytes ] Timestamp (uint32)
 * [  1 byte  ] User type
 * [  1 byte  ] User gate
 * [ 36 bytes ] User ID
 * [  4 bytes ] Payload length (uint32)
 * [  X bytes ] Payload (voice)
 */
export class EncodedVoice {
    static user = 0;
    static music = 1;
    
    data;

    constructor(timestamp, userId, gateState, type, audioData){
        const headerSize = 4 + 1 + 1 + 36 + 4;
        const payload = new Uint8Array(audioData.byteLength);
        audioData.copyTo(payload);
    
        const buffer = new ArrayBuffer(46 + payload.length);
        const view = new DataView(buffer);
        let offset = 0;

        // Timestamp
        view.setUint32(offset, Number.parseInt(timestamp / 1000), true);
        offset += 4;

        // User type
        view.setUint8(offset++, type);

        // User gate
        view.setUint8(offset++, gateState);

        // User ID
        new Uint8Array(buffer, offset, headerSize).set(new TextEncoder().encode(userId))
        offset += 36;

        // Payload
        view.setUint32(offset, payload.length, true);
        offset += 4;
        new Uint8Array(buffer, offset, payload.length).set(payload);        

        this.data = buffer;
    }
}

export class DecodedVoice {
    timestamp = null;
    user = {
        id: null,
        gateState: null,
        type: null
    }
    data = null;

    constructor(encodedPacket){
        let offset = 0;
        const buffer = encodedPacket;
        const view = new DataView(encodedPacket);

        // Timestamp
        this.timestamp = view.getUint32(offset, true);
        offset += 4;

        // User type
        this.user.type = view.getUint8(offset++);

        // User gate
        this.user.gateState = view.getUint8(offset++);

        // User ID
        this.user.id = new TextDecoder().decode(
            new Uint8Array(buffer, offset, 36)
        );
        offset += 36;

        // Payload
        const payloadLength = view.getUint32(offset, true);
        offset += 4;
        this.data = new Uint8Array(buffer, offset, payloadLength);
    }
}