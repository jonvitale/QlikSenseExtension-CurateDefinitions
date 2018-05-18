import html from './display-internal-definitions.html';
import '../definitions-table/definitions-table';
import XLSX from 'xlsx';

window.require('qvangular')
.directive('displayInternalDefinitions', ['qlikService', function(qlikService) {
  return {
    restrict: 'E',
    template: html,
    scope: {},
    controller: ['$scope', function($scope){

    //////////////// scope variables ///////////////////////
    	$scope.view = 'home';
      $scope.message = '';
      $scope.definitions = [];

    //////////////// controller variables (unexposed to scope) ///////////////////////
    
       
    //////////////// scope functions /////////////////////// 
    	$scope.onClickStart	= () => {
    		$scope.definitionTypes = this.qlikTypesToDisplayTypes(qlikService.getDefinitionTypes());
        $scope.visualizationTypes = this.qlikTypesToDisplayTypes(qlikService.getVisualizationTypes());
        $scope.definitionType = $scope.definitionTypes[0];
        $scope.visualizationType = $scope.visualizationTypes[0];
        if ($scope.definitionType !== 'Visualizations'){
          $scope.type = $scope.definitionType;
        } else {
          $scope.type = $scope.visualizationType;
        }
        $scope.$parent.updateView('internal');
        $scope.view = 'choose';
        $scope.message = 'Select a type of definition you would like to view.'
    	}

    	$scope.onClickEnd = () => {
    		$scope.$parent.updateView('home');
        $scope.view = 'home';
        this.resetVariables();
    	}
    	
    	$scope.onClickDefinitionDropdown = definitionType => {
    		$scope.definitionType = definitionType;
        if ($scope.definitionType !== 'Visualizations'){
          $scope.type = $scope.definitionType;
        } else {
          $scope.type = $scope.visualizationType;
        }	
    	}

      $scope.onClickVisualizationDropdown = visualizationType => {
        $scope.visualizationType = visualizationType; 
        $scope.type = $scope.visualizationType;
      }

    	$scope.displaySelectedType = () => {
    		this.setLoadingMessage();
    		qlikService.getInternalDefinitions(this.displayTypeToQlikType($scope.type)).then(
          definitions => {
      			this.removeLoadingMessage();
      			$scope.definitions = definitions;
      			$scope.view = 'definitions';
      		}, 
          e => {
      			this.removeLoadingMessage();
      			console.log(e);
      		}
        );
    	}

    	$scope.onClickDownload = () => {
    		if($scope.definitions.length > 0){
    			qlikService.getAppTitle().then(
            title => {
      				let wb = XLSX.utils.book_new();
              // remove angular stuff
              let cleanDefinitions = [];
              for (let i = 0; i < $scope.definitions.length; i++){
                let definition = $scope.definitions[i];
                let cleanDefinition = Object.keys(definition)
                  .filter(key => key.charAt(0) !== '$')
                  .reduce((obj, key) => {
                    obj[key] = definition[key];
                    return obj;
                  }, {});
                cleanDefinitions.push(cleanDefinition);
              }
      				let ws = XLSX.utils.json_to_sheet(cleanDefinitions);
      				XLSX.utils.book_append_sheet(wb, ws, $scope.type);
      				XLSX.writeFile(wb, title + '_' + $scope.type + '.xlsx');
      			}, 
            e => console.log(e)
          );
    		}    		
    	}

    //////////////// controller functions (unexposed to scope) ///////////////////////
     
     	this.setLoadingMessage = () => {
     		this.loadingDots = 1;
    		$scope.message = 'Loading ' + $scope.definitionType + ' ' + Array(this.loadingDots).join("."); 
    		this.interval = setInterval((loadingDots) => {
    			this.loadingDots = this.loadingDots >= 3 ? 0 : this.loadingDots + 1;
    			$scope.message = 'Loading ' + $scope.definitionType + ' ' + Array(this.loadingDots).join("."); 
    		}, 500);
     	}

     	this.removeLoadingMessage = () => {
     		clearInterval(this.interval);
     		this.interval = null;
    		$scope.message = 'Some columns may be cut off, download to view all properties of the ' + $scope.definitionType;
     	}
    	
      this.resetVariables = () => {
      	$scope.definitions = [];
        $scope.message = '';
        qlikService.resetVariables();
      }

      this.qlikTypesToDisplayTypes = arr => {
        let arr_out = [];
        for (let i = 0; i < arr.length; i++){
           arr_out.push(this.qlikTypeToDisplayType(arr[i]));
        }
        return arr_out;
      }
        this.qlikTypeToDisplayType = s => {
          let s2 = s;
          if (s === 'kpi'){
            s2 = "KPIs"
          } else if (s === 'combochart'){
            s2 = "Combo Charts"
          } else {
            s2 = s2.charAt(0).toUpperCase() + s.substr(1) + "s";
          }
          return s2;
        }

      this.displayTypesToQlikTypes = arr => {
        let arr_out = [];
        for (let i = 0; i < arr.length; i++){
          arr_out.push(this.displayTypeToQlikType(arr[i]));
        }
        return arr_out;
      }
        this.displayTypeToQlikType = s => {
          let s2 = s.replace(" ", "").toLowerCase();
          if (s2.charAt(s2.length-1) === 's'){
            s2 = s2.substr(0, s2.length-1)
          }
          return s2;
        }
    }]
  };
}]);


    	