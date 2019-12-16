ember-user-performance-monitoring
==============================================================================

This addon adds performance timing to your Ember application.


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

```js
// app/routes/application.js
import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';

export default Route.extend({
  userPerformanceMonitoring: service(),

  init() {
    this.initUserPerformance();
  },

  async initUserPerformance() {
    this.userPerformanceMonitoring.on('timingEvent', (eventName, eventDetails, additionalDetails) => {
      // console.log(eventName, eventDetails)
      // Other details:
      // const { currentURL } = additionalDetails;
      // const { load } = additionalDetails;
      // const { connection } = additionalDetails;
      // const { assetTimings } = additionalDetails;
    });
    this.userPerformanceMonitoring.listen();
  }
});
```

### Timing Assets

You can time any assets that get loaded during the start of your app by using the following config:
```js
ENV['ember-user-performance-monitoring'] = {
  includeAssetTimings: true,
  assetTimingOptions: {
    watchedAssets: {
      app_js: {
        matches: 'assets/app.*js$'
      },
      app_css: {
        matches: 'assets/app.*css$'
      },
      vendor_js: {
        matches: 'assets/vendor.*js$'
      },
      vendor_css: {
        matches: 'assets/vendor.*css$'
      }
    }
  }
```

This will match any resource names against the provided regex and provide timings using the name (eg. `app_js`) when the paint event fires as additional details (so you can record asset timing in conjunction with `DCL`or `TTI`).

### Timing Transitions

This hooks into the runloop to time transitions in your app, and can also time rendering (optionally, depending on the inclusion of a component at the end of your template).

```js
ENV['ember-user-performance-monitoring'] = {
  watchTransitions: true,
  enablePerformanceMeasures: true // not necessary but helpful for debugging
}
```

Then you can listen on `timingEvent` on the performance service.
```js
// app/routes/application.js
import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';

export default Route.extend({
  userPerformanceMonitoring: service(),

  init() {
    this.initUserPerformance();
  },

  async initUserPerformance() {
    this.userPerformanceMonitoring.on('timingEvent', (eventName, eventDetails, additionalDetails) => {
      /*
      if (eventName === "transitionWithoutRender") {
        console.log(eventDetails);
      }

      if (eventName === "transitionRender") {
        console.log(eventDetails);
      }
      */
    });
    this.userPerformanceMonitoring.listen();
  }
});
```

Result (for transitionWithRender):
```js
{
  from: "homepage.index"
  to: "posts.list"
  render: 316
  renderCount: 2
  renderToCount: 5
  transition: 445
  transitionCount: 2
  transitionNumber: 10
  transitionToCount: 5
}
```
Breakdown:
- `from` and `to` describe the transition
- `render` and `transition` are the times for those stages, in milliseconds
- `renderCount` and `transitionCount` are the count of times this specific transition has been hit. (useful for pre-fetch or reuse between specific routes).
- `renderToCount` and `transitionToCount` are the count of times this page has been transitioned to (useful for generic background reload performance checks)

Metrics
------------------------------------------------------------------------------
The following lists the load metrics measured by this addon:
- FP (first-paint)
- FCP (first-contentful-paint)
- FMP (first meaningful paint) - Experimental, but this is measured using a wrapper component around the hero component for a page. Since it's manually defined, it should be more accurate then the version that uses largest element, etc.
- TTI (Time to *first consistently* interactive) - experimental, [provided by google chrome labs](https://github.com/GoogleChromeLabs/tti-polyfill)

Additional data collected that can be sent back:
- Visibility / Hidden duration (for when a user navigates away during load)
- Connection (from navigator.connection API if available)
- Asset Timings (uses resource timing api, records transfer and timing, as well as whether local cache was hit)

Contributing
------------------------------------------------------------------------------

See the [Contributing](CONTRIBUTING.md) guide for details.


License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
