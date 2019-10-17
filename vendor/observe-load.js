if (window.performance) {
  window.addEventListener('DOMContentLoaded', function() {
    window.__metric_DCL = window.performance.now();
  });
  window.addEventListener('load', function() {
    var time = window.performance.now();
    if (window.__metric_load_callback) {
      window.__metric_load_callback('load', {
        time: Math.round(time)
      });
    }
    window.__metric_load = time;
  });
}
