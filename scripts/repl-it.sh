#!/usr/local/bin/node

var repl = require("repl");

console.log("Starting 'disp' on SPI bus 0\n");
var context = repl.start("$ ").context;

// Configure what’s available in the REPL
context.MAX = require("../MAX7219");
context.disp = new context.MAX(0);
