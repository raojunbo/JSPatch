// 执行此脚本的为全局context。所以这个global指向的是全局context;
var global = this;
var fc = function() {
    // oc的类
    var _ocCls = {};
    // js的类
    var _jsCls = {};
    
    // 递归将oc转成js对象。obj可能是数组，可能是函数，可能是对象
    var _formatOCToJS = function(obj) {
        if (obj === undefined || obj === null) return false
        // 如果是object
        if (typeof obj == "object") {
            if (obj.__obj) return obj
            if (obj.__isNil) return false
        }
        // 是数组
        if (obj instanceof Array) {
            var ret = []
            obj.forEach(function(o) {
                ret.push(_formatOCToJS(o))
            })
            return ret
        }
        // 是函数
        if (obj instanceof Function) {
            return function() {
                var args = Array.prototype.slice.call(arguments)
                var formatedArgs = _OC_formatJSToOC(args)
                for (var i = 0; i < args.length; i++) {
                    if (args[i] === null || args[i] === undefined || args[i] === false) {
                        formatedArgs.splice(i, 1, undefined)
                    } else if (args[i] == nsnull) {
                        formatedArgs.splice(i, 1, null)
                    }
                }
                return _OC_formatOCToJS(obj.apply(obj, formatedArgs))
            }
        }
        // 是对象
        if (obj instanceof Object) {
            var ret = {}
            for (var key in obj) {
                ret[key] = _formatOCToJS(obj[key])
            }
            return ret
        }
        return obj
    }
    // 执行函OC的方法数，实例对象，类名，方法名，参数
    var _methodFunc = function(instance, clsName, methodName, args, isSuper, isPerformSelector) {
        var selectorName = methodName
        if (!isPerformSelector) {
            // oc中的方法名
            methodName = methodName.replace(/__/g, "-")
            // oc中的selector名
            selectorName = methodName.replace(/_/g, ":").replace(/-/g, "_")
            
            var marchArr = selectorName.match(/:/g)
            var numOfArgs = marchArr ? marchArr.length : 0
            if (args.length > numOfArgs) {
                selectorName += ":"
            }
        }
        // 调用_OC_callI OC中的实例方法，或者调用类方法
        var ret = instance ? _OC_callI(instance, selectorName, args, isSuper):
        _OC_callC(clsName, selectorName, args)
        // 将OC的对象转成JS对象
        return _formatOCToJS(ret)
    }
    // _customMethods对象，它就是一个对象
    var _customMethods = {
        // __c函数
        __c: function(methodName) {
            var slf = this
            
            if (slf instanceof Boolean) {
                return function() {
                    return false
                }
            }
            if (slf[methodName]) {
                return slf[methodName].bind(slf);
            }
            
            if (!slf.__obj && !slf.__clsName) {
                throw new Error(slf + '.' + methodName + ' is undefined')
            }
            if (slf.__isSuper && slf.__clsName) {
                slf.__clsName = _OC_superClsName(slf.__obj.__realClsName ? slf.__obj.__realClsName: slf.__clsName);
            }
            var clsName = slf.__clsName
            if (clsName && _ocCls[clsName]) {
                var methodType = slf.__obj ? 'instMethods': 'clsMethods'
                if (_ocCls[clsName][methodType][methodName]) {
                    slf.__isSuper = 0;
                    return _ocCls[clsName][methodType][methodName].bind(slf)
                }
            }
            
            return function(){
                var args = Array.prototype.slice.call(arguments)
                // 调用执行指定对象的指定函数
                return _methodFunc(slf.__obj, slf.__clsName, methodName, args, slf.__isSuper)
            }
        },
        // super函数
        super: function() {
            var slf = this
            if (slf.__obj) {
                slf.__obj.__realClsName = slf.__realClsName;
            }
            return {__obj: slf.__obj, __clsName: slf.__clsName, __isSuper: 1}
    },
        // performSelectorInOC
        performSelectorInOC: function() {
            var slf = this
            var args = Array.prototype.slice.call(arguments)
            return {__isPerformInOC:1, obj:slf.__obj, clsName:slf.__clsName, sel: args[0], args: args[1], cb: args[2]}
        },
        
        performSelector: function() {
            var slf = this
            var args = Array.prototype.slice.call(arguments)
            return _methodFunc(slf.__obj, slf.__clsName, args[0], args.splice(1), slf.__isSuper, true)
        }
    }
   
    /**
    1.configurable:表示能否通过delete删除属性从而重新定义属性，能否修改属性的特性，或者能否把属性修改为访问器属性，默认值为true。
    2.enumerable：表示能否通过for in循环访问属性，默认值为true
    3.value：包含这个属性的数据值。默认值为undefined。
    */
    // 给这个函数对象的原型Object.prototype定义属性和其属性特性。
    // 原型对象: 如果不能理解原型对象，可以看成是OC里一个对象的类对象，保存了公用的实例方法，这里的原型其实也是起到这个作用
    // 这里就是给Object.prototype 定义了__c，super，performSelectorInOC，performSelector等函数属性。
    
    for (var method in _customMethods) {
        if (_customMethods.hasOwnProperty(method)) {
            Object.defineProperty(Object.prototype, method, {value: _customMethods[method], configurable:false, enumerable: false})
        }
    }
    
    var _require = function(clsName) {
        // 如果clsName不在global中
        if (!global[clsName]) {
            // 将类挂到global上，例如 JPViewController
            global[clsName] = {
                __clsName: clsName
            }
        }
        return global[clsName]
    }
    // 给global对象设置require属性(这里要特别注意js是基于对象的，可以中途随意设置值)
    global.require = function() {
        var lastRequire
        for (var i = 0; i < arguments.length; i ++) {
            arguments[i].split(',').forEach(
                    function(clsName) {
                        lastRequire = _require(clsName.trim())
                    }
            )
        }
        return lastRequire
    }
    
    var _formatDefineMethods = function(methods, newMethods, realClsName) {
        for (var methodName in methods) {
            if (!(methods[methodName] instanceof Function)) return;
            (function(){
                var originMethod = methods[methodName]
                // JS的Method转成oc的Method(实际上时将其放在一个函数里，要执行时将参数转成js参数，然后调用原来的js函数)
                // newMethods[methodNmae]存为数组
                // 第一个值：表示函数参数个数,originMethod.length
                // 第二个值：待执行的js函数
                newMethods[methodName] = [originMethod.length, function() {
                    try {
                        // arguments是函数对象的内部对象，默认属性
                        // 将oc的参数转换成js的参数
                        var args = _formatOCToJS(Array.prototype.slice.call(arguments))
                        
                        var lastSelf = global.self
                        global.self = args[0]
                       
                        if (global.self) {
                            global.self.__realClsName = realClsName
                        }
                        // 取(0,1)的参数
                        args.splice(0,1)
                        var ret = originMethod.apply(originMethod, args)
                            
                        global.self = lastSelf
                        return ret
                    } catch(e) {
                        _OC_catch(e.message, e.stack)
                    }
                }]
            })()
        }
    }
    
    var _wrapLocalMethod = function(methodName, func, realClsName) {
        return function() {
            var lastSelf = global.self
            global.self = this
            
            this.__realClsName = realClsName
            // 执行方法
            var ret = func.apply(this, arguments)
            
            global.self = lastSelf
            return ret
        }
    }

    var _setupJSMethod = function(className, methods, isInst, realClsName) {
        for (var name in methods) {
            var key = isInst ? 'instMethods': 'clsMethods',
            // 遍历所有的方法
            func = methods[name]
            // 重新包装一下
            _ocCls[className][key][name] = _wrapLocalMethod(name, func, realClsName)
        }
    }
    
    var _propertiesGetFun = function(name){
        return function(){
            var slf = this;
            if (!slf.__ocProps) {
                var props = _OC_getCustomProps(slf.__obj)
                if (!props) {
                    props = {}
                    _OC_setCustomProps(slf.__obj, props)
                }
                // self 设置属性
                slf.__ocProps = props;
            }
            // 获取
            return slf.__ocProps[name];
        };
    }
    
    var _propertiesSetFun = function(name){
        return function(jval){
            var slf = this;
            if (!slf.__ocProps) {
                // 获得自定义属性，调用OC的_OC_getCustomProps方法
                var props = _OC_getCustomProps(slf.__obj)
                // 自定义属性为nil时，设置OC的_OC_setCustomProps方法
                if (!props) {
                    props = {}
                    _OC_setCustomProps(slf.__obj, props)
                }
                slf.__ocProps = props;
            }
            // 设置
            slf.__ocProps[name] = jval;
        };
    }
    // 给global对象设置defineClass属性,这个属性就是一个函数(这里要特别注意js是基于对象的)
    /*
     定义类的函数
     defineClass(
        'JPTableViewController : UITableViewController <UIAlertViewDelegate>',
        ['data'],
        {
            dataSource: function() {
                var data = self.data();
                if (data) return data;
                var data = [];
                for (var i = 0; i < 20; i ++) {
                    data.push("cell from js " + i);
                }
                self.setData(data)
                return data;
            },
            numberOfSectionsInTableView: function(tableView) {
                return 1;
            }
        }
     )
     */
    global.defineClass = function(declaration, properties, instMethods, clsMethods) {
        // newMethods里的存储如下
        // newMethods[methodName] = [originMethod.length, function() {}
        var newInstMethods = {}, newClsMethods = {}
        if (!(properties instanceof Array)) {
            clsMethods = instMethods
            instMethods = properties
            properties = null
        }
       // 1. 属性添加添加get方法和set方法
        if (properties) {
            properties.forEach(
                               function(name){
                                   // 设置get方法，instMethods里面存的是函数
                                   if (!instMethods[name]) {
                                       instMethods[name] = _propertiesGetFun(name);
                                   }
                                   // 设置set方法
                                   var nameOfSet = "set"+ name.substr(0,1).toUpperCase() + name.substr(1);
                                   if (!instMethods[nameOfSet]) {
                                       instMethods[nameOfSet] = _propertiesSetFun(name);
                                   }
                               }
                               );
        }
        // 2. 准好其他方法
        
        // 分割出真正的类名  eg, JPTableViewController : UITableViewController <UIAlertViewDelegate>
        var realClsName = declaration.split(':')[0].trim()
        // 给一个类定义实例方法
        _formatDefineMethods(instMethods, newInstMethods, realClsName)
        // 给一个类定义类方法
        _formatDefineMethods(clsMethods, newClsMethods, realClsName)
        
        // 3. 调用OC端获取OC端类的定义，返回OC端的定义的{cls:"class名", superCls: "superCls"}
        var ret = _OC_defineClass(declaration, newInstMethods, newClsMethods)
        var className = ret['cls']
        var superCls = ret['superCls']
        
        // 将该类的基本信息填写进去_ocCls
        _ocCls[className] = {
            instMethods: {},
            clsMethods: {},
        }
        
        if (superCls.length && _ocCls[superCls]) {
            // 将父类的实例方法填写进子类
            for (var funcName in _ocCls[superCls]['instMethods']) {
                _ocCls[className]['instMethods'][funcName] = _ocCls[superCls]['instMethods'][funcName]
            }
            // 父类的类方法填写进子类的类方法
            for (var funcName in _ocCls[superCls]['clsMethods']) {
                _ocCls[className]['clsMethods'][funcName] = _ocCls[superCls]['clsMethods'][funcName]
            }
        }
        // 将实例函数装进_ocCls
        _setupJSMethod(className, instMethods, 1, realClsName)
        // 将类函数装进_ocCls
        _setupJSMethod(className, clsMethods, 0, realClsName)
        
        return require(className)
    }
    // 定义协议的函数
    global.defineProtocol = function(declaration, instProtos , clsProtos) {
        var ret = _OC_defineProtocol(declaration, instProtos,clsProtos);
        return ret
    }
    
    global.block = function(args, cb) {
        var that = this
        var slf = global.self
        if (args instanceof Function) {
            cb = args
            args = ''
        }
        var callback = function() {
            var args = Array.prototype.slice.call(arguments)
            global.self = slf
            return cb.apply(that, _formatOCToJS(args))
        }
        var ret = {args: args, cb: callback, argCount: cb.length, __isBlock: 1}
        if (global.__genBlock) {
            ret['blockObj'] = global.__genBlock(args, cb)
        }
        return ret
    }
    // 定义oc日志
    if (global.console) {
        var jsLogger = console.log;
        global.console.log = function() {
            global._OC_log.apply(global, arguments);
            if (jsLogger) {
                jsLogger.apply(global.console, arguments);
            }
        }
    } else {
        global.console = {
        log: global._OC_log
        }
    }
    // 定义JS类的函数
    global.defineJSClass = function(declaration, instMethods, clsMethods) {
        var o = function() {},
        a = declaration.split(':'),
        clsName = a[0].trim(),
        superClsName = a[1] ? a[1].trim() : null
        o.prototype = {
        init: function() {
            if (this.super()) this.super().init()
                return this;
        },
            super: function() {
                return superClsName ? _jsCls[superClsName].prototype : null
            }
        }
        var cls = {
        alloc: function() {
            return new o;
        }
        }
        for (var methodName in instMethods) {
            o.prototype[methodName] = instMethods[methodName];
        }
        for (var methodName in clsMethods) {
            cls[methodName] = clsMethods[methodName];
        }
        global[clsName] = cls
        _jsCls[clsName] = o
    }
    
    global.YES = 1
    global.NO = 0
    global.nsnull = _OC_null
    global._formatOCToJS = _formatOCToJS
    
}
fc()
