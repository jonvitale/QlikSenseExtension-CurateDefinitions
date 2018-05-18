import html from './upload-definitions.html';
import './folder-nav/folder-nav';
import '../definitions-table/definitions-table';

window.require('qvangular')
.directive('uploadDefinitions', ['qlikService', function(qlikService) {
  return {
    restrict: 'E',
    template: html,
    scope: {},
    controller: ['$scope', function($scope){
    	
    //////////////// scope variables ///////////////////////
      $scope.view = 'home';
      $scope.folderItems = [];
      $scope.definitions = [];
      $scope.colors = [];
      $scope.navType = '';
      $scope.message = '';

    //////////////// controller variables (unexposed to scope) ///////////////////////

      // the current open connection
      this.connection = null;
      // the current path within the connection
      this.pathArr = [];
      // the selected table within an Excel file
      this.table = '';


    //////////////// scope functions ///////////////////////
     
    	$scope.onClickStart = () => {
    		$scope.definitionTypes = this.qlikTypesToDisplayTypes(qlikService.getDefinitionTypes());
        $scope.visualizationTypes = this.qlikTypesToDisplayTypes(qlikService.getVisualizationTypes());
        $scope.definitionType = $scope.definitionTypes[0];
        $scope.visualizationType = $scope.visualizationTypes[0];
        if ($scope.definitionType !== 'Visualizations'){
          $scope.type = $scope.definitionType;
        } else {
          $scope.type = $scope.visualizationType;
        }

        $scope.$parent.updateView('upload');
        $scope.view = 'navigate';
        qlikService.getConnections().then((connections) => {
            $scope.folderItems = connections.items.map(o => {
                o.type = 'CONNECTION';
                return (o);
            });
            $scope.navType = 'CONNECTIONS';
            $scope.message = "Choose from available connections. If you need a new connection, create one in the data load editor."
        }, (e) => {
            console.log(e);
        });    
    	};

    	$scope.onClickEnd = () => {
    		$scope.$parent.updateView('home');
        $scope.view = 'home';
        this.resetVariables();
    	};

      $scope.onClickFolderItem = item => {
        if (item.type.toLowerCase() === 'back'){
          // ascend a level
          if (this.connection === null){
              // the connections are showing, close this dialog
              $scope.onClickEnd();
              return;
          } else if (this.pathArr.length === 0){
              // we are at the root of the path, go back to showing connections
              this.resetVariables();
              $scope.onClickStart();
              return;
          } else if (this.pathArr.length >= 0){
              this.pathArr.pop();
              $scope.onClickFolderItem({
                  qName:'',
                  type:'FOLDER'
              });
              return;
          } else {
              console.log("invalid path")
          }
        } else {
            // descend a level               
            if (this.connection === null){
                // this is a connection
                this.connection = item;
            } else if (item.qName != null && item.qName.length > 0){
                if (item.type === 'TABLE'){
                    this.table = item.qName;
                } else {
                    this.pathArr.push(item.qName);
                }
            }
        }
                
        qlikService.openFolderItem(this.connection, this.pathArr, item.type, this.table).then( 
          q => {
            if (q.type === "CONNECTIONS" || q.type === "FOLDERS" || q.type === "TABLES"){
              $scope.message = "";
              $scope.folderItems = q.items;
              $scope.navType = q.type;
            } else if (q.type === "DEFINITIONS"){
              // we are done uploading, so we can reset the variables need to get us here
              this.resetVariables();
              $scope.message = `<p>Select the dropdown to change the type of definitions that you have uploaded.<br>
                                Then click the yellow update button to change the associated definitions or create new ones.<br>
                                <strong><span style="background-color:#FFFFAA; color:#FF0000;">Warning: These updates will permanently change the app if saved. Make sure you have a backup!!!</span></strong></p>`;
              $scope.definitions = q.items;
              $scope.navType = q.type;
              $scope.view = 'definitions';
              if (typeof $scope.definitions[0]['qInfo/qType'] === "string"){
                let type = this.qlikTypeToDisplayType($scope.definitions[0]['qInfo/qType'].toLowerCase());
                if ($scope.definitionTypes.indexOf(type) > -1){
                  $scope.definitionType = type;
                  $scope.type = $scope.definitionType;
                } else {
                  $scope.definitionType = "Visualizations";                  
                  if ($scope.visualizationTypes.indexOf(type) > -1){
                    $scope.visualizationType = type;
                  } else {
                    $scope.visualizationType = "Others";
                  }
                  $scope.type = $scope.visualizationType;
                }
              }
            }
          }, e => {
            if (item.type.toLowerCase() !== 'back'){
              if (item.qName != null && item.qName.length > 0){
                this.pathArr.pop();
              }
            }
            console.log(e);
          }
        );        
      };

      $scope.onClickDefinitionDropdown = definitionType => {
        $scope.definitionType = definitionType; 
        if ($scope.definitionType !== 'Visualizations'){
          $scope.type = $scope.definitionType;
        } else {
          $scope.type = $scope.visualizationType;
        }
      };

      $scope.onClickVisualizationDropdown = visualizationType => {
        $scope.visualizationType = visualizationType; 
        $scope.type = $scope.visualizationType;
      };

      $scope.onClickUpdate = () => {

        qlikService.updateDefinitions($scope.definitions, $scope.definitionType).then( 
          updateTypes => {
            let cAdd = '#BBFFBB';
            let cReplace = '#BBBBFF';
            let cInvalid = '#FFBBBB';

            $scope.message = `Definitions, by row, are either, <span style="background-color:` + cAdd + `">&nbsp;New&nbsp;</span>,
                              <span style="background-color:` + cReplace + `">&nbsp;Updated&nbsp;</span>, or 
                              <span style="background-color:` + cInvalid + `">&nbsp;Invalid&nbsp;</span><br>
                              If you made a mistake, reload now without saving.<br>`;                            
            //let colors = []
            for (let i = 0; i < updateTypes.length; i++){
              let color = cInvalid;
              if (updateTypes[i] == 'replace'){
                color = cReplace;
              } else if (updateTypes[i] == 'add'){
                color = cAdd;
              }
              $scope.definitions[i]['_color'] = color;

            }
            
            $scope.definitions = $scope.definitions.slice();
            
          }, e => console.log(e)
        );
      }

     //////////////// controller functions (unexposed to scope) ///////////////////////
     
      this.resetVariables = () => {
        $scope.folderItems = [];
        $scope.definitions = [];
        $scope.navType = '';
        $scope.message = '';
        $scope.colors = [];
        this.connection = null;
        this.pathArr = [];
        this.table = '';
        qlikService.resetVariables();
      };

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
