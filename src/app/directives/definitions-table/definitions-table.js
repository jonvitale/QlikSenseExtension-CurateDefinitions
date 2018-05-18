import html from './definitions-table.html';

window.require('qvangular')
.directive('definitionsTable', ['qlikService', function(qlikService) {
  return {
    restrict: 'E',
    template: html,
    scope: {
        items : '=',
        type : '<'
    },
    controller: ['$scope', function($scope){
        
      $scope.headers = [];
      $scope.colors = [];
     //////////////// scope variables ///////////////////////
      $scope.onClickFolderItem = (item) => {
          
      };

      // we watch items so that we can find an exhaustive list of headers
      $scope.$watch('items', function(newValue, oldValue) {
        let type = $scope.type.toLowerCase().substr(0, $scope.type.length-1);
        //console.log("items changed", newValue, oldValue);
        let items = newValue;
        let colors = [];
        if (items.length > 0){
          
          let _headers = Object.keys(items[0]);
          // standardize names
          let headers = [];
          for (let i = 0; i < _headers.length; i++){
            let header = qlikService.updateProperty(_headers[i], type, "add");
            if (qlikService.isPropertyOperationValid(header, type, "add")){
              headers.push(header);
            }
          }
          
          // loop through and insert missing keys in the correct order
          // assumes that there is a standard order, although keys may be missing
          for (let i = 0; i < items.length; i++){
            let keys = Object.keys(items[i]);
            let previousIndex = 0;
            // get colors before we delete the key
            if (typeof items[i]['_color'] !== 'undefined'){
              colors[i] = items[i]['_color'];
            } else {
              colors[i] = i % 2 === 0 ? '#EEEEEE' : '#DDDDCC';
            }

            for (let j = 0; j < keys.length; j++){
              let key = keys[j];
              let _key = qlikService.updateProperty(key, type, "add");
              if (key !== _key){
                items[i][_key] = items[i][key];
                delete items[i][key];
                key = _key;
              }
              if (!qlikService.isPropertyOperationValid(key, type, "add")){
                delete items[i][key];
              } else {
                let _index = headers.indexOf(key);
                if (_index < 0){
                  headers.splice(previousIndex, 0, key);
                  previousIndex++;
                } else {
                  previousIndex = _index + 1;
                }
              }              
            }
          }

          $scope.items = items;
          $scope.headers = headers;
          $scope.colors = colors;
        }        
      });
    }]
  };
}])
;
