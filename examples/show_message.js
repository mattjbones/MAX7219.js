
const max7219 = require('../MAX7219');

const disp = new max7219(0);
disp.setScanLimit(8);
disp.startup();
disp.clearDisplay();

disp.showMessage("Hello, everyone", 250);
