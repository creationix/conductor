require.paths.unshift(__dirname + "/../lib");
var Compose = require('composer');
var fs = require('fs');
var sys = require('sys');


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
})();

// Compose({
//   A: [fs.readFile, "badFile.txt"],
//   B: ["A1", sys.puts],
//   E: ["A0", sys.p]
// })()
// 
// Compose({
//   A: [fs.readFile, __filename],
//   B: ["A1", sys.puts],
//   E: ["A0", sys.error]
// })()

// Compose({
//   A: ["_0", fs.readFile],
//   B: ["A1", sys.puts],
//   E: ["A0", sys.error]
// })(__filename)
// 
// Compose({
//   A: ["_0", fs.readFile],
//   B: ["A1", function (text, callback) {
//     process.nextTick(function () {
//       callback(text.toLowerCase());
//     });
//   }],
//   E: ["A0", sys.error]
// }, "B0")(__filename, sys.puts);
