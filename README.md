# sqs-processor

SQS processor for nodejs

## Example

```javascript
var SQSProcessor = require('sqs-processor');

var queue = new SQSProcessor({
  accessKeyId: 'aws id',
  secretAccessKey: 'aws secret',
  region: 'aws region',
  queueUrl: 'queue url',
  debug: true
});

queue.startPolling(
  function worker(message, callback) {
    console.log(message);
    callback();
  },
  function error(queueError) {
    throw queueError;
  }
);

setTimeout(function() {
  queue.stopPolling(function stop() {
    console.log('stopped polling');
  });
}, 10000);
```

## Constructor options

* `accessKeyId` - **required** *String*
  * Your AWS access key ID.
* `secretAccessKey` - **required** *String*
  * Your AWS secret access key.
* `region` - **required** *String*
  * The [region](https://docs.aws.amazon.com/general/latest/gr/rande.html) to send service requests to.
* `queueUrl` - **required** *String*
  * The URL of the Amazon SQS queue to take action on.
* `debug` - optional *Boolean*
  * Print helpful debugging messages.

## API

* `startPolling(worker_callback, error_callback)`
  * `worker_callback` is passed two arguments (`message`, `callback`) where `message` is an Object containing data and `callback` is a function that **must** be called when you are finished processing the message. If you pass an `Error` into the `callback` then processing will halt and the `error_callback` will be called with your error.
  * `error_callback` is passed one argument (`error`) where `error` is an `Error`.
* `stopPolling(stop_callback)`
  * `stop_callback` is passed no arguments. It will be called once the queue has stopped polling. If you currently have a message in progress, it will wait until that message is processed before stopping.