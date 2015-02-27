var async = require("async");
var AWS = require("aws-sdk");
var debug = require("debug")("sqs-processor");

var SQSProcessor = function(options) {
  this._queue = new AWS.SQS({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    region: options.region,
    params: {
      QueueUrl: options.queueUrl
    }
  });
  this._run = false;
};

SQSProcessor.prototype.startPolling = function(worker_cb, error_cb) {
  this._worker_cb = worker_cb;
  this._error_cb = error_cb;
  this._run = true;
  this._poll();
};

SQSProcessor.prototype._poll = function() {
  var that = this;

  async.whilst(function() {
    return that._run;
  }, function(poll_cb) {
    debug("requesting message");

    that._receive_request = that._queue.receiveMessage({
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20
    }, function(receive_error, data) {
      that._receive_request = null;

      if (receive_error) {
        receive_error.from = "queue.recieveMessage()";
        return poll_cb(receive_error);
      }

      if (!data || !Array.isArray(data.Messages) || data.Messages.length !== 1) {
        debug("no messages found");
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

      debug("processing %j", message);

      that._worker_cb(message, function(user_error) {
        if (user_error) {
          return process.nextTick(function() {
            poll_cb(user_error)
          });
        }

        debug("deleting message %s", receipt_handle);

        that._queue.deleteMessage({
          ReceiptHandle: receipt_handle
        }, function(delete_error) {
          if (delete_error) {
            delete_error.from = "queue.deleteMessage()";
            return poll_cb(delete_error);
          }

          debug("message %s deleted", receipt_handle);

          poll_cb();
        });
      });
    });
  }, function(poll_error) {
    if (!that._run) {
      if (that._stop_cb) {
        that._stop_cb()
      }
      return;
    }

    that._error_cb(poll_error);
    process.nextTick(function() {
      that._poll();
    });
  });
};

SQSProcessor.prototype.stopPolling = function(stop_cb) {
  this._stop_cb = stop_cb;
  this._run = false;

  if (this._receive_request) {
    this._receive_request.abort();
  }
};

module.exports = SQSProcessor;
