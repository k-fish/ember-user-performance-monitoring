import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { computed, getProperties } from '@ember/object';
import { getOwner } from '@ember/application';
import ttiPolyfill from 'tti-polyfill';

export default Service.extend(Evented, {
  init() {
    this._seenEvents = {};
    return this._super(...arguments);
  },

  _onEvent(eventName, eventDetails) {
    this.trigger('timingEvent', eventName, eventDetails);
  },

  _config: computed(function() {
    if (!this.get('isDestroyed') && !this.get('isDestroying')) {
      return getOwner(this).resolveRegistration('config:environment')['ember-user-performance-monitoring'];
    };
    return {};
  }),

  getEvents(events) {
    return getProperties(this._seenEvents, ...events);
  },

  listen() {
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

    if (this._config.observeTTI) {
      const opts = {} || this._config.observeTTI.options;
      ttiPolyfill.getFirstConsistentlyInteractive(opts).then((tti) => {
        tti = Math.round(tti);
        callbackClosure('tti', tti);
      });
    }
  }
});

