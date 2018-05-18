import 'bootstrap';

import './app/app-root';
import initialProperties from './initial-properties.js';
import definition from './definition.js';
//import controller from './controller.js';
//import paint from './paint.js';
//import resize from './resize.js';
import localCSS from './style.scss';

export default window.define([], function() {
  return {
    initialProperties: initialProperties,
    template: `<app-root></app-root>`,
    definition: definition,
    controller: ['$scope', '$element', function($scope, $element) {}] //,
    //paint: paint,
    //resize: resize
  }
});