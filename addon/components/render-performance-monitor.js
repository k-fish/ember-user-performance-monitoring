import Component from '@ember/component';
import { run } from '@ember/runloop';
import { inject as service } from '@ember/service';

export default Component.extend({
  tagName: '',

  userPerformanceMonitoring: service(),

  didRender() {
    run.scheduleOnce('destroy', () => {
      this.userPerformanceMonitoring.trigger('didRenderMonitorComponent');
    });
  }
});

