require.paths.unshift(__dirname + "/../lib");
var Conduct = require('conductor');
var fs = require('fs');
var sys = require('sys');

// Generic output debugger to show the result of the functions
function outputHandler(message) { return function callback(err, output) {
  sys.error("\n" + message);
  if (err) {
    sys.error(err.stack + "\n");
  } else {
    sys.error("Success: " + sys.inspect(output));
  }
}}

// Example with mixed sync and async performers
var processFile = Conduct({
  // Load the file (ASYNC)
  A: ["_1", function (name, callback) {
    var filename = name + ".js";
    fs.readFile(filename, callback);
  }],
  // Process the file (SYNC)
  B: ["A0", "_1", "A1", function (err, name, text) {
    if (err) {
      return {name: name, code: 404, message: "File missing"};
    }
    return {name: name, code: 200, message: text.substr(0, 100).split(/\s/g)};
  }],
}, "B1");

// Should output some data
processFile("test", outputHandler("processFile"));
// Should report the caught async error
processFile("I don't exist!", outputHandler("processFile-ERROR"));



var simpleCase = Conduct({
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

// // Same example but without using Conductor.
// // Note the level of error handling done automatically by Conductor.
// function loadArticle(name, callback) {
//   try {
//     var filename = path.join("articles", name + ".markdown");
//     Git.readFile(filename, function (err, markdown) {
//       if (err) {
//         callback(err);
//         return;
//       }
//       try {
//         var props = markdownPreParse(markdown);
//         props.name = name;
//         loadAuthor(props.author, function (err, author) {
//           if (err) {
//             callback(err);
//             return;
//           }
//           try {
//             props.author = author;
//             callback(undefined, props);
//           } catch (err) {
//             callback(err);
//           }
//         });
//       } catch (err) {
//         callback(err);
//       }
//     }
//   } catch (err) {
//     callback(err);
//   }
// }

// // Same as last, but without error handling for clarity.
// function loadArticle(name, callback) {
//   var filename = path.join("articles", name + ".markdown");
//   Git.readFile(filename, function (markdown) {
//     var props = markdownPreParse(markdown);
//     props.name = name;
//     loadAuthor(props.author, function (author) {
//       props.author = author;
//       callback(props);
//     });
//   }
// }

// // Same example, but using Step (note this doesn't catch errors in sync code)
// function loadArticle(name, callback) {
//   var props;
//   Step(
//     function readFile() {
//       Git.readFile(path.join("articles", name + ".markdown"), this);
//     },
//     function getAuthor(err, markdown) {
//       if (err) return callback(err);
//       props = markdownPreParse(markdown);
//       props.name = name;
//       loadAuthor(props.author, this);
//     },
//     function finish(err, author) {
//       props.author = author;
//       callback(null, props);
//     }
//   );
// }
