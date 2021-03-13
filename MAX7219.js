/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const fs = require("fs");
const SPI = require("spi-device");
const NO_OP = () => {};

/**
 * MAX7219 abstraction.
 * Please read the datasheet: https://www.adafruit.com/datasheets/MAX7219.pdf
 *
 * Example use:
 *  var disp = new MAX7219("/dev/spidev1.0");
 *  disp.setDecodeNone();
 *  disp.setScanLimit(8);
 *  disp.startup();
 *  disp.setDigitSegments(0, [0, 0, 1, 1, 0, 1, 1, 1]);
 *  disp.setDigitSegments(1, [0, 1, 0, 0, 1, 1, 1, 1]);
 *  disp.setDigitSegments(2, [0, 0, 0, 0, 1, 1, 1, 0]);
 *  disp.setDigitSegments(3, [0, 1, 1, 0, 0, 1, 1, 1]);
 *
 * Alternate use:
 *  var disp = new MAX7219("/dev/spidev1.0");
 *  disp.setDecodeAll();
 *  disp.setScanLimit(8);
 *  disp.startup();
 *  disp.setDigitSymbol(0, "H");
 *  disp.setDigitSymbol(1, "E");
 *  disp.setDigitSymbol(2, "L");
 *  disp.setDigitSymbol(3, "P");
 *
 * @param number bus 
 *        The SPI bus on which the controller is wired.
 *        For example, 0 for "/dev/spidev0.0"
 * @param number device
 * 				The device to start with when daisy-chained. Defaults to 0.
 * @param number count [optional]
 *        The total number of controllers when daisy-chained. Defaults to 1.
 * @param function callback [optional]
 *        Invoked once the connection to the SPI device is finished.
 */
function MAX7219(bus, device = 0, count, callback) {
	this._bus = bus;
  this._activeController = device;
  this._totalControllers = count || 1;
  this._buffer = new Buffer(this._totalControllers * 2);
  this._spi = SPI.openSync(bus, device);
}


/**
 * Controller registers, as specified in the datasheet.
 * Don't modify this.
 */
MAX7219._Registers = {
  NoOp: 0x00,
  Digit0: 0x01,
  Digit1: 0x02,
  Digit2: 0x03,
  Digit3: 0x04,
  Digit4: 0x05,
  Digit5: 0x06,
  Digit6: 0x07,
  Digit7: 0x08,
  DecodeMode: 0x09,
  Intensity: 0x0a,
  ScanLimit: 0x0b,
  Shutdown: 0x0c,
  DisplayTest: 0x0f
};

/**
 * Characters and numbers specified by segment digit
 */
MAX7219._Font = {
	'0' : parseInt('1111110',2),
	'1' : parseInt('0110000',2),
	'2' : parseInt('1101101',2),
	'3' : parseInt('1111001',2),
	'4' : parseInt('0110011',2),
	'5' : parseInt('1011011',2),
	'6' : parseInt('1011111',2),
	'7' : parseInt('1110000',2),
	'8' : parseInt('1111111',2),
	'9' : parseInt('1111011',2),
	'a' : parseInt('1110111',2),
	'b' : parseInt('0011111',2),
	'c' : parseInt('0001101',2),
	'd' : parseInt('0111101',2),
	'E' : parseInt('1001111',2),
	'e' : parseInt('1101111',2),
	'f' : parseInt('1000111',2),
	'g' : parseInt('1111011',2),
	'H' : parseInt('0110111',2),
	'h' : parseInt('0010111',2),
	'i' : parseInt('0010000',2),
	'j' : parseInt('0111100',2),
	'k' : parseInt('1010111',2),
	'l' : parseInt('0001110',2),
	'm' : parseInt('1110110',2),
	'n' : parseInt('0010101',2),
	'o' : parseInt('0011101',2),
	'p' : parseInt('1100111',2),
	'q' : parseInt('1110011',2),
	'r' : parseInt('0000101',2),
	's' : parseInt('1011011',2),
	't' : parseInt('0001111',2),
	'u' : parseInt('0011100',2),
	'v' : parseInt('0011100',2),
	'w' : parseInt('0011100',2),
	'x' : parseInt('0110111',2),
	'y' : parseInt('0111011',2),
	'z' : parseInt('1101101',2),
	'-' : parseInt('0000001',2),
	'_' : parseInt('0001000',2),
	'[' : parseInt('1001110',2),
	'(' : parseInt('1001110',2),
	']' : parseInt('1111000',2),
	')' : parseInt('1111000',2),
	'°' : parseInt('1100011',2),
	'\!' : parseInt('10100000',2),
	'\'' : parseInt('0100000',2),
	'\.' : parseInt('10000000',2),
};

MAX7219._BLANK = parseInt('00000000', 2);

MAX7219.prototype = {
  /**
   * When daisy-chaining MAX7219s, specifies which chip is currently controlled.
   *
   * @param number index
   *        The index of the chip to control.
   */
  setActiveController: function(index) {
    if (index < 0 || index >= this._totalControllers) {
      throw "Controller index is out of bounds";
    }
		this._spi.closeSync();
		this._spi = SPI.openSync(bus, index)
    this._activeController = index;
  },

  /**
   * Returns which chip is currently controlled.
   */
  getActiveController: function() {
    return this._activeController;
  },

  /**
   * Sets this controller in normal operation mode.
   *
   * On initial power-up, all control registers are reset, the display is
   * blanked, and the MAX7219 enters shutdown mode. This method sets
   * the controller back in normal operation mode.
   *
   * @param function callback [optional]
   *        Invoked once the write to the SPI device finishes.
   */
  startup: function(callback) {
    this._shiftOut(MAX7219._Registers.Shutdown, 0x01, callback);
  },

  /**
   * Sets this controller in shutdown mode.
   *
   * When the MAX7219 is in shutdown mode, the scan oscillator is halted, all
   * segment current sources are pulled to ground, and the display is blanked.
   *
   * @param function callback [optional]
   *        Invoked once the write to the SPI device finishes.
   */
  shutdown: function(callback) {
    this._shiftOut(MAX7219._Registers.Shutdown, 0x00, callback);
  },

  /**
   * Sets this controller in display-test mode.
   *
   * Display-test mode turns all LEDs on by overriding, but not altering, all
   * controls and digit registers (including the shutdown register).
   *
   * @param function callback [optional]
   *        Invoked once the write to the SPI device finishes.
   */
  startDisplayTest: function(callback) {
    this._shiftOut(MAX7219._Registers.DisplayTest, 0x01, callback);
  },

  /**
   * Sets this controller back into the previous operation mode.
   *
   * @param function callback [optional]
   *        Invoked once the write to the SPI device finishes.
   */
  stopDisplayTest: function(callback) {
    this._shiftOut(MAX7219._Registers.DisplayTest, 0x00, callback);
  },

  /**
   * Sets this controller's decode mode, specifying how the segments controlled
   * by the MAX7219 are set on/off.
   *
   * When no-decode is selected, data bits correspond to the segments directly.
   * When decode mode is selected, certain symbols (only 0-9, E, H, L, P, and -)
   * are encoded in a specific way. This is useful for BCD 7 segment displays.
   *
   * @param array modes
   *        An array of decode/no-decode modes for each digit.
   *        E.g., to set decode mode for digits 0–3 and no-decode for 4–7,
   *        modes would be [1,1,1,1,0,0,0,0].
   *
   * @param function callback [optional]
   *        Invoked once the transferwrite to the SPI device finishes.
   */
  setDecodeMode: function(modes, callback) {
    if (modes.length != 8) {
      throw "Invalid decode mode array";
    }
    this._decodeModes = modes;
    this._shiftOut(MAX7219._Registers.DecodeMode, this.encodeByte(modes), callback);
  },

  /**
   * Shortcut for specifying that all digits are in no-decode mode.
   *
   * @param function callback [optional]
   *        Invoked once the write to the SPI device finishes.
   */
  setDecodeNone: function(callback) {
    this.setDecodeMode([0,0,0,0,0,0,0,0], callback);
  },

  /**
   * Shortcut for specifying that all digits are in decode mode.
   *
   * @param function callback [optional]
   *        Invoked once the write to the SPI device finishes.
   */
  setDecodeAll: function(callback) {
    this.setDecodeMode([1,1,1,1,1,1,1,1], callback);
  },

  /**
   * Sets each segment in a digit on/off.
   * For this to work properly, the digit should be in no-decode mode.
   *
   * The segments are identified as follows:
   *    _a_
   *  f|   |b
   *   |_g_|
   *   |   |
   *  e|___|c  dp (decimal point)
   *     d    *
   *
   * @param number n
   *        The digit number, from 0 up to and including 7.
   * @param array segments
   *        A list specifying whether segments are on and off.
   *        E.g., to specify dp, c, d, e and g on, and a, b, f off,
   *        segments would be [1, 0, 0, 1, 1, 1, 0, 1], corresponding
   *        to the structure [dp, a, b, c, d, e, f, g].
   *
   * @param function callback [optional]
   *        Invoked once the write to the SPI device finishes.
   */
  setDigitSegments: function(n, segment, callback) {
    if (n < 0 || n > 7) {
      throw "Invalid digit number";
    }
    if (segments.length != 8) {
      throw "Invalid segments array";
    }
    this.setDigitSegmentsByte(n, this.encodeByte(segments), callback);
  },

  /**
   * Same as setDigitSegments, but it takes a byte instead of an array of bits.
   *
   * @param function callback [optional]
   *        Invoked once the write to the SPI device finishes.
   */
  setDigitSegmentsByte: function(n, byte, callback) {
    this._shiftOut(MAX7219._Registers["Digit" + n], byte, callback);
  },

  /**
   * Sets the symbol displayed in a digit.
   * For this to work properly, the digit should be in decode mode.
   *
   * @param number n
   *        The digit number, from 0 up to and including 7.
   * @param string symbol [optional]
   *        The symbol do display: "0".."9", "E", "H", "L", "P", "-" or " ".
	 *				When no symbol is passed the number will be cleared - this is also
	 *				the case for unmatched symbols.
   * @param boolean dp
   *        Specifies if the decimal point should be on or off.
   *
   * @param function callback [optional]
   *        Invoked once the write to the SPI device finishes.
   */
  setDigitSymbol: function(n, symbol, dp, callback) {
    if (n < 0 || n > 7) {
      throw "Invalid digit number";
    }
		let hexSymbol = symbol;
    if (!(symbol in MAX7219._Font)) {
			hexSymbol = MAX7219._BLANK
    }else{
			hexSymbol = MAX7219._Font[symbol];
		}
    var byte = hexSymbol | (dp ? (1 << 7) : 0);
    this._shiftOut(MAX7219._Registers["Digit" + n], byte, callback);
  },

  /**
   * Sets all segments for all digits off.
   *
   * Shortcut for manually calling setDigitSegments or setDigitSymbol
   * with the appropriate params. If a decode mode wasn't specifically set
   * beforehand, no-decode mode is assumed.
   *
   * @param function callback [optional]
   *        Invoked once the write to the SPI device finishes.
   */
  clearDisplay: function(callback) {
    if (!this._decodeModes) {
      this.setDecodeNone();
    }

    for (var i = 0; i < this._decodeModes.length; i++) {
      var mode = this._decodeModes[i];
      if (mode == 0) {
        this.setDigitSegmentsByte(i, 0x00, callback);
      } else {
        this.setDigitSymbol(i, " ", false, callback);
      }
    }
  },

  /**
   * Sets digital control of display brightness.
   *
   * @param number brightness
   *        The brightness from 0 (dimmest) up to and including 15 (brightest).
   *
   * @param function callback [optional]
   *        Invoked once the write to the SPI device finishes.
   */
  setDisplayIntensity: function(brightness, callback) {
    if (brightness < 0 || brightness > 15) {
      throw "Invalid brightness number";
    }
    this._shiftOut(MAX7219._Registers.Intensity, brightness, callback);
  },

  /**
   * Sets how many digits are displayed, from 1 digit to 8 digits.
   *
   * @param number limit
   *        The number of digits displayed, counting from first to last.
   *        E.g., to display only the first digit, limit would be 1.
   *        E.g., to display only digits 0, 1 and 2, limit would be 3.
   *
   * @param function callback [optional]
   *        Invoked once the write to the SPI device finishes.
   */
  setScanLimit: function(limit, callback) {
    if (limit < 1 || limit > 8) {
      throw "Invalid scan limit number";
    }
    this._shiftOut(MAX7219._Registers.ScanLimit, limit - 1, callback);
  },

  /**
   * Utility function. Returns a byte having the specified bits.
   *
   * @param array bits
   *        An array of 7 bits.
   * @return number
   *         The corresponding byte.
   *         E.g., [1,1,0,1,0,1,0,1] returns 213, or "11010101" in binary.
   */
  encodeByte: function(bits) {
    return bits[0] +
          (bits[1] << 1) +
          (bits[2] << 2) +
          (bits[3] << 3) +
          (bits[4] << 4) +
          (bits[5] << 5) +
          (bits[6] << 6) +
          (bits[7] << 7);
  },

  /**
   * Shifts two bytes to the SPI device.
   *
   * @param number firstByte
   *        The first byte, as a number.
   * @param number secondByte
   *        The second byte, as a number.
   * @param function callback [optional]
   *        Invoked once the write to the SPI device finishes.
   */
  _shiftOut: function(firstByte, secondByte, callback = NO_OP) {
    if (!this._spi) {
      throw "SPI device not initialized";
    }
		
		const message = [{
			sendBuffer: Buffer.from([firstByte, secondByte]),
			receiveBuffer: Buffer.alloc(2),
			byteLength: 2,
			speedHz: 20000,
		}];

    this._spi.transfer(message, callback);
  }
};

module.exports = MAX7219;
