var sys = require('sys');
var fs = require('fs');

var Instrument = {
};

var Compose = module.exports = function (definitions) {
  var instruments = {};
  for (var name in definitions) {
    // Create an instrument object.
    var instrument = instruments[name] = Object.create(Instrument);
    // These are the extra static args that will be fed to the function.
    instrument.extraArgs = [];
    // This will hold the input indexes left that we're waiting on.
    instrument.waitFlags = [];
    // This will hold the dynamic arguments we got from other functions.
    instrument.pendingData = [];
    // This tells us where to route the resulting data to.
    // It may be already set by another instrument.
    if (!("outputs" in instrument)) instrument.outputs = {};

    // Parse the definition parts
    var mode = 0;
    var index = 0;
    definitions[name].forEach(function (part) {
      // Dependency definition mode
      if (mode === 0) {
        if (typeof(part) === 'string') {
          // Parse out the port index
          var port = part.match(/[0-9]*$/)[0];
          // Get the rest as the sender name
          var sender = part.substr(0, part.length - port.length);
          // Ensure the sender has an outputs entry
          if (!("outputs" in instruments[sender])) instruments[sender].outputs = {};
          // Convert the sender name to a real live sender
          sender = instruments[sender].outputs;
          // Ensure the sender has a queue for the port
          if (!(port in sender)) sender[port] = [];
          // Add self to the output list
          sender[port].push({name: name, index: index});
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
  B: ["A1", function (data) {
    // TODO: Do something
  }],
  E: ["A0", function errorHandler() {}]
})
