
const max7219 = require('../MAX7219');
const name = process.argv[2];

const disp = new max7219(0);
disp.setScanLimit(8);
disp.startup();
disp.clearDisplay();

disp.setText(name);
