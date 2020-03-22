import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { computed, get, getProperties } from '@ember/object';
import { getOwner } from '@ember/application';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
import { run } from '@ember/runloop';
import ttiPolyfill from 'tti-polyfill';

function getAssetTimings(options) {
  const performance = window.performance;

  if (!performance) {
    return {};
  }

  const watchedAssets = options.watchedAssets;

  let assetAllStart = Number.POSITIVE_INFINITY;
  let assetAllEnd = Number.NEGATIVE_INFINITY;
  let lastLoadedWatchedAsset = ''; // The watched assets might not load at the same time, but for performance the last loaded asset will be the one blocking render, regardless of when they started (unless your assets include non-critical path files)

  const result = {};

  performance.getEntriesByType("resource").forEach(resource => {
    const { name: resourceName } = resource;

    Object.entries(watchedAssets).forEach(([name, value]) => {
      const regex = new RegExp(value.matches);
      if (resourceName.match(regex)) {
        const startTime = Math.round(resource.startTime);
        const responseEnd = Math.round(resource.responseEnd);

        if (responseEnd > assetAllEnd) {
          lastLoadedWatchedAsset = name;
        }

        assetAllStart = Math.min(startTime, assetAllStart);
        assetAllEnd = Math.max(responseEnd, assetAllEnd);

        const transferDuration = responseEnd - startTime;
        const isCached = !resource.transferSize;
        const transferSize = resource.transferSize;
        const encodedBodySize = resource.encodedBodySize;
        const decodedBodySize = resource.decodedBodySize;
        const resourceName = resource.name;

        const resourceResult = {
          transferDuration,
          isCached,
          transferSize,
          encodedBodySize,
          decodedBodySize,
          resourceName
        };

        const namedResourceResult = {};
        Object.entries(resourceResult).forEach(([field, value]) => namedResourceResult[`${name}_${field}`] = value);
        Object.assign(result, namedResourceResult);
      }
    });
  });

  const allWatchedAssetsDuration = assetAllEnd - assetAllStart;
  Object.assign(result, {
    allWatchedAssetsDuration,
    lastLoadedWatchedAsset
  });

  if (allWatchedAssetsDuration <= 0 ) {
    return {}; // Guard to not return negative infinity
  }

  return result;
}

function getTransitionKey(transition, router) {
  const { from, to } = getTransitionInformation(transition, router);
  return [from, to].join(' -> ');
}

function getTransitionInformation(transition, router) {
  const from = transition && transition.from ? transition.from.name : 'none';
  const to = transition ? transition.to.name : router.currentRouteName;
  return {
    from,
    to
  }
}

export default Service.extend(Evented, {
  _isListening: false,

  router: service(),

  _config: computed(function() {
    if (!this.get('isDestroyed') && !this.get('isDestroying')) {
      return getOwner(this).resolveRegistration('config:environment')['ember-user-performance-monitoring'];
    }
    return {};
  }),

  init() {
    this._seenEvents = {};
    this._renderMonitoringTree = {};
    this._renderMonitors = {};
    this._performanceMarks = {};

    this._topLevelRenderPromise = new Promise(resolve => {
      this._topLevelRenderResolve = resolve;
    });

    this.watchTransitions();

    return this._super(...arguments);
  },

  watchTransitions() {
    if (this._config.watchTransitions) {
      this._transitionTimings = {};
      this._transitionToTimings = {};
      this._totalTransitionCount = 0;

      let lastTransitionTime = Date.now();
      let lastTransitionEndTime = Date.now();
      let lastTransitionInfo;
      let lastTransitionKey;

      this.router._router.on('willTransition', (transition) => {
        lastTransitionInfo = getTransitionInformation(transition, this.router);
        lastTransitionKey = getTransitionKey(transition, this.router);
        lastTransitionTime = Date.now();
        this.startPerformanceMeasure(this._getTransitionMeasureLabel('load', lastTransitionKey));
      });

      this.router._router.on('didTransition', () => {
        lastTransitionEndTime = Date.now();
        this._totalTransitionCount++;

        this.endPerformanceMeasure(this._getTransitionMeasureLabel('load', lastTransitionKey));
        this.startPerformanceMeasure(this._getTransitionMeasureLabel('render', lastTransitionKey));


        if (!this._transitionToTimings[lastTransitionInfo.to]) {
          this._transitionToTimings[lastTransitionInfo.to] = {
            transitionToCount: 0,
            renderToCount: 0
          };
        }

        const transitionToTiming = this._transitionToTimings[lastTransitionInfo.to];
        transitionToTiming['transitionToCount']++;

        if (!this._transitionTimings[lastTransitionKey]) {
          this._transitionTimings[lastTransitionKey] = {
            transitionCount: 0,
            renderCount: 0
          };
        }


        const transitionTiming = this._transitionTimings[lastTransitionKey];
        transitionTiming['transitionNumber'] = this._totalTransitionCount;
        transitionTiming['transition'] = lastTransitionEndTime - lastTransitionTime;
        transitionTiming['transitionCount']++;

        run.next(() => {
          run.schedule('destroy', () => {
            if (!transitionTiming['render']) {
              const eventDetails = Object.assign({}, transitionTiming, lastTransitionInfo, transitionToTiming);
              this.trigger('timingEvent', 'transitionWithoutRender', eventDetails);
            }
          });
        });
      });

      this.on('didRenderMonitorComponent', () => {
        const renderTime = Date.now();
        this.endPerformanceMeasure(this._getTransitionMeasureLabel('render', lastTransitionKey));
        const transitionToTiming = this._transitionToTimings[lastTransitionInfo.to];
        transitionToTiming['renderToCount']++;

        const transitionTiming = this._transitionTimings[lastTransitionKey];
        transitionTiming['render'] = renderTime - lastTransitionEndTime;
        transitionTiming['renderCount']++;

        const eventDetails = Object.assign({}, transitionTiming, lastTransitionInfo, transitionToTiming);
        this.trigger('timingEvent', 'transitionWithRender', eventDetails);
      });
    }
  },

  _getTransitionMeasureLabel(stage, transition) {
    return `${stage} (${transition})`;
  },

  startPerformanceMeasure(label) {
    if (!window || !window.performance || !this._config.enablePerformanceMeasures) {
      return;
    }
    try {
      const mark = performance.mark(label);
      this._performanceMarks[label] = mark;
    } catch(e) {
      //
    }
  },

  endPerformanceMeasure(label) {
    if (!window || !window.performance || !this._config.enablePerformanceMeasures) {
      return;
    }

    try {
      const startMark = this._performanceMarks[label];
      if (!startMark) {
        return;
      }

      performance.measure(label, { start: label });
    } catch(e) {
      //
    }
  },

  _onEvent(eventName, eventDetails) {
    const additionalDetails = {
      currentURL: this.router.currentURL
    };

    if (this._config.observeLoad) {
      const hiddenFor = window.__metric_hidden_for;
      const visibilityChanged = !!window.__metric_last_visible || !!hiddenFor;
      Object.assign(additionalDetails, {
        load: {
        visibilityChanged,
        hiddenFor
        }
      });
    }

    if (this._config.includeConnection) {
      const connection = get(window, 'navigator.connection');
      if (connection) {
        Object.assign(additionalDetails, {
          connection: {
            downlink: connection.downlink,
            rtt: connection.rtt
          }
        });
      }
    }

    if (this._config.includeAssetTimings) {
      const assetTimingOptions = this._config.assetTimingOptions;
      if (assetTimingOptions) {
        const assetTimings = getAssetTimings(assetTimingOptions);
        Object.assign(additionalDetails, {
          assetTimings
        });
      }
    }

    this.trigger('timingEvent', eventName, eventDetails, additionalDetails);
  },

  addRenderMonitor(key, tree) {
    if (!this._renderMonitoringTree[key]) {
      return; // Only monitor the first render
    }
    const promisifiedTree = hash(tree);
    this._renderMonitors[key] = promisifiedTree;
    this._renderMonitoringTree[key] = promisifiedTree;
  },

  addRenderMonitorChild(parentKey, key, tree) {
    this._renderMonitors[parentKey].children[key] = tree;
    this._renderMonitors[key] = tree;
  },

  getEvents(events) {
    return getProperties(this._seenEvents, ...events);
  },

  async resolveTopLevelRender(tree) {
    return this._topLevelRenderResolve(await tree);
  },

  listen() {
    if (this._isListening) {
      return;
    }

    this.set('isListening', true);

    const callbackClosure = (eventName, e) => {
      if (!this.get('isDestroyed') && !this.get('isDestroying')) {
        this._seenEvents[eventName] = e;
        this._onEvent(eventName, e);
      }
    };

    if (window.__emberUserPerf && !window.__emberUserPerfCallback) {
      window.__emberUserPerfCallback = callbackClosure;

      Object.entries(window.__emberUserPerf).forEach(([key, value]) => {
        callbackClosure(key, value);
      });
    }

    if (this._config.observeLoad) {
      if (window.__metric_DCL) {
        callbackClosure('DCL', {
          time: Math.round(window.__metric_DCL)
        });
      }
      if (window.__metric_load) {
        callbackClosure('load', {
          time: Math.round(window.__metric_load)
        });
      }
      // Sets up callback for if load is called after service is initialized
      if (!window.__metric_load && !window.__metric_load_callback) {
        window.__metric_load_callback = callbackClosure;
      }
    }

    if (this._config.observeTTI) {
      const opts = {} || this._config.observeTTI.options;
      ttiPolyfill.getFirstConsistentlyInteractive(opts).then((tti) => {
        tti = Math.round(tti);
        callbackClosure('TTI', {
          time: tti
        });
      });
    }

    if (this._config.observeComponentRenders) {
      this._topLevelRenderPromise.then((renderTree) => {
        callbackClosure('FMP', {
          time: renderTree.didRenderTime
        });
      });
    }
  }
});

