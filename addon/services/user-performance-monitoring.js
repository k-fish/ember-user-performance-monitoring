import Service from '@ember/service';
import Evented from '@ember/object/evented';

export default Service.extend(Evented, {
  _onEvent(eventName, eventDetails) {
    this.trigger('timingEvent', eventName, eventDetails);
  },

  listen() {
    const callbackClosure = (eventName, e) => {
      this._onEvent(eventName, e);
    };

    if (window.__emberUserPerf && !window.__emberUserPerfCallback) {
      window.__emberUserPerfCallback = callbackClosure;

      Object.entries(window.__emberUserPerf).forEach(([key, value]) => {
        callbackClosure(key, value);
      });
    }
  }
});

