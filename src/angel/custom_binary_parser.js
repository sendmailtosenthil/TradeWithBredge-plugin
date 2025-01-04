class BinaryParser {
    constructor() {
        this.offset = 0;
    }

    parse(buffer) {
        this.dataView = new DataView(buffer.buffer);
        
        return {
            uint8: (formatter = String) => {
                if (this.offset >= this.dataView.byteLength) {
                    return formatter(0);
                }
                const value = this.dataView.getUint8(this.offset);
                this.offset += 1;
                return formatter(value);
            },
            uint16: (formatter = String) => {
                if (this.offset + 2 > this.dataView.byteLength) {
                    return formatter(0);
                }
                const value = this.dataView.getUint16(this.offset, true);
                this.offset += 2;
                return formatter(value);
            },
            uint32: (formatter = String) => {
                if (this.offset + 4 > this.dataView.byteLength) {
                    return formatter(0);
                }
                const value = this.dataView.getUint32(this.offset, true);
                this.offset += 4;
                return formatter(value);
            },
            uint64: (formatter = String) => {
                if (this.offset + 8 > this.dataView.byteLength) {
                    return formatter(0);
                }
                const value = this.dataView.getBigUint64(this.offset, true);
                this.offset += 8;
                return formatter(value);
            },
            double: (formatter = String) => {
                if (this.offset + 8 > this.dataView.byteLength) {
                    return formatter(0);
                }
                const value = this.dataView.getFloat64(this.offset, true);
                this.offset += 8;
                return formatter(value);
            },
            token: (inp) =>{
                function _atos(array) {
                    var newarray = [];
                    try {
                        for (var i = 0; i < array.length; i++) {
                            newarray.push(String.fromCharCode(array[i]));
                        }
                    } catch (e) {
                        throw new Error(e);
                    }
                
                    let token = JSON.stringify(newarray.join(''));
                    return token.replaceAll('\\u0000', '').replaceAll('"','');
                }
                if (this.offset + 25 > this.dataView.byteLength) {
                    return formatter(0);
                }
                this.offset += 25
                return _atos(inp)
            }                
        }
    }
}

window.BinaryParser = BinaryParser;