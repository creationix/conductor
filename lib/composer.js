var sys = require('sys');

var Compose = module.exports = function (instruments) {
  var outputs = {};
  for (var name in instruments) {
    var mode = 0;
    var index = 0;
    instruments[name].forEach(function (part) {
      if (mode === 0 && typeof(part) === 'string') {
        // Parse out the port index
        var port = part.match(/[0-9]*$/)[0];
        // Get the rest as the sender name
        var sender = part.substr(0, part.length - port.length);
        // Ensure the sender has an outputs entry
        if (!(sender in outputs)) outputs[sender] = {};
        // Convert the sender name to a real live sender
        sender = outputs[sender];
        // Ensure the sender has a queue for the port
        if (!(port in sender)) sender[port] = [];
        // Convert the port name to a real live port
        port = sender[port];
        // Add self to the output list
        port.push({name: name, index: index});
      }
      index++;
    });
  }
  sys.puts(sys.inspect(outputs, false, 10));
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

// SomeLibrary.group({
//   A: [fs.readFile, "data.txt"],
//   B: ["A1", function (data) {
//     // TODO: Do something
//   }]
//   E: ["A0", errorHandler]
// })
