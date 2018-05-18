import html from './app-root.html';

import './directives/definitions-table/definitions-table';
import './directives/upload-definitions/upload-definitions';
import './directives/display-internal-definitions/display-internal-definitions';

import QlikService from './services/qlik-service';

// set up a service to get data from qlik
window.require('qvangular').service('qlikService', QlikService);

window.require('qvangular')
.directive('appRoot', ['qlikService', function(qlikService) {
  return {
    restrict: 'E',
    template: html,
    scope: {},
    controller: ['$scope', function($scope){
    	$scope.view = 'home';

    	$scope.updateView = function(view){
    		$scope.view = view;
    	}
    }]
  }
}]);