
const max7219 = require('../MAX7219');

const disp = new max7219(0);
disp.setScanLimit(8);
disp.startup();
disp.clearDisplay();

async function showTime(display){
	while (true){
		const time = new Date();
		const hour = time.getHours();
		const minutes = time.getMinutes();
		const seconds = time.getSeconds();
		const dot = seconds % 2 === 0;
		
		//set hour
		display.setDigitSymbol(4, parseInt(hour/10));
		display.setDigitSymbol(3, hour % 10, dot);

		//set minutes
		display.setDigitSymbol(2, parseInt(minutes/10));
		display.setDigitSymbol(1, minutes % 10);

		//sleep for 1s
		await new Promise(res =>  setTimeout(res, 1000));
	}
}

showTime(disp);

process.on('sigint', ()=> {
	disp.shutdown();
});
