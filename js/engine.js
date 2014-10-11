var L = (function () {
    'use strict';
    
    function L() {}
    
    // =================
    // DomView
    // =================
    
    function DomView(elementCssSelector) {
        this.element = $(elementCssSelector);
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.element.append(this.canvas);
    }
    
    DomView.prototype.showScene = function (scene) {
        var stage = new Stage();
        scene.generator(stage);
        
        var ctx = this.ctx;
        
        function render() {
            for(var i = 0; i < stage.objects.length; i++) {
                var obj = stage.objects[i];
                ctx.fillStyle = "red";
                ctx.beginPath();
                ctx.arc(obj.x, obj.y, obj.size, 0, 2 * Math.PI);
                ctx.fill();

                ctx.fillStyle = "white";
                ctx.font = "12px Helvetica";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(0, obj.x, obj.y);
            }
        }
        
        setInterval(render, 16);
    };
    
    L.domView = function (divName) {
        return new DomView(divName);
    };
    
    // =================
    // Stage
    // =================
    
    function Stage() {
        this.objects = [];
    }
    
    Stage.prototype.insert = function (item) {
        this.objects.push(item);
    };
    
    // =================
    // SceneGenerator
    // =================
    
    function SceneGenerator(generator) {
        this.generator = generator;
    }
    
    L.scene = function (generator) {
        return new SceneGenerator(generator);
    };
    
    // =================
    // Ball
    // =================
    
    L.Ball = function () {
        this.x = 100;
        this.y = 100;
        this.size = 30;
    };
    
    return L;
}());