import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { computed, get, getProperties } from '@ember/object';
import { getOwner } from '@ember/application';
import { inject as service } from '@ember/service';
import { assert } from '@ember/debug';
import { hash } from 'rsvp';
import ttiPolyfill from 'tti-polyfill';

export default Service.extend(Evented, {
  _isListening: false,

  router: service(),

  init() {
    this._seenEvents = {};
    this._renderMonitoringTree = {};
    this._renderMonitors = {};

    this._topLevelRenderPromise = new Promise(resolve => {
      this._topLevelRenderResolve = resolve;
    });

    return this._super(...arguments);
  },

  _onEvent(eventName, eventDetails) {
    const additionalDetails = {
      currentURL: this.router.currentURL
    };

    if (this._config.observeLoad) {
      const hiddenFor = window.__metric_hidden_for;
      const visibilityChanged = !!window.__metric_last_visible || !!hiddenFor;
      Object.assign(additionalDetails, {
        visibilityChanged,
        hiddenFor
      });
    }

    if (this._config.includeConnection) {
      const connection = get(window, 'navigator.connection');
      if (connection) {
        Object.assign(additionalDetails, {
          downlink: connection.downlink,
          rtt: connection.rtt
        });
      }
    }
    this.trigger('timingEvent', eventName, eventDetails, additionalDetails);
  },

  _config: computed(function() {
    if (!this.get('isDestroyed') && !this.get('isDestroying')) {
      return getOwner(this).resolveRegistration('config:environment')['ember-user-performance-monitoring'];
    };
    return {};
  }),

  addRenderMonitor(key, tree) {
    assert('Keys for render monitoring should be unique', !this._renderMonitoringTree[key]);
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

