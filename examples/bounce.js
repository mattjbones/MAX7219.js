
const max7219 = require('../MAX7219');

const disp = new max7219(0);
disp.setScanLimit(8);
disp.startup();
disp.clearDisplay();

function setTime(display, initialPos){
	const time = new Date();
	const hour = time.getHours();
	const minutes = time.getMinutes();
	const seconds = time.getSeconds();
	const dot = seconds % 2 === 0;
	
	//set hour
	display.setDigitSymbol(initialPos + 3, parseInt(hour/10));
	display.setDigitSymbol(initialPos + 2, hour % 10, dot);

	//set minutes
	display.setDigitSymbol(initialPos + 1, parseInt(minutes/10));
	display.setDigitSymbol(initialPos + 0, minutes % 10);
}

async function bounceTime(display) {
	let right = 0;
	let left = 0;
	setTime(display, 0)
	let count = 0;
	while(true){
		await new Promise(rs => setTimeout(rs, 16));
		if(count >= 30){ 
			if(left < 4){
				display.setDigitSymbol(left, ' ');
				setTime(display, left+1)
				++left
			}else if (right < 4){
				display.setDigitSymbol(7 - right, ' ');
				setTime(display, left - right -1)
				++right;
			}else{
				left = right = 0;
				display.setDigitSymbol(0, ' ');
				setTime(display, 1)
				++left;
			}
			count = 0
		}
		++count;
	}

}

bounceTime(disp);



