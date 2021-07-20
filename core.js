 (function(storeName, core, global) {

     // 支持AMDjs, Commonjs, ES6
     if (typeof define == 'function') {
         define(core)
     } else if (!!module && !!module.exports) {
         module.exports = core();
     } else {
         global[storeName] = core();
     }

 })("CRABStore", function() {

 }, this)