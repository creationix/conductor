var sys = require('sys');
var fs = require('fs');

function isEmpty(obj) {
  for (var i in ob) return false;
  return true;
}

var Compose = module.exports = function (definitions) {
  var instruments = {};
  var parentOutputs = {};
  var childInputs = {};
  
  // All functions share a common "this" context
  var context = {};
  
  // Initialize the instruments states
  for (var name in definitions) {
    // Create an instrument object.
    instruments[name] = {
      // These are the extra static args that will be fed to the function.
      extraArgs: [],
      // This is a counter of pending inputs
      counter: 0,
      // This will hold the dynamic arguments we got from other functions.
      pendingData: [],
      // This tells us where to route the resulting data to.
      outputs: {}
    };
  }
  
  // Parse the configurations
  for (var name in definitions) {
    var instrument = instruments[name];

    // Use a mini state-machine to parse the parts
    var mode = 0;
    var index = 0;
    definitions[name].forEach(function (part) {
      // Dependency definition mode
      if (mode === 0) {
        if (typeof(part) === 'string') {
          if (!(/^(?:_|[a-z]+)[0-9]+$/i).test(part)) {
            throw new Error("Invalid dependency: " + JSON.stringify(part));
          }
          // Parse out the port index
          var port = part.match(/[0-9]+$/)[0];
          // Get the rest as the sender name
          var sender = part.substr(0, part.length - port.length);
          if (sender in instruments) {
            // Convert the sender name to a real live sender
            sender = instruments[sender].outputs;
          } else if (sender === '_') {
            sender = parentOutputs;
          }
          if (typeof sender === 'object') {
            // Ensure the sender has a queue for the port
            if (!(port in sender)) sender[port] = [];
            // Add self to the output list
            sender[port].push({name: name, index: index});
          }
          // Increment the counter
          instrument.counter++;
        } else {
          mode = 1;
        }
      }
      
      // Function definition mode
      if (mode === 1) {
        instrument.fn = part;
        mode = 2;
        return;
      }
      
      // Extra arg definition mode
      if (mode === 2) {
        instrument.extraArgs.push(part);
      }
      index++;
    });
  }
  
  childInputs = Array.prototype.slice.call(arguments, 1);
  
  // Dispatch arguments to everyone listening for it.
  function dispatch(routes, args) {
    for (var index in routes) {
      var arg = args[index];
      if (typeof arg !== 'undefined') {
        routes[index].forEach(function (route) {
          var receiver = instruments[route.name]
          receiver.pendingData[route.index] = arg;
          receiver.counter--;
          if (receiver.counter === 0) {
            sys.puts("Calling " + route.name);
            execute(receiver);
          }
        });
      }
    }
    checkReady();
  }
  
  function execute(instrument) {
    function callback() {
      dispatch(instrument.outputs, arguments);
    }
    
    var args = instrument.extraArgs.concat(instrument.pendingData).concat([callback]);
    
    // Reset the state
    for (var index in instrument.pendingData) {
      index.counter++;
      delete instrument.pendingData[index];
    }
    
    instrument.fn.apply(context, args);
  }
  
  // Looks for instruments that are ready to play and starts them
  function checkReady() {
    sys.puts("checkReady");
    sys.puts(sys.inspect(parentOutputs, false, 10));
    sys.puts(sys.inspect(instruments, false, 10));
    sys.puts(sys.inspect(childInputs, false, 10));
    for (var name in instruments) {
      var instrument = instruments[name];
    }
  }
  
  return function instrumentEngine() {
    // Dispatch any arguments coming into the engine
    dispatch(parentOutputs, arguments);
  };
}

// 
// Compose({
//   A: [function(callback) {
//     process.nextTick(function () {
//       callback("a1", "a2");
//     });
//   }],
//   B: ["A1", function (input, callback) {
//     process.nextTick(function () {
//       callback(input + "modified");
//     });
//   }],
//   C: ["A0","B0", function (input1, input2, callback) {
//     sys.p({
//       input1: input1,
//       input2: input2
//     });
//   }]
// });

// Compose({
//   A: [fs.readFile, "data.txt"],
//   B: ["A1", sys.puts],
//   E: ["A0", sys.error]
// })
// 
// Compose({
//   A: [fs.readFile, __filename],
//   B: ["A1", sys.puts],
//   E: ["A0", sys.error]
// })
// 
Compose({
  A: ["_0", fs.readFile],
  B: ["A1", sys.puts],
  E: ["A0", sys.error]
})('test')
// 
// Compose({
//   A: ["_0", fs.readFile],
//   B: ["A1", sys.puts],
//   E: ["A0", sys.error]
// }, "B0");
