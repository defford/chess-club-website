// Stockfish Web Worker
importScripts('/stockfish.wasm.js');

let engine = null;
let isModuleReady = false;

// Wait for Module to be fully initialized
function waitForModule() {
  return new Promise((resolve) => {
    if (Module.asm && Module.asm.T) {
      resolve();
    } else {
      setTimeout(() => waitForModule().then(resolve), 100);
    }
  });
}

self.onmessage = function(e) {
  const command = e.data;
  console.log('Worker received:', command);
  
  if (command === 'init') {
    console.log('Initializing Stockfish...');
    
    // Wait for Module to be fully ready
    waitForModule().then(() => {
      console.log('Module is ready!');
      console.log('Module object:', Module);
      console.log('Module keys:', Object.keys(Module));
      
      // Module is now fully instantiated
      engine = Module;
      isModuleReady = true;
      
      // Override the print function to send messages back to main thread
      Module.print = function(line) {
        console.log('Stockfish output:', line);
        self.postMessage(line);
      };
      
      Module.printErr = function(line) {
        console.error('Stockfish error:', line);
      };
      
      // Now try to send UCI command
      if (Module.ccall) {
        console.log('Using ccall...');
        try {
          // Send UCI command to initialize the engine
          console.log('Sending UCI command via ccall...');
          Module.ccall('uci_command', 'number', ['string'], ['uci']);
          // Wait a bit then send isready
          setTimeout(() => {
            console.log('Sending isready command via ccall...');
            Module.ccall('uci_command', 'number', ['string'], ['isready']);
          }, 100);
        } catch (error) {
          console.error('Error calling ccall:', error);
        }
      } else if (Module._uci_command) {
        console.log('Using _uci_command...');
        try {
          // Try different ways to call _uci_command
          console.log('Trying _uci_command with string...');
          Module._uci_command('uci');
          setTimeout(() => {
            Module._uci_command('isready');
          }, 100);
        } catch (error) {
          console.error('Error calling _uci_command:', error);
        }
      } else {
        console.error('No suitable method found to communicate with Stockfish');
        console.log('Available Module methods:', Object.getOwnPropertyNames(Module));
      }
    });
  } else if (engine && isModuleReady) {
    // Send commands to the engine
    console.log('Sending command to engine:', command);
    
    try {
      if (Module.ccall) {
        Module.ccall('uci_command', 'number', ['string'], [command]);
      } else if (Module._uci_command) {
        Module._uci_command(command);
      } else {
        console.error('No suitable method found to send command:', command);
      }
    } catch (error) {
      console.error('Error sending command:', error);
    }
  } else {
    console.log('Engine not ready yet, queuing command:', command);
  }
};
