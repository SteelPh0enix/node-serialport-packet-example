import { SerialPort, PacketLengthParser, PacketLengthOptions } from 'serialport';
import { Transform, TransformCallback } from 'stream';

/**
 * Class for encoding packets in the same way PacketLengthParser decodes them
 */
class PacketEncoder extends Transform {
  options: PacketLengthOptions;
  readonly defaultDelimiter: number = 0xaa;
  readonly defaultPacketOverhead: number = 2;
  readonly defaultLengthBytes: number = 1;
  readonly defaultLengthOffset: number = 1;
  readonly defaultMaxLen: number = 0xff;

  /**
   * Create an encoder
   * @param {PacketLengthOptions} options Encoder options
   */
  constructor(options: PacketLengthOptions = {}) {
    super(options);

    const {
      delimiter = this.defaultDelimiter,
      packetOverhead = this.defaultPacketOverhead,
      lengthBytes = this.defaultLengthBytes,
      lengthOffset = this.defaultLengthOffset,
      maxLen = this.defaultMaxLen,
    } = options;

    this.options = {
      delimiter,
      packetOverhead,
      lengthBytes,
      lengthOffset,
      maxLen,
    };
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    const chunkLength = chunk.length;
    const packetOverhead = this.options.packetOverhead ?? this.defaultPacketOverhead;
    const delimiter = this.options.delimiter ?? this.defaultDelimiter;
    const lengthOffset = this.options.lengthOffset ?? this.defaultLengthOffset;
    const lengthBytes = this.options.lengthBytes ?? this.defaultLengthBytes;

    const header = Buffer.alloc(chunkLength + packetOverhead);
    header[0] = delimiter;

    header.writeUIntLE(chunkLength, lengthOffset, lengthBytes);

    const encoded = Buffer.concat([header.subarray(0, packetOverhead), chunk]);

    callback(null, encoded);
  }
}

const port = new SerialPort({
  path: 'COM6',
  baudRate: 250000,
});

const parser = port.pipe(
  new PacketLengthParser({
    delimiter: 0x69,
    packetOverhead: 3,
    lengthBytes: 2,
    lengthOffset: 1,
  })
);

port.on('error', function (err) {
  console.error(`Serial port error: ${err.message}`);
});

parser.on('data', function (data: Buffer) {
  console.log(data);
  console.log(`message: ${data.subarray(3)}`);
});

const encoder = new PacketEncoder({
  delimiter: 0x69,
  packetOverhead: 3,
  lengthBytes: 2,
  lengthOffset: 1,
});

encoder.pipe(port);

encoder.write('test');
