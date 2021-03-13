const max7219 = require('../MAX7219');


var disp = new max7219(0);
disp.setScanLimit(8);
disp.startup();
disp.clearDisplay();
disp.startDisplayTest();

setTimeout(()=>{
	disp.stopDisplayTest();
}, 1000);

