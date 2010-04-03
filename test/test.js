require.paths.unshift(__dirname + "/../lib");
var Conduct = require('conductor');
var fs = require('fs');
var sys = require('sys');


Conduct({
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

// 
// Conduct({
//   A: ["_0", sys.p],
// })([1,2,3])

// Conduct({
//   A: [fs.readFile, "badFile.txt"],
//   B: ["A1", sys.puts],
//   E: ["A0", sys.p]
// })()
// 
// Conduct({
//   A: [fs.readFile, __filename],
//   B: ["A1", sys.puts],
//   E: ["A0", sys.error]
// })()

// Conduct({
//   A: ["_0", fs.readFile],
//   B: ["A1", sys.puts],
//   E: ["A0", sys.error]
// })(__filename)
// 
// Conduct({
//   A: ["_0", fs.readFile],
//   B: ["A1", function (text, callback) {
//     process.nextTick(function () {
//       callback(text.toLowerCase());
//     });
//   }],
//   E: ["A0", sys.error]
// }, "B0")(__filename, sys.puts);


// Given an article name, calls back with the data object for the article.
var loadArticle = Conduct({
  // Load the markdown for the article
  A: ["_0", function (name, callback) {
    var filename = path.join("articles", name + ".markdown");
    Git.readFile(filename, callback);
  }],
  // Process the markdown
  B: ["_0", "A1", function (name, markdown) {
    var props = markdownPreParse(markdown);
    props.name = name;
    return props;
  }],
  // Load the author linked to the article
  C: ["B1", function (props, callback) {
    loadAuthor(props.author, callback);
  }],
  // Merge in the author and finish
  D: ["B1", "C1", function (props, author, callback) {
    props.author = author;
    callback(undefined, props);
  }]
}, "D1");

// Same example but without using Conductor.
// Note the level of error handling done automatically by Conductor.
function loadArticle(name, callback) {
  try {
    var filename = path.join("articles", name + ".markdown");
    Git.readFile(filename, function (err, markdown) {
      if (err) {
        callback(err);
        return;
      }
      try {
        var props = markdownPreParse(markdown);
        props.name = name;
        loadAuthor(props.author, function (err, author) {
          if (err) {
            callback(err);
            return;
          }
          try {
            props.author = author;
            callback(undefined, props);
          } catch (err) {
            callback(err);
          }
        });
      } catch (err) {
        callback(err);
      }
    }
  } catch (err) {
    callback(err);
  }
}

// Same as last, but without error handling for clarity.
function loadArticle(name, callback) {
  var filename = path.join("articles", name + ".markdown");
  Git.readFile(filename, function (markdown) {
    var props = markdownPreParse(markdown);
    props.name = name;
    loadAuthor(props.author, function (author) {
      props.author = author;
      callback(props);
    });
  }
}

// Same example, but using Step (note this doesn't catch errors in sync code)
function loadArticle(name, callback) {
  var props;
  Step(
    function readFile() {
      Git.readFile(path.join("articles", name + ".markdown"), this);
    },
    function getAuthor(err, markdown) {
      if (err) return callback(err);
      props = markdownPreParse(markdown);
      props.name = name;
      loadAuthor(props.author, this);
    },
    function finish(err, author) {
      props.author = author;
      callback(null, props);
    }
  );
}
