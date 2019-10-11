'use strict';

function readSnippet(fileName) {
  return fs.readFileSync(`${__dirname}/vendor/${fileName}`, 'utf8');
};

module.exports = {
  name: require('./package').name,

  contentFor(type, config) {
    const addonConfig = config['ember-user-performance-monitoring'] || {};

    const { enabled, observePaint } = addonConfig;

    if (type === 'head' && enabled) {
      let script = '<script>';
      script += readSnippet('observer.js');

      if (observePaint) {
        script += readSnippet('observe-paint.js');
      }

      script += '</script>';

      return script;
    }
  }
};
