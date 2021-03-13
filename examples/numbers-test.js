const max7219 = require('../MAX7219');

const disp = new max7219(0);
disp.setScanLimit(8);
disp.startup();
disp.clearDisplay();

for(let i=0; i<8; i++){
	setTimeout(
		()=> disp.setDigitSymbol(i, i+1,false)
	, 500 * i + 1)
}

process.on('sigint', ()=>{
	disp.shutdown();
});
