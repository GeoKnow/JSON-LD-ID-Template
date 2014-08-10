var _;
if(!_) {
    _ = {};
}

// Taken from underscore
_.isFunction = _.isFunction || function(obj) {
    return typeof obj === 'function';
};

_.isObject = _.isObject || function(obj) {
    return obj === Object(obj);
};

_.isArray = _.isArray || function(obj) {
    return Object.prototype.toString.call(obj) == '[object Array]';
};

var JsonLdUtils;
if(!JsonLdUtils) {
    JsonLdUtils = {};
}


JsonLdUtils.stringifyCyclic = function(obj, fn, style) {
    var seen = [];
    var result = JSON.stringify(obj, function(key, val) {
        if (_.isObject(val)) {
            if (seen.indexOf(val) >= 0) {
                return;
            }
            seen.push(val);
            if(fn) {
                val = fn(key, val);
            }
        }
        return val;
    }, style);
    return result;
};

/**
 * Function that removes all attributes starting with $ from the json
 */
JsonLdUtils.censor = function(key, val) {
    if(('' + key).charAt(0) === '$') {
        return;
    }
    
    return val;
};

/**
 * Creates a copy of the given JSON document, where each object has a link
 * to its parent, using '$parent'
 */
JsonLdUtils.enrichWithParents = function(json, parent, index, parentAttrName, indexAttrName) {
    if(_.isFunction(json)) {
        throw 'Functions were not expected';
    } else if(_.isArray(json)) {

        for(var i = 0; i < json.length; ++i) {
            var item = json[i];
            JsonLdUtils.enrichWithParents(item, json, i, parentAttrName, indexAttrName);
        }

    } else if(_.isObject(json)) {
        for(var key in json) {
            var val = json[key];
            JsonLdUtils.enrichWithParents(val, json, null, parentAttrName, indexAttrName);
        }
    }

    if(parentAttrName === '__proto__') {
        json.__proto__ = parent;
    } else {
        json[parentAttrName] = parent;
    }
    //json.prototype = parent;
    if(index != null) {
        json[indexAttrName] = index;        
    }
};

JsonLdUtils.deepExtend = function(dest, src) {
    var result;

    //println('--------------------');
    //println('extend dest: ' + JSON.stringify(dest));
    //println('with src: ' + JSON.stringify(src));
    
    
    if(_.isFunction(src)) {
        throw 'Function unexpected';
    } else if(_.isArray(src)) {
        result = dest || [];

        if(!_.isArray(result)) {
            throw 'Type mismatch: Attempted to extend ' + JSON.stringify(dest) + ' with ' + JSON.stringify(src);
        }

        
        for(var i = 0; i < src.length; ++i) {
            var srcItem = src[i];
            var destItem = result[i];

            var newItem = JsonLdUtils.deepExtend(destItem, srcItem);
            result.pop();
            result.push(newItem);
        }
        // Append remaining items from dest
        //println(dest.length + '---' + src.length);
        for(var i = result.length; i < src.length; ++i) {
            var destItem = result[i];
            result.push(destItem);
        }        
    } else if(_.isObject(src)) {
        result = dest || {};
        
        if(_.isArray(dest)) {
            throw 'Object/Array mismatch - Should not happen';
        }
        
        for(var key in src) {
            var srcVal = src[key];
            var destVal = result[key];
            
            var newVal = JsonLdUtils.deepExtend(destVal, srcVal);
            result[key] = newVal;
        }
    } else {
        result = src;
    }

    return result;
};

JsonLdUtils.evalFunctionOnObject = function(template, data) {
    
    //println('--------------------');
    //println('eval template: ' + JSON.stringify(template));
    //println('on data: ' + JSON.stringify(data, JsonLdUtils.censor));
    
    // Make sure to evaluate all functions on a level first
    // in order to support consistent access to parent attributes

    var backlog = [];
    for(var key in template) {
        var val = template[key];
        
        if(_.isFunction(val)) {
            var newVal = val.call(data);
            data[key] = newVal;
            //println('called function; result: ' + JsonLdUtils.stringifyCyclic(data, JsonLdUtils.censor, 4));
        } else {
            backlog.push(key);
        }
    }
    
    for(var i = 0; i < backlog.length; ++i) {
        var key = backlog[i];
        var val = template[key];
        var dataVal = data[key];
        
        var newVal = JsonLdUtils.evalFunctions(val, dataVal);
        data[key] = newVal;
    }
    
    return data;
};

JsonLdUtils.evalFunctions = function(template, data) {
    var result;

    if(_.isFunction(template)) {
        throw 'No function expected here';
    } else if(_.isArray(template)) {
        throw 'Templates should not contain arrays';
    } else if(_.isObject(template)) {
        
        if(_.isArray(data)) {
            result = data;
            for(var i = 0; i < data.length; ++i) {
                var item = data[i];
                var resultItem = JsonLdUtils.evalFunctionOnObject(template, item);
                data[i] = resultItem;
            }
        } else {
            result = JsonLdUtils.evalFunctionOnObject(template, data);
        }

        
    } else {
        result = template;
    }

    return result;
};

/**
 * 
 */
JsonLdUtils.compile = function(jsonLdContextTemplate) {
    var result = function(data) {
        
        // Clone the orginal data (we don't want side effects) 
        var copy = JSON.parse(JSON.stringify(data));
        
        // Enrich the object structure with parent and index attributes
        // We will set up a prototype chain for convenient access to parent data
        JsonLdUtils.enrichWithParents(copy, null, null, '__proto__', '$index');
        
        //println('copy: ' + JsonLdUtils.stringifyCyclic(copy, JsonLdUtils.censor, 4));

        // Evaluate the template against the data - this will modify the data in-place!
        var rawContext = JsonLdUtils.evalFunctions(jsonLdContextTemplate, copy);

        //println('context: ' + JsonLdUtils.stringifyCyclic(context, JsonLdUtils.censor, 4));
        
        // Remove all special keys from the context (those starting with '$') 
        var cleanContext = JSON.parse(JSON.stringify(rawContext, JsonLdUtils.censor));

        // Merge the original data with the clean context
        var data = JsonLdUtils.deepExtend(cleanContext, data);

        //println('merged: ' + JSON.stringify(data));
        
        return data;
    };
    
    return result;
};


module.exports = JsonLdUtils;


/*
var staticSchema = staticSchemaStr != null ? eval(staticSchemaStr) : null;

var templateObj = eval(templateStr);
var json = JSON.parse(jsonStr);
var jsonLd = JsonLdUtils.compile(templateObj)(json);

if(staticSchema != null) {
    jsonLd = JsonLdUtils.deepExtend(jsonLd, staticSchema);
}

var jsonLdStr = JSON.stringify(jsonLd, JsonLdUtils.censor); 
*/



