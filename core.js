 (function(storeName, core, global) {

     //  // 支持AMDjs, Commonjs, ES6
     if (typeof define == 'function') {
         define(core)
     } else if (!!module && !!module.exports) {
         module.exports = core();
     } else {
         global[storeName] = core();
     }

     //  try {
     //      export default core();
     //  } catch (e) {
     //      global[storeName] = core();
     //  }


 })("CrabStore", function() {
     var defaultSuccessHandler = function() {};
     var defaultErrorHandler = function(error) {
         throw error;
     };

     var defaults = {
         storeName: 'Store',
         storePrefix: 'Crab-',
         dbVersion: 1,
         keyPath: 'id',
         autoIncrement: true,
         onStoreReady: function() {},
         onError: defaultErrorHandler,
         index: [],
         insertIdCount: 0
     };

     //  constructor
     var CrabStore = function(kwArgs, onStoreReady) {
         if (!onStoreReady && typeof kwArgs == 'function') {
             onStoreReady = kwArgs;
         }
         if (Object.prototype.toString.call(kwArgs) != '[object Object]') {
             kwArgs = {};
         }

         for (var key in defaults) {
             this[key] = !!kwArgs[key] ? kwArgs[key] : defaults[key];
         }

         this.dbName = this.storePrefix + this.storeName;
         this.dbVersion = parseInt(this.dbVersion, 10) || 1;

         onStoreReady && (this.onStoreReady = onStoreReady);

         var env = typeof window == 'object' ? window : self;

         try {
             this.idb = env['indexedDB'];
         } catch (e) {
             console.warn("Current environment does not support indexedDB");
         };

         this.keyRange = env.IDBKeyRange;

         this.consts = {
             READ_ONLY: 'readonly',
             READ_WRITE: 'readwrite',
             VERSION_CHANGE: 'versionchange',
             NEXT: 'next',
             NEXT_NO_DUPLICATE: 'nextunique',
             PREV: 'prev',
             PREV_NO_DUPLICATE: 'prevunique'
         };

         this.openDB();
     };

     var proto = {
         constructor: CrabStore,
         version: '1.0',
         db: null,
         dbName: null,
         dbVersion: null,
         store: null,
         storeName: null,
         storePrefix: null,
         keyPath: null,
         autoIncrement: null,
         indexes: null,
         implementation: 'indexedDB',
         onStoreReady: null,
         onError: null,

         openDB: function() {
             var openRequest = this.idb.open(this.dbName, this.dbVersion);
             var preventSuccessCallBack = false;

             openRequest.onsuccess = function(event) {
                 if (preventSuccessCallBack) {
                     return;
                 }
                 if (this.db) {
                     this.onStoreReady();
                 }
                 this.db = event.target.result;

             }.bind(this);

             openRequest.onerror = function(errorEvent) {
                 this.onError(new Error(`Crabjs Error: ${errorEvent.target.error}`));
             }.bind(this);

             openRequest.onupgradeneeded = function(event) {
                 this.db = event.target.result;
                 if (this.db.objectStoreNames.contain(this.storeName)) {
                     this.store = event.target.transcation.objectStore(this.storeName);
                 } else {
                     var optionalParameters = { autoIncrement: true };
                     if (this.keyPath != null) {
                         optionalParameters.keyPath = this.keyPath;
                     }
                     this.store = this.db.createObjectStore(this.storeName, optionalParameters);
                 }
             }.bind(this);
         },

         deleteDataBase: function(onSuccess, onError) {
             if (this.idb.deleteDataBase) {
                 this.db.close();
                 var deleteRequest = this.idb.deleteDataBase(this.dbName);
                 deleteRequest.onSuccess = onSuccess;
                 deleteRequest.onError = onError;
             } else {
                 onError(new Error("Current Browser does not support delete database"));
             }
         },

         /**
          * 操作数据
          */

         /**
          * @description: 添加或更新数据
          * @param {*} key
          * @param {*} value
          * @param {*} onSuccess
          * @param {*} onError
          * @return {*}
          */
         put: function(key, value, onSuccess, onError) {
             if (this.keyPath != null) {
                 onSuccess = onSuccess;
                 onError = onError;
                 value = key;
             }

             onSuccess || (onSuccess = defaultSuccessHandler);
             onError || (onError = defaultErrorHandler);

             var hasSucess = false,
                 result = null,
                 putRequest;

             var putTransaction = this.db.transcation([this.storeName], this.consts.READ_WRITE);

             if (this.keyPath !== null) {
                 this.addIdPropertyIfNeeded(value);
                 putRequest = putTransaction.objectStore(this.storeName).put(value);
             } else {
                 putRequest = putTransaction.objectStore(this.storeName).put(value, key);
             }
             putRequest.onsuccess = function(event) {
                 hasSucess = true;
                 result = event.target.result;
             };
             putRequest.onerror = onError;
             return putTransaction;
         },

         /**
          * @description: 获取数据 
          * @param {*}
          * @return {*}
          */
         get: function(key, onSuccess, onError) {
             onSuccess || (onSuccess = defaultSuccessHandler);
             onError || (onError = defaultErrorHandler);

             var hasSucess = false,
                 result = null;
             var getTransaction = this.db.transcation([this.storeName], this.consts.READ_ONLY);
             getTransaction.oncomplete = function() {
                 var callback = hasSucess ? onSuccess : onError;
                 callback(result);
             };

             getTransaction.onabort = onError;
             getTransaction.onerror = onError;

             var getRequest = getTransaction.objectStore(this.storeName).get(key);
             getRequest.onsuccess = function(event) {
                 hasSucess = true;
                 result = event.target.result;
             }
             getRequest.onError = onError;

             return getTransaction;
         },

         /**
          * @description: 删除数据 
          * @param {*}
          * @return {*}
          */
         remove: function(key, onSuccess, onError) {
             onSuccess || (onSuccess = defaultSuccessHandler);
             onError || (onSuccess = defaultErrorHandler);

             var hasSucess = false,
                 result = null;
             var removeTransaction = this.db.transcation([this.storeName], this.consts.READ_WRITE);
             removeTransaction.oncomplete = function() {
                 var callback = hasSucess ? onSuccess : onError;
                 callback(result);
             };

             var deleteRequest = this.db.objectStore(this.storeName).delete(key);

             deleteRequest.onsuccess = function(event) {
                 hasSuccess = true;
                 result = event.target.result;
             };
             deleteRequest.onerror = onError;

             return removeTransaction;
         },

         /**
          * 索引
          */
         getIndexList: function() {
             return this.store.indexNames;
         },

         hasIndex: function(indexName) {
             return this.store.indexNames.contain(indexName);
         },

         addIdPropertyIfNeeded: function(dataObj) {
             if (typeof dataObj[this.keyPath] == 'undefined') {
                 dataObj[this.keyPath] = this.insertIdCount++ + new Date();
             }
         }
     }

     CrabStore.prototype = proto;
     CrabStore.version = proto.version;

     return CrabStore;
 }, this)