import Service from '@ember/service';

export default Service.extend({
  init() {
    const callbackClosure = (eventName, e) => {
      this._onEvent(eventName, e);
    };
    if (window.__emberUserPerf) {
      window.__emberUserPerfCallback = callbackClosure;

      Object.entries(window.__emberUserPerf).forEach(([key, value]) => {
        callbackClosure(key, value);
      });
    }
  },

  _onEvent(eventName, e) {
    if (this.onEvent) {
      this.onEvent(eventName, e);
    }
  }
});
