/*
 *  traqball 2.2
 *  written by Dirk Weber   
 *  http://www.eleqtriq.com/
 *  See demo at: http://www.eleqtriq.com/wp-content/static/demos/2011/traqball2011
 
 *  Copyright (c) 2011 Dirk Weber (http://www.eleqtriq.com)
 *  Licensed under the MIT (http://www.eleqtriq.com/wp-content/uploads/2010/11/mit-license.txt)
 */

(function(){
    var userAgent   = navigator.userAgent.toLowerCase(),
        canTouch    = "ontouchstart" in window,
        prefix      = cssPref = "",
        requestAnimFrame, cancelAnimFrame;
    
    if(/webkit/gi.test(userAgent)){
        prefix = "-webkit-";
        cssPref = "Webkit";
    }else if(/msie | trident/gi.test(userAgent)){
        prefix = "-ms-";
        cssPref = "ms";
    }else if(/mozilla/gi.test(userAgent)){
        prefix = "-moz-";
        cssPref = "Moz";
    }else if(/opera/gi.test(userAgent)){
        prefix = "-o-";
        cssPref = "O";
    }else{
        prefix = "";
    }
    
    function bindEvent(target, type, callback, remove){
        //translate events
        var evType      = type || "touchend",
            mouseEvs    = ["mousedown", "mouseup", "mousemove"],
            touchEvs    = ["touchstart", "touchend", "touchmove"],
            remove      = remove || "add";
         
        evType = canTouch ? evType : mouseEvs[touchEvs.indexOf(type)];
        
        target[remove+"EventListener"](evType, callback, false);
    }
    
    function getCoords(eventObj){
        var xTouch,
            yTouch;
        
        if(eventObj.type.indexOf("mouse") > -1){
            xTouch = eventObj.pageX;
            yTouch = eventObj.pageY;
        }else if(eventObj.type.indexOf("touch") > -1){
            //only do stuff if 1 single finger is used:
            if(eventObj.touches.length === 1){
                var touch   = eventObj.touches[0];
                xTouch      = touch.pageX;
                yTouch      = touch.pageY;
            }
        }
        
        return [xTouch, yTouch];
    }
    
    function getStyle(target, prop){
        var style = document.defaultView.getComputedStyle(target, "");
        return style.getPropertyValue(prop);
    }
    
    requestAnimFrame = (function(){
        return  window[cssPref+"RequestAnimationFrame"] || 
                      function(callback){
                        window.setTimeout(callback, 17);
                      };
        })();
        
    cancelAnimFrame = (function(){
              return  window[cssPref+"CancelRequestAnimationFrame"] || 
                      clearTimeout;
         })();
        
    var Traqball = function(confObj){
        this.config = {};
        this.box = null;
        
        this.setup(confObj);
    };
    
    Traqball.prototype.disable = function(){
        if(this.box !== null){
            bindEvent(this.box, 'touchstart', this.evHandlers[0], "remove");
            bindEvent(document, 'touchmove', this.evHandlers[1], "remove");
            bindEvent(document, 'touchend', this.evHandlers[2], "remove");
        }
    }
    
    Traqball.prototype.activate = function(){
        if(this.box !== null){
            bindEvent(this.box, 'touchstart', this.evHandlers[0]);
            bindEvent(document, 'touchmove', this.evHandlers[1], "remove");
            bindEvent(document, 'touchend', this.evHandlers[2], "remove");
        }
    }
        
    Traqball.prototype.setup = function(conf){
        var THIS            = this,
            radius,                 // prepare a variable for storing the radius of our virtual trackball
            stage,                  // the DOM-container of our "rotatable" element
            axis            = [],   // The rotation-axis
            mouseDownVect   = [],   // Vector on mousedown
            mouseMoveVect   = [],   // Vector during mousemove
            startMatrix     = [],   // Transformation-matrix at the moment of *starting* dragging
            delta           = 0,
            impulse, pos, w, h, decr, angle, oldAngle, oldTime, curTime;
                
        (function init (){
            THIS.disable();
                    
            for(var prop in conf){
                THIS.config[prop] = conf[prop];
                }
                
            stage   = document.getElementById(THIS.config.stage) || document.getElementsByTagname("body")[0];
            pos     = findPos(stage);
            angle   = THIS.config.angle || 0;
            impulse = THIS.config.impulse === false ? false : true;
             
            // Let's calculate some basic values from "stage" that are necessary for our virtual trackball
            // 1st: determine the radius of our virtual trackball:
            h   = stage.offsetHeight/2,
            w   = stage.offsetWidth/2;
        
            //take the shortest of both values as radius
            radius = h<w ? h : w;
        
            //We parse viewport. The first block-element we find will be our "victim" and made rotatable
            for(var i=0, l=stage.childNodes.length; i<l; i++){
                var child = stage.childNodes[i];
                    
                if(child.nodeType === 1){
                    THIS.box = child;
                    break;
                }
            }
            
            var perspective = getStyle(stage, prefix+"perspective"),
                pOrigin     = getStyle(stage, prefix+"perspective-origin"),
                bTransform  = getStyle(THIS.box, prefix+"transform");
                            
            //Let's define the start values. If "conf" contains angle or perspective or vector, use them.
            //If not, look for css3d transforms within the CSS.
            //If this fails, let's use some default values.
            
            if(THIS.config.axis || THIS.config.angle){
                // Normalize the initAxis (initAxis = axis of rotation) because "box" will look distorted if normal is too long
                axis = normalize(THIS.config.axis) || [1,0,0];
                angle = THIS.config.angle || 0;
                // Last but not least we calculate a matrix from the axis and the angle.
                // This matrix will store the initial orientation in 3d-space
                startMatrix = calcMatrix(axis, angle);
            }else if(bTransform !== "none"){
                //already css3d transforms on element?              
                startMatrix = bTransform.split(",");
                
                //Under certain circumstances some browsers report 2d Transforms.
                //Translate them to 3d:
                if(/matrix3d/gi.test(startMatrix[0])){
                    startMatrix[0] = startMatrix[0].replace(/(matrix3d\()/g, "");
                    startMatrix[15] = startMatrix[15].replace(/\)/g, "");
                }else{
                    startMatrix[0] = startMatrix[0].replace(/(matrix\()/g, "");
                    startMatrix[5] = startMatrix[5].replace(/\)/g, "");
                    startMatrix.splice(2,0,0,0);
                    startMatrix.splice(6,0,0,0);
                    startMatrix.splice(8,0,0,0,1,0);
                    startMatrix.splice(14,0,0,1);
                }
                for(var i = 0, l = startMatrix.length; i<l; i++){
                    startMatrix[i] = parseFloat(startMatrix[i]);
                }
            }else{
                axis        = [0,1,0];
                angle       = 0;
                startMatrix = calcMatrix(axis, angle);
            }
        
            if(THIS.config.perspective){
                stage.style[cssPref+"Perspective"] = THIS.config.perspective;
            }else if(perspective === "none"){
                stage.style[cssPref+"Perspective"] = "700px";
            }
            
            if(THIS.config.perspectiveOrigin){
                stage.style[cssPref+"PerspectiveOrigin"] = THIS.config.perspectiveOrigin;
            }
            
            THIS.box.style[cssPref+"Transform"] = "matrix3d("+ startMatrix+")";
            bindEvent(THIS.box, 'touchstart', startrotation);
            
            THIS.evHandlers = [startrotation, rotate, finishrotation];
        })();
            
        
        function startrotation(e){  
            if(delta !== 0){stopSlide();};
            e.preventDefault();
            
            mouseDownVect   = calcZvector(getCoords(e));
            oldTime         = curTime = new Date().getTime();
            oldAngle        = angle; 
        
            bindEvent(THIS.box,'touchstart', startrotation, "remove");
            bindEvent(document, 'touchmove', rotate);
            bindEvent(document, 'touchend', finishrotation);            
        }
    
        function finishrotation(e){
            var stopMatrix;
        
            bindEvent(document, 'touchmove', rotate, "remove");
            bindEvent(document, 'touchend', finishrotation, "remove");
            bindEvent(THIS.box, 'touchstart', startrotation);
            calcSpeed();
            if( impulse && delta > 0){
                requestAnimFrame(slide);
            }else if(!(isNaN(axis[0]) || isNaN(axis[1]) || isNaN(axis[2]))) {
                stopSlide();
            }
        }
    
        function cleanupMatrix(){
            // Clean up when finishing rotation. Only thing to do: create a new "initial" matrix for the next rotation.
            // If we don't, the object will flip back to the position at launch every time the user starts dragging.
            // Therefore we must:
            // 1. calculate a matrix from axis and the current angle
            // 2. Create a new startmatrix by combining current startmatrix and stopmatrix to a new matrix. 
            // Matrices can be combined by multiplication, so what are we waiting for?
            stopMatrix  = calcMatrix(axis, angle);
            startMatrix = multiplyMatrix(startMatrix,stopMatrix);
        }
    
        // The rotation:
        function rotate(e){
            var eCoords = getCoords(e);
            e.preventDefault();
            
            oldTime = curTime;
            oldAngle = angle;
            
            // Calculate the currrent z-component of the 3d-vector on the virtual trackball
            mouseMoveVect = calcZvector(eCoords);
        
            // We already calculated the z-vector-component on mousedown and the z-vector-component during mouse-movement. 
            // We will use them to retrieve the current rotation-axis 
            // (the normal-vector perpendiular to mouseDownVect and mouseMoveVect).
            axis[0] = mouseDownVect[1]*mouseMoveVect[2]-mouseDownVect[2]*mouseMoveVect[1];
            axis[1] = mouseDownVect[2]*mouseMoveVect[0]-mouseDownVect[0]*mouseMoveVect[2];
            axis[2] = mouseDownVect[0]*mouseMoveVect[1]-mouseDownVect[1]*mouseMoveVect[0];
            axis    = normalize(axis);
             
            // Now that we have the normal, we need the angle of the rotation.
            // Easy to find by calculating the angle between mouseDownVect and mouseMoveVect:
            angle = calcAngle(mouseDownVect, mouseMoveVect);
            
            //Only one thing left to do: Update the position of the box by applying a new transform:
            // 2 transforms will be applied: the current rotation 3d and the start-matrix
            THIS.box.style[cssPref+"Transform"] = "rotate3d("+ axis+","+angle+"rad) matrix3d("+startMatrix+")";
                                        
            curTime = new Date().getTime();
        }
    
        function calcSpeed(){
            var dw  = angle - oldAngle;
                dt  = curTime-oldTime;
                
            delta   = Math.abs(dw*17/dt);
            
            if(isNaN(delta)){
                delta = 0;
            }else if(delta > 0.2){
                delta = 0.2;
            }
        } 
        
        function slide(){
            angle+= delta;
            decr = 0.01*Math.sqrt(delta);
            delta = delta > 0 ? delta-decr : 0;
            
            THIS.box.style[cssPref+"Transform"] = "rotate3d("+ axis+","+angle+"rad) matrix3d("+startMatrix+")";
            
            if (delta === 0){
                stopSlide();
            }else{
                requestAnimFrame(slide);
            }
        }
        
        function stopSlide(){
            cancelAnimFrame(slide);
            cleanupMatrix();
            oldAngle = angle = 0;
            delta = 0;
        }
        
        //Some stupid matrix-multiplication. 
        function multiplyMatrix(m1, m2){
            var matrix = [];
        
            matrix[0]   = m1[0]*m2[0]+m1[1]*m2[4]+m1[2]*m2[8]+m1[3]*m2[12];
            matrix[1]   = m1[0]*m2[1]+m1[1]*m2[5]+m1[2]*m2[9]+m1[3]*m2[13];
            matrix[2]   = m1[0]*m2[2]+m1[1]*m2[6]+m1[2]*m2[10]+m1[3]*m2[14];
            matrix[3]   = m1[0]*m2[3]+m1[1]*m2[7]+m1[2]*m2[11]+m1[3]*m2[15];
            matrix[4]   = m1[4]*m2[0]+m1[5]*m2[4]+m1[6]*m2[8]+m1[7]*m2[12];
            matrix[5]   = m1[4]*m2[1]+m1[5]*m2[5]+m1[6]*m2[9]+m1[7]*m2[13];
            matrix[6]   = m1[4]*m2[2]+m1[5]*m2[6]+m1[6]*m2[10]+m1[7]*m2[14];
            matrix[7]   = m1[4]*m2[3]+m1[5]*m2[7]+m1[6]*m2[11]+m1[7]*m2[15];
            matrix[8]   = m1[8]*m2[0]+m1[9]*m2[4]+m1[10]*m2[8]+m1[11]*m2[12];
            matrix[9]   = m1[8]*m2[1]+m1[9]*m2[5]+m1[10]*m2[9]+m1[11]*m2[13];
            matrix[10]  = m1[8]*m2[2]+m1[9]*m2[6]+m1[10]*m2[10]+m1[11]*m2[14];
            matrix[11]  = m1[8]*m2[3]+m1[9]*m2[7]+m1[10]*m2[11]+m1[11]*m2[15];
            matrix[12]  = m1[12]*m2[0]+m1[13]*m2[4]+m1[14]*m2[8]+m1[15]*m2[12];
            matrix[13]  = m1[12]*m2[1]+m1[13]*m2[5]+m1[14]*m2[9]+m1[15]*m2[13];
            matrix[14]  = m1[12]*m2[2]+m1[13]*m2[6]+m1[14]*m2[10]+m1[15]*m2[14];
            matrix[15]  = m1[12]*m2[3]+m1[13]*m2[7]+m1[14]*m2[11]+m1[15]*m2[15];
        
            return matrix;
        }

        // This function will calculate a z-component for our 3D-vector from the mouse x and y-coordinates 
        // (the corresponding point on our virtual trackball):
        function calcZvector(coords){
            var x       = THIS.config.limitAxxis === "x" ? radius : coords[0] - pos[0],
                y       = THIS.config.limitAxxis === "y" ? radius : coords[1] - pos[1],
                vector  = [(x/radius-1), (y/radius-1)],
                z       = 1 - vector[0]*vector[0] - vector[1]*vector[1];
                
             // Make sure that dragging stops when z gets a negative value:
            vector[2]   = z > 0 ? Math.sqrt(z) : 0;
 
            return vector;
        }
    
        // Normalization recalculates all coordinates in a way that the resulting vector has a length of "1". 
        // We achieve this by dividing the x, y and z-coordinates by the vector's length 
        function normalize(vect){   
            var length = Math.sqrt( vect[0]*vect[0] + vect[1]*vect[1] + vect[2]*vect[2] );
            
            vect[0]/= length;
            vect[1]/= length;
            vect[2]/= length;

            return vect;
        }
            
        // Calculate the angle between 2 vectors.
        function calcAngle(vect_1, vect_2){
            var numerator   =   vect_1[0]*vect_2[0] + vect_1[1]*vect_2[1] + vect_1[2]*vect_2[2],
                denominator =   Math.sqrt(vect_1[0]*vect_1[0] + vect_1[1]*vect_1[1] + vect_1[2]*vect_1[2])*
                                Math.sqrt(vect_2[0]*vect_2[0] + vect_2[1]*vect_2[1] + vect_2[2]*vect_2[2]),
                angle       =   Math.acos(numerator/denominator);
            
            return angle;
        }
    
        function calcMatrix(vector, angle){
            // calculate transformation-matrix from a vector[x,y,z] and an angle
            var x       = vector[0],
                y       = vector[1],
                z       = vector[2],
                sin     = Math.sin(angle),
                cos     = Math.cos(angle),
                cosmin  = 1-cos,
                matrix  = [(cos+x*x*cosmin), (y*x*cosmin+z*sin),(z*x*cosmin-y*sin),0,
                          (x*y*cosmin-z*sin), (cos+y*y*cosmin), (z*y*cosmin+x*sin),0,
                          (x*z*cosmin+y*sin), (y*z*cosmin-x*sin), (cos+z*z*cosmin),0,
                          0,0,0,1];
                                          
            return matrix;
        }
    
        //findPos-script by www.quirksmode.org
        function findPos(obj) {
            var curleft = 0,
                curtop  = 0;
        
            if (obj.offsetParent) {
                do {
                    curleft += obj.offsetLeft;
                    curtop += obj.offsetTop;
                } while (obj = obj.offsetParent);
                
                return [curleft,curtop];
            }
        }
    }
    
    window.Traqball = Traqball;
})();
