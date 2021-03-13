
const max7219 = require('../MAX7219');
const name = process.argv[2];

const disp = new max7219(0);
disp.setScanLimit(8);
disp.startup();
disp.clearDisplay();

const chars = [...name].slice(0, 8).reverse();
chars.forEach((char, i)=> {
	setTimeout(
		()=> disp.setDigitSymbol(i, char,false)
	, 500 * i + 1)
});

process.on('sigint', ()=>{
	disp.shutdown();
});
