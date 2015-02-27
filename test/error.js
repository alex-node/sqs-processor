var assert = require('assert');
var SQSProcessor = require('..');

var queue = new SQSProcessor({
  accessKeyId: process.env.SQSP_AWS_ACCESS_KEY_ID,
  secretAccessKey: 'wrongwrongwrong',
  region: process.env.SQSP_AWS_REGION,
  queueUrl: process.env.SQSP_AWS_QUEUE_URL
});

queue.startPolling(
  function worker(message, callback) {
    assert.ifError(new Error("This shouldn't be called"));
  },
  function error(queueError) {
    assert(queueError);
    queue.stopPolling(function() {
      clearTimeout(timeout);
    });
  }
);

var timeout = setTimeout(function() {
  assert.ifError(new Error("Timeout: waited 30 seconds and nothing happened"));
}, 30 * 1000);
