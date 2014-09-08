var async = require("async");
var AWS = require("aws-sdk");

var SQSProcessor = function(options) {
  this._queue = new AWS.SQS({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    region: options.region
  });
  this._debug = options.debug;
  this._queueUrl = options.queueUrl;
  this._run = false;
};

SQSProcessor.prototype.startPolling = function(worker_cb, error_cb) {
  this.worker_cb = worker_cb;
  this.error_cb = error_cb;
  this.run = true;
  this._poll();
};

SQSProcessor.prototype._poll = function() {
  var _this = this;

  async.whilst(function() {
    return _this.run;
  }, function(poll_cb) {
    _this._debugMessage("requesting a message");

    _this._receive_request = _this._queue.receiveMessage({
      MaxNumberOfMessages: 1,
      QueueUrl: _this._queueUrl,
      WaitTimeSeconds: 20
    }, function(receive_error, data) {
      _this._receive_request = null;

      if (receive_error) {
        receive_error.from = "queue.recieveMessage()";
        return poll_cb(receive_error);
      }

      if (!data || !Array.isArray(data.Messages) || data.Messages.length !== 1) {
        _this._debugMessage("no messages found");
        return poll_cb();
      }

      var message, receipt_handle;
      try {
        message = JSON.parse(data.Messages[0].Body);
        receipt_handle = data.Messages[0].ReceiptHandle
      } catch (json_error) {
        json_error.data = data.Messages[0].Body;
        return poll_cb(json_error);
      }

      _this._debugMessage("processing %j", message);

      _this.worker_cb(message, function(user_error) {
        if (user_error) {
          return process.nextTick(function() {
            poll_cb(user_error)
          });
        }

        _this._debugMessage("deleting a message");

        _this._queue.deleteMessage({
          QueueUrl: _this._queueUrl,
          ReceiptHandle: receipt_handle
        }, function(delete_error) {
          if (delete_error) {
            delete_error.from = "queue.deleteMessage()";
            return poll_cb(delete_error);
          }

          _this._debugMessage("message deleted");

          poll_cb();
        });
      });
    });
  }, function(poll_error) {
    if (poll_error && poll_error.code !== 'RequestAbortedError') {
      return _this.error_cb(poll_error);
    }

    _this.stop_cb();
  });
};

SQSProcessor.prototype.stopPolling = function(stop_cb) {
  this.run = false;
  this.stop_cb = stop_cb;

  if (this._receive_request) {
    this._receive_request.abort();
  }
};

SQSProcessor.prototype._debugMessage = function() {
  if (this._debug) {
    console.log.apply(null, arguments);
  }
};

module.exports = SQSProcessor;
