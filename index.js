/**
 * Do constructor.
 *
 * Examples:
 *
 *   // Create 1 todo
 *   var todo = new Do();
 *   // Create 3 todos.
 *   var todo = new Do(3);
 *   // Without a "new" statement.
 *   var todo = Do();
 *
 * @param {Number?} amount of todos
 * @api public
 */
function Do(amount) {
    if (!(this instanceof Do)) {
        return new Do(amount);
    }
    this._amount = amount || 0;
    this.errors = [];
    this.done = this.done.bind(this);
}

module.exports = Do;

/**
 * Accumulated errors.
 *
 * @api public
 * @property errors
 */
Do.prototype.errors;

/**
 * Setter/getter for amount of todos.
 *
 * Examples:
 *
 *   // Get the current amount.
 *   todo.amount();
 *   // Set a new amount.
 *   todo.amount(3);
 *
 * @param {Number?} value - if passed works as a setter, otherwise as a getter.
 * @return {Number|Do} amount or instance
 * @api public
 */
Do.prototype.amount = function(value) {
    if (value != null) {
        this._amount = value;
        return this;
    }

    return this._amount;
};

/**
 * Increment amount of todos.
 *
 * Examles:
 *
 *   // Add 1 todo.
 *   todo.inc();
 *   // Add 3 todos.
 *   todo.inc(3)
 *
 * @param {Number?} value - add the value to the current amount or just 1.
 * @return {Number} amount
 * @api public
 */
Do.prototype.inc = function(value) {
    this._amount += value || 1;
    return this;
};

/**
 * Decrement amount of todos.
 *
 * Examples:
 *
 *   // Reduce at 1 todo.
 *   todo.dec();
 *   // Reduce at 3 todos.
 *   todo.dec(3)
 *
 * @param {Number?} value - substitute the value from the current amount or just 1.
 * @return {Number} amount
 * @api public
 */
Do.prototype.dec = function(value) {
    this._amount -= value || 1;
    return this;
};

/**
 * Set an error callback or trigger an error.
 *
 * Error callback is called EVERY time an error is passed to Do#done or Do#error.
 * If you send an http response in the error handler, ensure to do it only once.
 *
 * Examples:
 *
 *   // Define error callback.
 *   todo.error(function(err) {
 *       console.error(err);
 *       // Ensure sending response only once.
 *       if (this.errors.length == 1) {
 *          req.send('Error')
 *       }
 *   });
 *   // Trigger an error manually.
 *   todo.error(new Error());
 *
 * @param {Function|Error?} err - if function passed, it is used as an error callback,
 *     otherwise it can be an error which is passed to the error callback defined before.
 * @return {Do} instance
 * @api public
 */
Do.prototype.error = function(err) {
    if (!err) {
        return this;
    }

    if (typeof err == 'function') {
        this._error = err;
    } else {
        this.errors.push(err);
        this._error.apply(this, arguments);
    }

    return this;
};

/**
 * Set a success callback or trigger success.
 *
 * If all todos are done without errors - success callback will be called by Do#done.
 * Success callback is called ONLY ONCE.
 *
 * Examples:
 *
 *   // Define a success callback.
 *   todo.success(function() {
 *      res.send('Success');
 *   });
 *   // Trigger success manually.
 *   todo.success();
 *
 * @param {Function?} fn - if function passed, it is used as success callback,
 *     otherwise success callback defined before will be invoked.
 * @return {Do} instance
 * @api public
 */
Do.prototype.success = function(fn) {
    if (typeof fn == 'function') {
        this._success = fn;
    } else {
        if (this._successCalled) {
            this.error(new Error('Do#success called more than once.'));
        } else if (!this.errors.length) {
            this._successCalled = true;
            this._success.apply(this, arguments);
        }
    }

    return this;
};

/**
 * Indicate a done task. If an error is passed as first parameter - error will
 * be triggered.
 *
 * Examples:
 *
 *   // with error
 *   todo.done(err);
 *   // without error
 *   todo.done();
 *   // context of `todo.done` is ensured.
 *   someTask(todo.done);
 *
 * Also it solves another issue with callbacks. If we pass a function reference
 * to some other function - we never know if the other function could call the callback
 * synchronously f.e. in case there is nothing todo in async manner. In that case
 * and in case of conditional incrementation/decrementation of todos amount, it can
 * happen that `Do#done` is called more than once.
 *
 * Example:
 *
 *   var todo = Do();
 *   todo.error(error);
 *   todo.success(success);
 *   function someAyncFn(callback) {
 *      if (nothingTodo) {
 *          return callback();
 *      }
 *   }
 *   if (a == 1) {
 *       todo.inc();
 *       // If this function calls `done` callback synchronously - success callback
 *       // will be called as there is nothing to do any more and the case "a == 2"
 *       // is not executed yet.
 *       someAyncFn(todo.done);
 *   }
 *   if (a == 2) {
 *       todo.inc();
 *       someAyncFn(todo.done);
 *   }
 *
 * @param {Error?} err - if error passed, error callback will be called,
 *     otherwise if all todos without errors are done, success callback will be called.
 * @return {Do} instance
 * @api public
 */
Do.prototype.done = function() {
    var self = this,
        args = arguments;

    if (!this._error || !this._success) {
        throw new Error('Either "error" or "success" callback is not defined.');
    }

    process.nextTick(function() {
        self._done.apply(self, args);
    });

    return this;
};

/**
 * Call success or error callback.
 *
 * @see Do#done
 * @api private
 */
Do.prototype._done = function(err) {
    if (err) {
        this.error(err);
        return this;
    }

    this._amount--;

    if (this._amount === 0) {
        this.success.apply(this, arguments);
    } else if (this._amount < 0) {
        this.error(new Error('Do#done called more times than defined.'));
    }

    return this;
};
