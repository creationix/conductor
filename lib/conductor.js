/*jslint white: true, onevar: true, undef: true, eqeqeq: true, bitwise: true, regexp: true, newcap: true, immed: true, indent: 2 */
/*
Copyright (c) 2010 Tim Caswell <tim@creationix>, Elijah Insua <tmpvar@gmail.com>

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

// Implements a forEach much like the one for Array.prototype.forEach, but for
// any object.  This is actually faster than a plain for...in on node.js
if (typeof Object.prototype.forEach !== 'function') {
  Object.defineProperty(Object.prototype, "forEach", {value: function (callback, thisObject) {
    var keys, key, i, length;
    keys = Object.keys(this);
    length = keys.length;
    for (i = 0; i < length; i++) {
      key = keys[i];
      callback.call(thisObject, this[key], key, this);
    }
  }});
}

function Conduct(definitions) {
  var performers = {};

  // Hook up the main output.
  // The callback function will get replace with the one passed into execute.
  definitions._ = ["_0"].concat(Array.prototype.slice.call(arguments, 1).concat([function () {}]));

  // Initialize the performers states
  definitions.forEach(function (_, name) {
    // Create an performer object.
    performers[name] = {
      // These are the extra static args that will be fed to the function.
      extraArgs: [],
      // This is a counter of pending inputs
      counter: 0,
      // This will hold the dynamic arguments we got from other functions.
      pendingData: [],
      // This tells us where to route the resulting data to.
      outputs: {},
      // Does this function needs a callback
      needsCallback: false
    };
  });

  // Parse the configurations
  definitions.forEach(function (definition, name) {
    var performer = performers[name],
        mode = 0,
        index = 0;
    definition.forEach(function (part) {
      var port, sender;
      // Dependency definition mode
      if (mode === 0) {
        if (typeof(part) === 'string') {
          if (!(/^(?:_|[a-z]+)[0-9]+$/i).test(part)) {
            throw new Error("Invalid dependency: " + JSON.stringify(part));
          }
          // Parse out the port index
          port = part.match(/[0-9]+$/)[0];
          // Get the rest as the sender name
          sender = part.substr(0, part.length - port.length);
          // Tell the sender it needs a callback
          if (sender !== "_") {
            performers[sender].needsCallback = true;
          }
          // Convert the sender name to a real live sender
          sender = performers[sender].outputs;
          // Ensure the sender has a queue for the port
          if (!(port in sender)) {
            sender[port] = [];
          }
          // Add self to the output list
          sender[port].push({name: name, index: index});
          // Increment the counter
          performer.counter++;
        } else {
          mode = 1;
        }
      }

      // Function definition mode
      if (mode === 1) {
        performer.fn = part;
        mode = 2;
        return;
      }

      // Extra arg definition mode
      if (mode === 2) {
        performer.extraArgs.push(part);
      }
      index++;
    });
  });

  return function performerEngine() {

    var localPerformers = {},
        handler = arguments[arguments.length - 1];
    
    // Clone the performers structure so we don't mess with the original.
    performers.forEach(function (performer, name) {
      var newPerformer = localPerformers[name] = {};
      performer.forEach(function (value, key) {
        if (key === 'pendingData') {
          newPerformer.pendingData = [];
          for (var i = 0, l = value.length; i < l; i++) {
            newPerformer.pendingData[i] = value[i];
          }
        } else {
          newPerformer[key] = value;
        }
      });
    });
    
    // Hook up the passed in callback if any
    if (typeof handler === 'function') {
      localPerformers._.fn = handler;
    }

    // Dispatch arguments to everyone listening for it.
    function dispatch(routes, args) {
      // Make a note that there was an error.
      var err = args[0];
      // If the error is unhandled, then forward it to the global callback.
      if (err && !routes[0]) {
        localPerformers._.fn(err);
        return;
      }

      routes.forEach(function (route, index) {
        var arg = args[index];
        route.forEach(function (route) {
          // Route the message to the receiver that's waiting for it.
          var receiver = localPerformers[route.name];
          receiver.pendingData[route.index] = arg;

          // Check for ready performers and execute them if needed.
          receiver.counter--;
        
          if (receiver.counter === 0) {
            execute(receiver);
            delete localPerformers[route.name];
          }
        });
      });

    }

    function execute(performer) {
      var args = performer.extraArgs.concat(performer.pendingData),
          result;
      function callback() {
        dispatch(performer.outputs, arguments);
      }
      if (performer.needsCallback) {
        args.push(callback);
      }

      // Call the main function, catching any sync exceptions
      try {
        result = performer.fn.apply(null, args);
      } catch (err) {
        process.nextTick(function () {
          dispatch(performer.outputs, [err]);
        });
        return;
      }
      
      // If a sync result was returned, then dispatch it.
      if (result !== undefined) {
        process.nextTick(function () {
          dispatch(performer.outputs, [undefined, result]);
        });
      }
    }


    // Dispatch any arguments coming into the engine
    Array.prototype.unshift.call(arguments, undefined);
    dispatch(localPerformers._.outputs, arguments);

    // Look for ready to start functions too
    // Look for any ready functions and start them
    localPerformers.forEach(function (performer, name) {
      if (performer.counter === 0 && name !== '_') {
        execute(performer);
        delete localPerformers[name];
      }
    });
  };
}

// Hook into commonjs module systems
if (typeof module !== 'undefined' && "exports" in module) {
  module.exports = Conduct;
}