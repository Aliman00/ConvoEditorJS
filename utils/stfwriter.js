class STFWriter {
  constructor() {
    this.b = Buffer.alloc(0);
    this.rowCount = null;
    this.characterCount = null;
  }

  parseBytes(value, numBytes = null) {
    let buffer;
    if (numBytes !== null) {
      buffer = Buffer.alloc(numBytes);
      buffer.writeUIntLE(value, 0, numBytes);
    } else if (value <= 255) {
      buffer = Buffer.from([value]);
    } else if (value <= 65535) {
      buffer = Buffer.alloc(2);
      buffer.writeUInt16LE(value);
    } else if (value <= 16777215) {
      buffer = Buffer.alloc(3);
      buffer.writeUIntLE(value, 0, 3);
    } else if (value <= 4294967295) {
      buffer = Buffer.alloc(4);
      buffer.writeUInt32LE(value);
    } else {
      buffer = Buffer.alloc(8);
      buffer.writeBigUInt64LE(BigInt(value));
    }
    this.b = Buffer.concat([this.b,  buffer]);
  }

  saveData(data) {
    // STF file validation
    this.b = Buffer.concat([this.b, Buffer.from([205, 171, 0, 0, 0, 0, 0, 0, 0])]);

    // Row count for values
    this.rowCount = data.length;
    this.parseBytes(this.rowCount, 4);

    // Iterate through the VALUE rows
    for (let i = 0; i < this.rowCount; i++) {
      this.parseBytes(i + 1, 4);
      this.b = Buffer.concat([this.b, Buffer.from([255, 255, 255, 255])]);

      this.characterCount = data[i][1].length;
      this.parseBytes(this.characterCount, 4);

      for (let char of data[i][1]) {
        this.parseBytes(char.charCodeAt(0));
        this.b = Buffer.concat([this.b, Buffer.from([0])]);
      }
    }

    // Iterate through KEY rows
    for (let i = 0; i < this.rowCount; i++) {
      this.parseBytes(i + 1, 4);

      this.characterCount = data[i][0].length;
      this.parseBytes(this.characterCount, 4);

      for (let char of data[i][0]) {
        this.parseBytes(char.charCodeAt(0));
      }
    }

    return this.b;
  }
}

module.exports = STFWriter;
