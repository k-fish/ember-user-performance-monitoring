var observer;
if (PerformanceObserver) {
  observer = new PerformanceObserver(function(list) {
    list.getEntries().forEach(function(entry) {
      const metricName = entry.name;
      const startTime = entry.startTime;
      const duration = entry.duration;
      const time = Math.round(startTime + duration);

      window.__emberUserPerf = window.__emberUserPerf || {};

      const e = {
        time: time,
        duration: duration,
        startTime: startTime
      };

      if (!window.__emberUserPerf[metricName]) {
        window.__emberUserPerf[metricName] = e;
      }

      if (window.__emberUserPerfCallback) {
        window.__emberUserPerfCallback(metricName, e);
      }
    });
  });
}
