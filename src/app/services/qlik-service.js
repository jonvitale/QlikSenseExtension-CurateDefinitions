export default class QlikService {

	constructor() {
		// qlik objects
		this._qlik = window.require('qlik');
		this._openApp = this._qlik.currApp(this);
		this._engineApp = this._openApp.model.engineApp; 
		this._sessionApp = null;
		this._definitionTypes = ['measure', 'dimension', 'variable', 'visualization'];
		this._visualizationTypes = ['kpi', 'combochart', 'barchart', 'linechart', 'scatterplot', 'treemap'];
		this._propertyMap = [
			{ "original": "qid", "new": "qInfo/qId", "matchCase": false },
			{ "original": "id", "new": "qInfo/qId", "matchCase": false },
			{ "original": "name", "new": "qName", "matchCase": false, "type": "variable" },
			{ "original": "title", "new": "qName", "matchCase": false, "type": "variable" },
			{ "original": "qDescription", "new": "qComment", "matchCase": false, "type": "variable" },
			{ "original": "description", "new": "qComment", "matchCase": false, "type": "variable" },
			{ "original": "name", "new": "qMeasure/title", "matchCase": false, "type": "measure" },
			{ "original": "title", "new": "qMeasure/title", "matchCase": false, "type": "measure" },
			{ "original": "name", "new": "qDim/title", "matchCase": false, "type": "dimension" },
			{ "original": "title", "new": "qDim/title", "matchCase": false, "type": "dimension" },
			{ "original": "description", "new": "qMetaDef/description", "matchCase": false, "operation": "replace"},
			
		];
		this._invalidProperties = [
			{ "property": "", "isRegExp": false },
			{ "property": "^\\$", "isRegExp": true },
			{ "property": "^_", "isRegExp": true },
			{ "property": "qMeta/", "isRegExp": true, "type": "variable" },
			{ "property": "qIsScriptCreated", "isRegExp": true, "type": "variable" },
			{ "operation": "replace", "property": "qInfo/qId", "isRegExp": false },
			{ "operation": "replace", "property": "qInfo/qType", "isRegExp": false },

		];
	}

	getDefinitionTypes() {
		return this._definitionTypes;
	}

	getVisualizationTypes() {
		return this._visualizationTypes;
	}

	resetVariables() {
		if (this._sessionApp != null) {
			this._sessionApp.close();
		}
		this._sessionApp = null;
	}

	/**
	 * Apply common aliases to official names
	 * @param  {string}  property  The property that is being proposed to change or add. May include / delimiters
	 * @param  {string}  type      What is being changed? One of "measure", "dimension", "variable", or "visualization"
	 * @param  {string}  operation Either add or replace
	 * @return {string}            If included in the map, the updated property name, else the original
	 */
	updateProperty(property, type, operation) {
		for (let i = 0; i < this._propertyMap.length; i++) {
			if ((this._propertyMap[i].original === property || 
						typeof this._propertyMap[i].matchCase === "boolean" && this._propertyMap[i].matchCase && 
						this._propertyMap[i].original.toLowerCase() === property.toLowerCase()) 
					&&
					(typeof this._propertyMap[i].operation === "undefined" || this._propertyMap[i].operation.length == 0 ||
						this._propertyMap[i].operation === operation)
					&&
					(typeof this._propertyMap[i].type === "undefined" || this._propertyMap[i].type.length == 0 ||
						this._propertyMap[i].type === type || this._propertyMap[i].type === "visualization" && 
							(type.includes('chart') || type.includes('plot') || type.includes('table') || type.includes('map') || 
							type === 'kpi' || type === 'histogram' || type === 'gauge'))
			) {
				return this._propertyMap[i].new;
			} else {
				continue;
			}
		}
		return property;
	}

	/**
	 * Is a proposed property change (replace or add) valid? 
	 * @param  {string}  property  The property that is being proposed to change or add. May include / delimiters
	 * @param  {string}  type      What is being changed? One of "measure", "dimension", "variable", or "visualization"
	 * @param  {string}  operation Either add or replace
	 * @return {Boolean}           Is this a valid operation?
	 */
	isPropertyOperationValid(property, type, operation) {
		for (let i = 0; i < this._invalidProperties.length; i++) {
			let re = new RegExp(this._invalidProperties[i].property);
			if ((this._invalidProperties[i].property === property || 
						typeof this._invalidProperties[i].isRegExp === "boolean" && this._invalidProperties[i].isRegExp && re.test(property)) 
					&&
					(typeof this._invalidProperties[i].operation === "undefined" || this._invalidProperties[i].operation.length == 0 || 
						this._invalidProperties[i].operation === operation)
					&&
					(typeof this._invalidProperties[i].type === "undefined" || this._invalidProperties[i].type.length == 0 || 
						this._invalidProperties[i].type === type || this._invalidProperties[i].type === "visualization" && 
							(type.includes('chart') || type.includes('plot') || type.includes('table') || type.includes('map') || 
							type === 'kpi' || type === 'histogram' || type === 'gauge'))
			) {
				return false;
			} else {
				continue;
			}
		}
		return true;
	}

	/**
	 * Definitions will be uploaded from a csv file may all be strings, this function determines the best type for the property.
	 * @param  {string} key   The key for the property that is being proposed to change or add. May include / delimiters
	 * @param  {string} value The value of the property that is being updated.
	 * @param  {string} type  What is being changed? One of "measure", "dimension", "variable", or "visualization"
	 * @return {any}       [description]
	 */
	convertPropertyValueFromString(key, value, type, operation){
		if (value == null){
			return "";
		} else if (value.toLowerCase() === "true" || value.toLowerCase() === "false") {
			return Boolean(value.toLowerCase());
		} else if (!isNaN(Number(value)) && !RegExp("qDef$").test(key) && !RegExp("qLabelExpression$").test(key) 
				&& !RegExp("qDefinition$").test(key) && !RegExp("/qv$").test(key)) {
			return Number(value);
		} else {
			if (operation === "add"){
				return value.replace(/"/g, '\"').replace(/(\r\n|\n|\r)/gm, "\n");
			} else {
				// will be nested in a string so need double-escape
				return value.replace(/"/g, '\\"').replace(/(\r\n|\n|\r)/gm, "\\n");
			}
			
		}	
	}

	
	/**
	 * Get the name of this app.
	 * @return {Promise<string>} The promise of a title.
	 */
	getAppTitle() {
		return new Promise((resolve, reject) => {
			this._engineApp.getAppProperties()
			.then(q => {
				let title = q.qProp.qTitle;
				if (title == null) {
					title = 'QlikApp';
				}
   			resolve(title);
      })
      .catch(e => reject(e));
		});
	}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////// LOADING DEFINITIONS FROM A FOLDER//////////////// /////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



	/**
	 * Open the connections for this file and return an array of the aQonnections
	 * @return {Promise<Array<Object>>} The promise of an array of qConnections, which contain qId, qName, qConnectionString, etc
	 */
	getConnections() {
		return new Promise((resolve, reject) => {		
			this._engineApp.getConnections()
			.then(q => {
	    	resolve({
			    type: 'CONNECTIONS',
			    items: q.qConnections
	    	});
	    }) 
		  .catch(e => reject(e));
		});
	}

	/**
	 * Open the folder at the given path based upon...
	 * @param  {string} id   The qId for the connection.
	 * @param  {string} pathArr The path to the folder with levels separated into elements of array.
	 * @param  {string} type What type of folder item? Can be a 'CONNECTION', 'FOLDER', 'FILE', or 'TABLE', Additionally, "BACK" navigates up a directory. 
	 * @return {Promise<Object>} Returns a promise for an object with a type and items. The items should be the contents of a connection, folder, or Excel doc.
	 */
	openFolderItem(connection, pathArr, type, tableName) {
		let path = pathArr.join('/');
		let id = connection.qId;
		
		if (type.toLowerCase() === 'folder' || type.toLowerCase() === 'connection') {
			return this._engineApp.getFolderItemsForConnection(id, path)
			.then(q => Promise.resolve({
	    		type: 'FOLDERS',
	    		items: q.qFolderItems.map(o => {
            o.type = o.qType;
            return o;
          })
	    	})
	    );
		} else if (type.toLowerCase() === 'file') {
			// we need to figure out what kind of file this is.
			return this._engineApp.guessFileType(id, path)
			.then(q => {					
				if (q.qDataFormat.qType == "EXCEL_BIFF" || q.qDataFormat.qType == "EXCEL_OOXML") {
					// user needs to choose between tables.						
					return this._engineApp.getFileTables(id, path, {"qType": q.qDataFormat.qType})
					.then(qT => Promise.resolve({
			    		type: 'TABLES',
			    		items: qT.qTables.map(o => {
                o.type = 'TABLE';
                return (o);
              })
		    		})
        	);
        } else if (q.qDataFormat.qType == "CSV" || q.qDataFormat.qType == "QVD") {
        	// this is a file type that can be opened directly
        	return this.openTableFile(connection, pathArr, '', q.qDataFormat);
        } else {
        	return Promise.reject("The file type for " + path + " is not supported");
        }
			})
		} else if (type.toLowerCase() === 'table') {
			return this._engineApp.guessFileType(id, path)
			.then(q => this.openTableFile(connection, pathArr, tableName, q.qDataFormat));
		} else {
			return Promise.reject(type + ' is not a valid type of folder item.');
		}
	}

	/**
	 * Opens a file that should have some kind of table in it - a spreadsheet. If this is an Excel file, a tableName is necessary
	 * @param  {string} connection  A Qlik object with information about a connection within the app.
	 * @param  {Array} pathArr     An array of directories, ending with the file name. Does not include folder delimiters (e.g., /)
	 * @param  {string} tableName   The name of a table within an Excel file. Empty string if any other type of file
	 * @param  {Object} qDataFormat A Qlik object with the format of the file.
	 * @return {Promise<Array<Object>>}             A promise of an Array with key-value pair objects linking headers (key) to values
	 */
	openTableFile(connection, pathArr, tableName, qDataFormat) {
		// to get a table we have to do a round-about crazy thing opening a session app, creating a load script and loading the table
		return this.getSessionApp()
		.then(sessionApp => {
			this._sessionApp = sessionApp;
			return sessionApp.model.engineApp.createConnection(connection);
		})
		.then(q => this.loadSessionApp(q.qConnectionId, pathArr, tableName, qDataFormat))
		.then(() => this.getTableFromLoadedSessionApp())
		.then(table => Promise.resolve({
    		type: 'DEFINITIONS',
    		items: table
    	})
  	)
		.catch(e => {
			if (this._sessionApp != null) {
				this._sessionApp.close();
				this._sessionApp = null;
			}
			return Promise.reject(e);
		})
	}

	/**
	 * Either returns an open session app or creates a new one. Because the qlik function sessionApp() does not return a promise
	 * we use setInterval to wait for appropriate functions to be loaded into the sessionApp object.
	 * @return {Promise<Object>} A promise with the loaded sessionApp. This app is also saved internally, so either the return or this._sessionApp may be used after
	 * the promise resolves.
	 */
	getSessionApp() {
		return new Promise((resolve, reject) => {
			if (this._sessionApp != null) {
				resolve(this._sessionApp);
			} else {
				this._sessionApp = this._qlik.sessionApp();
				var i = 0;
				var interval = setInterval(() => {
					if (i < 40) {
						if (this._sessionApp != null && typeof this._sessionApp.model !== 'undefined' && typeof this._sessionApp.model.engineApp !== 'undefined') {
							clearInterval(interval);
							resolve(this._sessionApp);
						}
						i++;
					} else {
						clearInterval(interval);
						reject("Session app load failed timed out");
					}
				}, 250);
			}
		});
	}

	/**
	 * If a session app has been created, this method will create a new connection, create a script to load data from the path in that connection
	 * and then load the app with data.
	 * @param  {string} qConnectionId The connection id for the session app. Note: this is different than the primary connection for the main app.
	 * @param  {Array}  pathArr     An array of directories, ending with the file name. Does not include folder delimiters (e.g., /)
	 * @param  {string} tableName   The name of a table within an Excel file. Empty string if any other type of file
	 * @param  {Object} qDataFormat A Qlik object with the format of the file.
	 * @return {Promise<boolean>}             A promise for a boolean: true if successfully loaded.
	 */
	loadSessionApp(qConnectionId, pathArr, tableName, qDataFormat) {
		console.log("loadSessionApp", pathArr, tableName, qDataFormat);
		//return new Promise((resolve, reject) => {
		let engine = this._sessionApp.model.engineApp;
		return engine.getConnection(qConnectionId)
		.then(qC => {
      let script = `
      	TABLE1: LOAD * FROM [lib://` + qC.qConnection.qName +
      	`/` + pathArr.join('/') +
      	`]`;

      // we have qDataFormat.qLabel, but for Excel we should always have embedded labels
      if (qDataFormat.qType == 'EXCEL_OOXML' || qDataFormat.qType == 'EXCEL_BIFF') {
      	script += `(` + qDataFormat.qType.split('_').pop().toLowerCase() + `, ` +
      		'embedded labels' + `, table is [` + tableName + `]);`;
      } else if (qDataFormat.qType == 'CSV') {
      	script += `(txt, codepage is ` + qDataFormat.qCodePage + 
      				`, delimiter is ` + qDataFormat.qDelimiter.qScriptCode + 
      				`, ` + qDataFormat.qQuote + `);`;
      } else if (qDataFormat.qType == 'QVD') {
      	script += `(qvd);`;
      }
      console.log("script", script);
      engine.setScript(script);
      return;
    })
    .then(() => engine.doReload(0, false, false));
	}

	/**
	 * When a session app has been loaded with data, this method will return the data in a table format.
	 * @return {Promise<Array<Object>>} A promise of an Array with key-value pair objects linking headers (key) to values.
	 */
	getTableFromLoadedSessionApp() {
		return new Promise((resolve, reject) => {
			if (this._sessionApp == null || this._sessionApp.model.engineApp == null) {
				reject("The session app has not been loaded");
			} else {
				this._sessionApp.model.engineApp.getTablesAndKeys(
					{"qcx": 0, "qcy": 0}, {"qcx": 0,"qcy": 0}, 0, false, false
				).then(
					qT => {
						let qHeader = qT.qtr[0].qFields;
	    			let headers = [];
	    			for (let i = 0; i < qHeader.length; i++) {
	    				headers.push(qHeader[i].qName);
	    			}
	    			try {
		    			this._sessionApp.createTable(headers, [], 
		    				{rows: Math.floor(10000 / headers.length), columns: headers.length}
		    			).OnData.bind(function() {
		    				let qTable = this;
		    				let table = [];
		    				let headers = [];
		          	for (let di = 0; di < qTable.qHyperCube.qDimensionInfo.length; di++) {
		          		headers.push(qTable.qHyperCube.qDimensionInfo[di].qFallbackTitle);
		          	}

		          	/// may be multiple data pages
		            for (let pi = 0; pi < qTable.qHyperCube.qDataPages.length; pi++) {
		            	for (let ri = 0; ri < qTable.qHyperCube.qDataPages[pi].qMatrix.length; ri++) {
		            		let dRow = {};
		            		for (let di = 0; di < qTable.qHyperCube.qDataPages[pi].qMatrix[ri].length; di++) {
		            			let qValue = qTable.qHyperCube.qDataPages[pi].qMatrix[ri][di].qText
		            			if (typeof qValue !== "undefined" && qValue !== "-") {
		            				dRow[headers[di]] = qValue; 
		            			} else {
		            				dRow[headers[di]] = "";
		            			}
		            		}	
		            		table.push(dRow);
		            	}
		            }
		            resolve(table);
		    			});
		    		} catch(e) {
		    			reject(e);
		    		}
					}, 
					e => reject(e)
				);
			}
		})	
	}

	/**
	 * Given an upload set of definitions, will try to patch existing defintions or create new ones
	 * @param  {Array<Object>} definitions	An array of definition paths and values
	 * @param  {string} type 	One of, "measure", "dimension", "variable", or visualization type (e.g., "kpi")
	 * @return {Promise<Array<string>>}             An array of results, including, "add", "replace", "invalid"
	 */
	updateDefinitions(definitions, type) {
		return new Promise((resolve, reject) => {
			type = type.toLowerCase();
			if (type.substr(-1) === 's') {
				type = type.substr(0, type.length - 1);
			}

			let updateCount = 0;
			let updateTypes = new Array(definitions.length);
			for (let i = 0; i < definitions.length; i++) {
				this.updateDefinition(definitions[i], type, i)
				.then(update => {
					updateTypes[update.index] = update.type;
					updateCount++;
					if (updateCount >= definitions.length) {
						resolve(updateTypes);
					}
				})
				.catch(e => {
					console.log("This shouldn't happen because invalid updates are resolved");
					updateCount++;
					if (updateCount >= definitions.length) {
						resolve(updateTypes);
					}
				});
			}
		});
	}

		/**
		 * Given a definition, will try to patch an existing defintion or a create a new one
		 * @param  {Object} definition Object paths and values
		 * @param  {string} type One of, "measure", "dimension", "variable", or visualization type (e.g., "kpi")
		 * @param {number} index Of the objects that will be added or patches, which is this (starting at 0)?
		 * @return {Promise<Object<{index:number,type:string}>>}     Index of the definition, type includes, "add", "replace", "invalid"
		 */
		updateDefinition(definition, type, index) {
			let qId = definition['qInfo/qId'] || definition['qId'] || definition['Id'] || definition['ID'] || null;
			if (qId != null && qId.length > 0){// && qIds.indexOf(qId) >= 0) {
					let fun = "";
					if (type === 'measure' || type === 'dimension') {
						fun = "get" + type.charAt(0).toUpperCase() + type.substr(1, type.length-1);
					} else if (type === 'variable') {
						fun = "getVariableById";
					} else {
						fun = "getObject";
					}

					return this._engineApp[fun]({"qId":qId})
						.then(
							handle => this.patchDefinition(handle, definition, type, index),
							e => this.createNewDefinition(definition, type, index)
						);
			} else {
				// the id is not given, we create a new definition
				return this.createNewDefinition(definition, type, index);
			}
		}

			/**
			 * Given the definition for an existing object, variable, measure, or dimension, will update properties.
			 * @param  {Object} handle     The Qlik object representing the found object, which gives access to object methods.
			 * @param  {Object} definition Object paths and values
		 	 * @param  {string} type 			 One of, "measure", "dimension", "variable", or visualization type (e.g., "kpi")
			 * @param {number} index Of the objects that will be added or patches, which is this (starting at 0)?
			 * @return {Promise<Object<{index:number,type:string}>>}     Index of the definition, type includes, "add", "replace", "invalid"
			 */
			patchDefinition(handle, definition, type, index) {
				//let patches = this.createQlikDefinition("replace", definition, type);				
				return new Promise((resolve, reject) => {
					//if (type === 'measure' || type === 'dimension' || type === 'variable' || type === "visualization") {
					let validCount = 0;
					let patchCount = 0;
					//let patches = this.createQlikDefinition("replace", definition, type);
					definition = this.formatProperties(definition, type, "replace");
					let possibleCount = Object.keys(definition).length;
					//for (let i = 0; i < patches.length; i++) {
					//	let patch =  patches[0];
					for (let key in definition) {		
						let patch = {};
						let value = definition[key];
						value = typeof value === "string"? '"' + value + '"' : (
							!Array.isArray(value) ?	value : (
								typeof value[0] === "string" ? '["' + value.join('","') + '"]' : '[' + value.join(',') + ']' 
							)
						);

						/////////////////////////////////////////////////////////////////////////
						/// Note: below is for formatting an ApplyPatches request for the qlik engine api
						/// This was done with a lot of trial and error, but it seems that:
						///     - properties on the highest level get a path with their key, like /key, and then the stringified value as qValue
						///     - similarly for visualizations, all properties (including those with a nested path e.g.  qMeasures/0/qDef...), get the value patched directly
						///     - measures and dimensions with a nested path need to use a json object as the qValue. {"key": "value"}
						/// This could be (and probably is) not 100% accurate, but it seems to work.
						/////////////////////////////////////////////////////////////////////////
						if ((type === "measure" || type === "dimension") && key.includes("/")) {
							let path = key.split("/");
							let newKey = path.pop();
							patch = {
								"qOp": "replace",
								"qPath": "/" + path.join("/"),
								"qValue": '{"' + newKey + '":'+  String(value) + '}'
							};
						} else {
								patch = {
								"qOp": "replace",
								"qPath": "/" + key,
								"qValue": String(value)
							};
						}						

						handle.applyPatches([patch])
						.then(q => {
							validCount++;
							patchCount++;
							console.log("Valid patch #", validCount, "of", patchCount,"...", patch.qPath, patch.qValue, patch);
							if (patchCount === possibleCount) {
								let type = validCount > 0 ? 'replace' : 'invalid';
								resolve({index: index, type: type});
							}		
						})
						.catch(e => {
							patchCount++;
							console.log("Invalid patch #", validCount, "of", patchCount,"...",  patch.qPath, patch.qValue, patch);
							if (patchCount === possibleCount) {
								let type = validCount > 0 ? 'replace' : 'invalid';
								resolve({index: index, type: type});
							}								
						});
					}	
				});
			}

			/**
			 * Given the definition for a variable, measure, or dimension that does not exist, will create a new one. Does not work for visualizations.
			 * @param  {Object} definition Object paths and values
		 	 * @param  {string} type 			 One of, "measure", "dimension", "variable", or visualization type (e.g., "kpi")
			 * @param {number} index Of the objects that will be added or patches, which is this (starting at 0)?
			 * @return {Promise<Object<{index:number,type:string}>>}     Index of the definition, type includes, "add", "replace", "invalid"
			 */
			createNewDefinition(definition, type, index) {
				console.log("original add:", definition);
				//let qDef = this.createQlikDefinition("add", definition, type);				
				definition = this.formatProperties(definition, type, "add");
				// make sure the type is given
				if(typeof definition["qInfo"]["qType"] === "undefined"){
					definition["qInfo"]["qType"] = type;
				}

				return new Promise((resolve, reject) => {
					let fun = null;
					if (type === 'measure' || type === 'dimension') {
						fun = "create" + type.charAt(0).toUpperCase() + type.substr(1, type.length-1);
					} else if (type === 'variable') {
						fun = "createVariableEx";
					}
					
					if (fun != null){
						this._engineApp[fun](definition).then(
							q => resolve({index: index, type: 'add'}), 
							e => resolve({index: index, type: 'invalid'})
						);	
					} else {
						// creating visualizations or other objects from definitions is not supported.
						 resolve({index: index, type: 'invalid'});
					}
				});
			}

			/**
			 * Turn the definition key-value pair into a format applicable for the Qlik API. 
			 * If we are patching, this will remain key-value pairs, but formatted correctly (e.g., numerically indices gathered as arrays)
			 * If we are adding, this will be a nested object
			 * @param  {Object} definition A flat key-value pair array taken from an uploaded file
			 * @param  {string} operation  One of, "replace" or "add"
			 * @param  {string} type       One of, "measure", "dimension", "variable", or visualization type (e.g., "kpi")
			 * @return {Object}            Either a flat key-value object (for patching) or a nested object (for adding)
			 */
			formatProperties(definition, type, operation) {
				let definition_out = {};
				let reg = new RegExp("(.*)?/([0-9]+)$");
				for (let key in definition) {
					key = this.updateProperty(key, type, operation);
					if (!this.isPropertyOperationValid(key, type, operation) ||
							definition[key].length === 0 // don't update empty values, an empty string should have one space character
						) {
						continue;
					}
					// update array values		
					if (reg.test(key)) {
						let path = key.match(reg)[1];
						let index = Number(key.match(reg)[2]);
						if (typeof definition_out[path] === "undefined") {
							definition_out[path] = [];
						} 

						definition_out[path][index] = definition[key];
					} else {
						definition_out[key] = definition[key];
					}
				}
				// roll through one more time and make sure that values are of the correct type and don't contain weird characters
				for (let key in definition_out) {
					if (Array.isArray(definition_out[key])) {
						for (let i = 0; i < definition_out[key].length; i++) {
							definition_out[key][i] = this.convertPropertyValueFromString(key, definition_out[key][i], type, operation);
						}
					} else {
						definition_out[key] =  this.convertPropertyValueFromString(key, definition_out[key], type, operation);
					}
				}

				// for addition operations, complex paths need to become nested objects
				if (operation === "add"){
					// got help from: https://stackoverflow.com/questions/19098797/fastest-way-to-flatten-un-flatten-nested-json-objects
					let unflatten = function(data){
						"use strict";
				    if (Object(data) !== data || Array.isArray(data))
				        return data;
				    var result = {}, cur, prop, idx, last, temp;
				    for(var p in data) {
				        cur = result, prop = "", last = 0;
				        do {
				            idx = p.indexOf("/", last); // this was originally ".", but I changed it for the qlik format
				            temp = p.substring(last, idx !== -1 ? idx : undefined);
				            cur = cur[prop] || (cur[prop] = (!isNaN(parseInt(temp)) ? [] : {}));
				            prop = temp;
				            last = idx + 1;
				        } while(idx >= 0);
				        cur[prop] = data[p];
				    }
				    return result[""];
					}
					return unflatten(definition_out);
				} else {
					return definition_out;
				}

				
			}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////// RETRIEVING DEFINITIONS - MEASURES, DIMENSIONSION, VARIABLES, ETC /////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	/**
	 * Returns all of the definitions for a given type
	 * {string} type       One of, "measure", "dimension", "variable", or visualization type (e.g., "kpi")
	 * @return {Object<string:string|number|boolean|Array>}  A single-level object with key-pairs. Keys correspend to nested paths in original object, separated by "/"
	 */
	getInternalDefinitions(type) {
		//return new Promise((resolve, reject) => {
		type = type.toLowerCase();
		if (type.substr(-1) === 's') {
			type = type.substr(0, type.length - 1);
		}

		if (this._definitionTypes.indexOf(type) > -1 || this._visualizationTypes.indexOf(type) > -1) {
			if (type === 'variable') {
				return this.getVariableDefinitions();
			} else {
				return this.getLibaryDefinitions(type);
			}			
		} else {
			Promise.reject(type + ' is not a supported type of definition');
		}
	}

/////// Library includes master measures, dimensions, and objects /////

	/**
	 * [getLibaryDefinitions description]
	 * @param  {string} type       One of, "measure", "dimension", "variable", or visualization type (e.g., "kpi")
	 * @return {Object<string:string|number|boolean|Array>}  A single-level object with key-pairs. Keys correspend to nested paths in original object, separated by "/"
	 */
	getLibaryDefinitions(type) {
		return new Promise((resolve, reject) => {
			this._engineApp.getAllInfos()
			.then(q => {
				var qInfos = q.qInfos;
				// find indices of matching type
				var qInfoIndices = [];
				for (let i = 0; i < qInfos.length; i++) {
					let qType = typeof qInfos[i]['qType'] === 'string' ? qInfos[i]['qType'].toLowerCase() : null;
					if (qType !== null && (qType === type ||
						type === 'other' && (
							qType.includes('chart') || qType.includes('plot') || qType.includes('table') || qType.includes('map') || 
							qType === 'kpi' || qType === 'histogram' || qType === 'gauge'
						)
					)) {
						qInfoIndices.push(i);
					}
				}

				if (qInfoIndices.length > 0) {
					var definitions = [];
					var objectCount = 0;
					for (let i = 0; i < qInfoIndices.length; i++) {
						let index = qInfoIndices[i];
						this.getLibraryDefinition(type, qInfos[index]['qId'])
						.then(definition => {
							objectCount++;
							definitions.push(definition);
							if (objectCount === qInfoIndices.length) {
								if (definitions.length > 0) {
									resolve(definitions);
								} else {
									reject("No " + type + " were found");
								}
							}									
						})
						.catch(e => {
							console.log("A " + type + " with id " + qInfos[index]['qId'] + " was not found");
							objectCount++;
							if (objectCount == qInfoIndices.length) {
								if (definitions.length > 0) {
									resolve(definitions);
								} else {
									reject("No " + type + " were found");
								}
							}
						});
					}
				} else {
					reject('no ' + type + ' are available');
				}
			})
		});
	}

		/**
		 * Get the properties of a measure, dimension, or visualization with the json path as key.
		 * @param  {string} type       One of, "measure", "dimension", "variable", or visualization type (e.g., "kpi")
		 * @param  {string} qId  The qlik ID for the measure, dimension, or visualization (generic object).
		 * @return {Object<string:string|number|boolean|Array>}  A single-level object with key-pairs. Keys correspend to nested paths in original object, separated by "/"
	 	 */
		getLibraryDefinition(type, qId) {		
			if (type === 'measure') {
				return this._engineApp.getMeasure({"qId":qId})
				.then(handle => handle.getProperties())
				.then(properties => this.flattenAndOrderProperties(properties));				
			} else if (type === 'dimension') {
				return this._engineApp.getDimension({"qId":qId})
				.then(handle => handle.getProperties())
				.then(properties => this.flattenAndOrderProperties(properties));
			} else if (this._visualizationTypes.indexOf(type) > -1 || type === 'other') {
				return this._engineApp.getObject({"qId":qId})
				.then(handle => handle.getProperties())
				.then(properties => this.flattenAndOrderProperties(properties));
			} else {
				return Promise.reject(type + ' is not a supported type of library definition');
			}					
		}		

/////// Variables /////

	/**
	 * Returns the definitions for all variables in an app.
	 * @return {Object<string:string|number|boolean|Array>}  A single-level object with key-pairs. Keys correspend to nested paths in original object, separated by "/"
	 */
	getVariableDefinitions() {
		return new Promise((resolve, reject) => {
			this._engineApp.createSessionObject({
    		qInfo: {qId: "tempVL", qType: "VariableList"},
    		qVariableListDef: {qType: "variable"}
    	})
    	.then(q => q.getLayout())
    	.then(qVL => {
  			let qVars = qVL.qVariableList.qItems;
  			let definitions = [];
  			for (let i = 0; i < qVars.length; i++) {
  				definitions[i] = this.flattenAndOrderProperties(qVL.qVariableList.qItems[i]);
  			}
  			//console.log ("variable definitions", definitions);
  			this._engineApp.destroySessionObject("tempVL");
  			if (definitions.length > 0) {
  				resolve(definitions);
  			} else {
  				reject("No variables found");
  			}
    	});
    });
	}

		/**
		 * Given a nested set of objects will flatten paths to create a single layer. Also filters and orders the paths for usability.
		 * @param  {Object} properties [description]
		 * @return {Object<string:string|number|boolean|Array>}  A single-level object with key-pairs. Keys correspend to nested paths in original object, separated by "/"
		 */
		flattenAndOrderProperties(properties) {
			// from https://gist.github.com/penguinboy/762197
			let flattenObject = function(ob) {
				let toReturn = {};
				
				for (let i in ob) {
					if (!ob.hasOwnProperty(i)) continue;
					
					if ((typeof ob[i]) == 'object') {
						let flatObject = flattenObject(ob[i]);
						for (let x in flatObject) {
							if (!flatObject.hasOwnProperty(x)) continue;
							
							toReturn[i + '/' + x] = flatObject[x];
						}
					} else {
						toReturn[i] = ob[i];
					}
				}
				return toReturn;
			};

			// from https://stackoverflow.com/questions/6754990/how-to-do-i-get-object-keys-by-a-pattern
			let getFilteredKeys = function(obj, filter, inverse) {
				if (inverse == null) {
					inverse = false;
				}
				let key, keys = []
			  for (key in obj)
			    if (obj.hasOwnProperty(key) && 
			    	(!inverse && filter.test(key) || inverse && !filter.test(key))
			    ) {
			      keys.push(key)
			    }
			  return keys
			}

			let flatObject = flattenObject(properties);
			let allKeys = Object.keys(flatObject);
			let keys = []
			// start with qInfo, which contains the id.
			.concat(getFilteredKeys(flatObject, /^qInfo/, false))
			// then we get the high level stuff, with no "."
			.concat(getFilteredKeys(flatObject, /\//, true))
			// meta data may include tags
			.concat(getFilteredKeys(flatObject, /^qMeta/, false))
			// color
			.concat(getFilteredKeys(flatObject, /^color/, false))
			// hypercube defines the measures and dimensions
			.concat(getFilteredKeys(flatObject, /^qHyperCube/, false))
			// everthing else
			keys = keys.concat(allKeys.filter(item => keys.indexOf(item) === -1))

			let toReturn = {};
			for (let i = 0; i < keys.length; i++) {
				let key = keys[i];
				// don't include any angular keys
				if (key.charAt(0) !== '$') {
					toReturn[key] = flatObject[key];
				}					
			}			
			return toReturn;
		}			
}
