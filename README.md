# traqball.js: a virtual css3 3d trackball
----------

traqball.js is a small javascript library for CSS3 3D capable browsers. It creates a virtual trackball around a block level element, making it possible to rotate it freely around it's X-, Y- and Z-axis in 3D space without gimbal lock on any axis.

traqball.js will only work in browsers that support the CSS 3D Transforms Module (http://www.w3.org/TR/css3-3d-transforms/). At the time of this writing (Nov. 2011) these are Safari, Chrome and Firefox 10.a. Microsoft and Opera have announced that they will include CSS3 3D support in upcoming versions of their browsers. Traqball.js already generates vendor prefixes for these browsers, and should work for them as soon as CSS3 3D support is included.

## How to include traqball.js:

####1. Include a reference to traqball.js into the head:

``` js
<script type="text/javascript" src="traqball.js"></script>
```

traqball will NOT check if the browser supports CSS 3D transfoms. If you need feature checking, take care of that yourself or use some library like modernizr.

####2. On window load create one or more traqballs:

``` js
var mytraqball = new Traqball(configurationObject);
```

"configurationObject" contains all parameters to configure your traqball. Example:

``` js
{	
	stage:				"stage", 			// id (String) of block element or selected DOM-Element. Default value: <body>
	axis: 				[0.5,1,0.25], 		// X,Y,Z values of initial rotation vector. Array, default value: [1,0,0]
	angle: 				0.12,				// Initial rotation angle in radian. Float, default value: 0.
	perspective: 		perspectiveValue,	// Perspective. Integer, default value 700.
	perspectiveOrigin:	"xVal yVal",		// Perspective Origin. String, default value "50% 50%".
	impulse: 			boolean, 			// Defines if object receives an impulse after relesing mouse/touchend. Default value: true.
	}
```
If a parameter is missing from configurationObject, existing CSS rules will be applied. If no CSS rules exist, default values will kick in.

The most important parameter is "stage". It is a string refering to the id of a block element that is passed to traqball. Traqball will apply the values for "perspective" and "perspective-origin" to this element and then search it for a block-level child element. The first it finds will be made "rotatable". If no id is provided, traqball will search for the first child element within the body tag.

## Deactivating a traqball:

It is possible to deactivate a traqball, to temporarily disable user interaction (i.e. during transitions or animations):

``` js
mytraqball.disable();
```

## Activating traqball

For activating a traqball after deactivation use
``` js
mytraqball.activate();
```

## Updating traqball

In case configuration values must be altered, traqball can be updated with a new configuration object. Values from the previous configuration object will  be kept, unless "newConfigurationObject" contains new parameters.

``` js
mytraqball.setup(newConfigurationObject);
```


## License

traqball.js is is licensed under the terms of the MIT License, see the included MIT-LICENSE file.

More infos and demos on www.eleqtriq.com