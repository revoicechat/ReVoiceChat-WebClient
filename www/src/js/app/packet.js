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
        const data = packet.data;
        const view = new DataView(data);

        const headerEnd = 2 + view.getUint16(0);
        const headerBytes = new Uint8Array(data.slice(2, headerEnd));
        const headerJSON = new TextDecoder().decode(headerBytes);

        return { header: JSON.parse(headerJSON), data: data.slice(headerEnd) };
    }
}