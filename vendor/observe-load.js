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
  window.__metric_hidden_for = 0;
  window.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      window.__metric_last_visible = Math.round(window.performance.now());
    }
    if (!document.hidden && window.__metric_last_visible) {
      window.__metric_hidden_for += Math.round(performance.now() - window.__metric_last_visible);
    }
  });
}
