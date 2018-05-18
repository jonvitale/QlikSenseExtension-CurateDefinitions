import html from './folder-nav.html';

window.require('qvangular')
.directive('folderNav', [ function() {
  return {
    restrict: 'E',
    template: html,
    scope: false // uses parent scope, folderItems should be set there
  };
}]);
