ember-user-performance-monitoring
==============================================================================

This addon add performance timing to your Ember application.


Compatibility
------------------------------------------------------------------------------

* Ember.js v3.4 or above
* Ember CLI v2.13 or above
* Node.js v8 or above


Installation
------------------------------------------------------------------------------

```
ember install ember-user-performance-monitoring
```

Usage
------------------------------------------------------------------------------

Once installed, you'll need to add event listeners to the provided `userPerformanceMonitoring` service and then call
`.listen` once all listeners are attached. 

You can call this anywhere, but listen should be called once.

For example, adding it to the application routes `init()`:

```
userPerformanceMonitoring: service(),

init() {
  this.initUserPerformance();
},

async initUserPerformance() {
  this.userPerformanceMonitoring.on('timingEvent', (eventName, eventDetails) => {
    // console.log(eventName, eventDetails)
  });
  this.userPerformanceMonitoring.listen();
}
```

Metrics
------------------------------------------------------------------------------
The following lists the metrics measured by this addon:
- FP (first-paint)
- FCP (first-contentful-paint)
- TTI (Time to *first consistently* interactive) - experimental, [provided by google chrome labs](https://github.com/GoogleChromeLabs/tti-polyfill)

Contributing
------------------------------------------------------------------------------

See the [Contributing](CONTRIBUTING.md) guide for details.


License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
