var assert = require('assert');
var AWS = require('aws-sdk');
var SQSProcessor = require('..');

var expected = { "hello": "world" };
var receivedMessage = false;

var messager = new AWS.SQS({
  accessKeyId: process.env.SQSP_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.SQSP_AWS_SECRET_ACCESS_KEY,
  region: process.env.SQSP_AWS_REGION,
  params: {
    QueueUrl: process.env.SQSP_AWS_QUEUE_URL
  }
});

messager.sendMessage({
  MessageBody: JSON.stringify(expected)
}, function(sendError, metadata) {
  assert.ifError(sendError);
});

var queue = new SQSProcessor({
  accessKeyId: process.env.SQSP_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.SQSP_AWS_SECRET_ACCESS_KEY,
  region: process.env.SQSP_AWS_REGION,
  queueUrl: process.env.SQSP_AWS_QUEUE_URL
});

queue.startPolling(
  function worker(message, callback) {
    assert.deepEqual(message, expected);
    queue.stopPolling(function() {
      clearTimeout(timeout);
    });
    callback();
  },
  function error(queueError) {
    assert.ifError(queueError);
  }
);

var timeout = setTimeout(function() {
  throw new Error("Timeout: waited 30 seconds and nothing happened");
}, 30 * 1000);
