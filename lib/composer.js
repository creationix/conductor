var sys = require('sys');
var fs = require('fs');

var Compose = module.exports = function (definitions) {
  var instruments = {};
  var globalOutputs = {};
  
  // Initialize the instruments states
  for (var name in definitions) {
    // Create an instrument object.
    instruments[name] = {
      // These are the extra static args that will be fed to the function.
      extraArgs: [],
      // This will hold the input indexes left that we're waiting on.
      waitFlags: [],
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
            sender = globalOutputs;
          }
          if (typeof sender === 'object') {
            // Ensure the sender has a queue for the port
            if (!(port in sender)) sender[port] = [];
            // Add self to the output list
            sender[port].push({name: name, index: index});
          }
          // Mark the input as pending
          instrument.waitFlags[index] = true;
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
  sys.puts(sys.inspect(globalOutputs, false, 10));
  sys.puts(sys.inspect(instruments, false, 10));
}


Compose({
  A: [function(callback) {
    process.nextTick(function () {
      callback("a1", "a2");
    });
  }],
  B: ["A1", function (input, callback) {
    process.nextTick(function () {
      callback(input + "modified");
    });
  }],
  C: ["A0","B0", function (input1, input2, callback) {
    sys.p({
      input1: input1,
      input2: input2
    });
  }]
});

Compose({
  A: [fs.readFile, "data.txt"],
  B: ["A1", sys.puts],
  E: ["A0", sys.error]
})

Compose({
  A: [fs.readFile, __filename],
  B: ["A1", sys.puts],
  E: ["A0", sys.error]
})

Compose({
  A: ["_0", fs.readFile],
  B: ["A1", sys.puts],
  E: ["A0", sys.error]
})
