import Component from '@ember/component';
import { run } from '@ember/runloop';
import { inject as service } from '@ember/service';

export default Component.extend({
  tagName: '',

  userPerformanceMonitoring: service(),

  triggerMonitor() {
    this.userPerformanceMonitoring.trigger('didRenderMonitorComponent');
  },

  didRender() {
    run.scheduleOnce('destroy', this, this.triggerMonitor);
  }
});

