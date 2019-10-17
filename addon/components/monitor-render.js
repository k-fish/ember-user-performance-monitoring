import Component from '@ember/component';
import layout from '../templates/components/monitor-render';
import { assert } from '@ember/debug';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import { hash } from 'rsvp';

const performance = window && window.performance;

export default Component.extend({
  layout,

  userPerformanceMonitoring: service(),

  _topLevel: computed.not('parentView'),

  init() {
    assert('[monitor-render] This component must be initialized with a key', this.key);

    if (!performance) {
      return;
    }

    this._children = {};

    this._renderMonitoringTree = {
      initTime: Math.round(performance.now()),
      children: new Promise((resolve) => {
        this._resolveChildrenPromise = resolve;
      })
    };

    this.renderMonitoringTree = new Promise(resolve => {
      this._resolveTree = resolve;
    });

    this.userPerformanceMonitoring.addRenderMonitor(this.key, this._renderMonitoringTree);

    if (this.parentKey) {
      this.userPerformanceMonitoring.addRenderMonitorChild(this.parentKey, this.key, hash(this._renderMonitoringTree));
    }

    return this._super(...arguments);
  },

  _resolveChildren() {
    this._childrenResolved = true;
    return this._resolveChildrenPromise(hash(this._children));
  },

  addChild(key, treePromise) {
    this._children[key] = treePromise;
  },

  didRender() {
    const result = this._super(...arguments);

    if (!performance) {
      return;
    }

    // Only call on initial render
    if (this._childrenResolved) {
      return;
    }

    const didRenderTime = Math.round(performance.now());
    const duration =  didRenderTime - this._renderMonitoringTree.initTime;

    Object.assign(this._renderMonitoringTree, {
      didRenderTime,
      duration
    });

    this._resolveChildren();
    this._resolveTree(this._renderMonitoringTree);

    if (this._topLevel) {
      this.userPerformanceMonitoring.resolveTopLevelRender(this.renderMonitoringTree);
    }

    return result;
  }
});
