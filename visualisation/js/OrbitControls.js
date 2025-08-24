/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */

THREE.OrbitControls = function ( object, domElement ) {

	this.object = object;

	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// Set to false to disable this control
	this.enabled = true;

	// "target" sets the location of focus, where the object orbits around
	this.target = new THREE.Vector3();

	// How far you can dolly in and out ( PerspectiveCamera only )
	this.minDistance = 0;
	this.maxDistance = Infinity;

	// How far you can zoom in and out ( OrthographicCamera only )
	this.minZoom = 0;
	this.maxZoom = Infinity;

	// How far you can orbit vertically, upper and lower limits.
	// Range is 0 to Math.PI radians.
	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	// How far you can orbit horizontally, upper and lower limits.
	// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
	this.minAzimuthAngle = - Infinity; // radians
	this.maxAzimuthAngle = Infinity; // radians

	// Set to true to enable damping (inertia)
	// If damping is enabled, you must call controls.update() in your animation loop
	this.enableDamping = false;
	this.dampingFactor = 0.05;

	// This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
	// Set to false to disable zooming
	this.enableZoom = true;
	this.zoomSpeed = 1.0;

	// Set to false to disable rotating
	this.enableRotate = true;
	this.rotateSpeed = 1.0;

	// Set to false to disable panning
	this.enablePan = true;
	this.panSpeed = 1.0;
	this.screenSpacePanning = true; // if false, pan orthogonal to world-space direction camera.up
	this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

	// Set to true to automatically rotate around the target
	// If auto-rotate is enabled, you must call controls.update() in your animation loop
	this.autoRotate = false;
	this.autoRotateSpeed = 2.0; // 30 seconds per orbit when fps is 60

	// Set to false to disable use of the keys
	this.enableKeys = true;

	// The four arrow keys
	this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

	// Mouse buttons
	this.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

	// for reset
	this.target0 = this.target.clone();
	this.position0 = this.object.position.clone();
	this.zoom0 = this.object.zoom;

	//

	var scope = this;

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start' };
	var endEvent = { type: 'end' };

	var STATE = {
		NONE: - 1,
		ROTATE: 0,
		DOLLY: 1,
		PAN: 2,
		TOUCH_ROTATE: 3,
		TOUCH_DOLLY: 4,
		TOUCH_PAN: 5
	};

	var state = STATE.NONE;

	var EPS = 1e-6;

	// current position in spherical coordinates
	var spherical = new THREE.Spherical();
	var sphericalDelta = new THREE.Spherical();

	var scale = 1;
	var panOffset = new THREE.Vector3();
	var zoomChanged = false;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();

	var dollyStart = new THREE.Vector2();
	var dollyEnd = new THREE.Vector2();
	var dollyDelta = new THREE.Vector2();
    	function getAutoRotationAngle() {
		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
	}

	function getZoomScale() {
		return Math.pow( 0.95, scope.zoomSpeed );
	}

	function rotateLeft( angle ) {
		sphericalDelta.theta -= angle;
	}

	function rotateUp( angle ) {
		sphericalDelta.phi -= angle;
	}

	var panLeft = function () {
		var v = new THREE.Vector3();
		return function panLeft( distance, objectMatrix ) {
			v.setFromMatrixColumn( objectMatrix, 0 ); // get X column of objectMatrix
			v.multiplyScalar( - distance );
			panOffset.add( v );
		};
	}();

	var panUp = function () {
		var v = new THREE.Vector3();
		return function panUp( distance, objectMatrix ) {
			if ( scope.screenSpacePanning === true ) {
				v.setFromMatrixColumn( objectMatrix, 1 );
			} else {
				v.setFromMatrixColumn( objectMatrix, 0 );
				v.crossVectors( scope.object.up, v );
			}
			v.multiplyScalar( distance );
			panOffset.add( v );
		};
	}();

	var pan = function () {
		var offset = new THREE.Vector3();
		return function pan( deltaX, deltaY ) {
			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
			if ( scope.object.isPerspectiveCamera ) {
				var position = scope.object.position;
				offset.copy( position ).sub( scope.target );
				var targetDistance = offset.length();
				targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );
				panLeft( 2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix );
				panUp( 2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix );
			} else if ( scope.object.isOrthographicCamera ) {
				panLeft( deltaX * ( scope.object.right - scope.object.left ) / scope.object.zoom / element.clientWidth, scope.object.matrix );
				panUp( deltaY * ( scope.object.top - scope.object.bottom ) / scope.object.zoom / element.clientHeight, scope.object.matrix );
			} else {
				console.warn( 'WARNING: OrbitControls encountered an unknown camera type - pan disabled.' );
				scope.enablePan = false;
			}
		};
	}();

	function dollyIn( dollyScale ) {
		if ( scope.object.isPerspectiveCamera ) {
			scale /= dollyScale;
		} else if ( scope.object.isOrthographicCamera ) {
			scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
			scope.object.updateProjectionMatrix();
			zoomChanged = true;
		} else {
			console.warn( 'WARNING: OrbitControls encountered an unknown camera type - dolly/zoom disabled.' );
			scope.enableZoom = false;
		}
	}

	function dollyOut( dollyScale ) {
		if ( scope.object.isPerspectiveCamera ) {
			scale *= dollyScale;
		} else if ( scope.object.isOrthographicCamera ) {
			scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom / dollyScale ) );
			scope.object.updateProjectionMatrix();
			zoomChanged = true;
		} else {
			console.warn( 'WARNING: OrbitControls encountered an unknown camera type - dolly/zoom disabled.' );
			scope.enableZoom = false;
		}
	}
    	//
	// Event handlers
	//

	function handleMouseDownRotate( event ) {
		rotateStart.set( event.clientX, event.clientY );
	}

	function handleMouseDownDolly( event ) {
		dollyStart.set( event.clientX, event.clientY );
	}

	function handleMouseDownPan( event ) {
		panStart.set( event.clientX, event.clientY );
	}

	function handleMouseMoveRotate( event ) {
		rotateEnd.set( event.clientX, event.clientY );
		rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );
		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
		rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight ); // note: height, not width!
		rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );
		rotateStart.copy( rotateEnd );
		scope.update();
	}

	function handleMouseMoveDolly( event ) {
		dollyEnd.set( event.clientX, event.clientY );
		dollyDelta.subVectors( dollyEnd, dollyStart );
		if ( dollyDelta.y > 0 ) {
			dollyIn( getZoomScale() );
		} else if ( dollyDelta.y < 0 ) {
			dollyOut( getZoomScale() );
		}
		dollyStart.copy( dollyEnd );
		scope.update();
	}

	function handleMouseMovePan( event ) {
		panEnd.set( event.clientX, event.clientY );
		panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );
		pan( panDelta.x, panDelta.y );
		panStart.copy( panEnd );
		scope.update();
	}

	function handleMouseUp( /*event*/ ) {
		// no-op
	}

	function handleMouseWheel( event ) {
		if ( event.deltaY < 0 ) {
			dollyOut( getZoomScale() );
		} else if ( event.deltaY > 0 ) {
			dollyIn( getZoomScale() );
		}
		scope.update();
	}

	// Touch

	function handleTouchStartRotate( event ) {
		rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
	}

	function handleTouchStartDolly( event ) {
		var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
		var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
		var distance = Math.sqrt( dx * dx + dy * dy );
		dollyStart.set( 0, distance );
	}

	function handleTouchStartPan( event ) {
		panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
	}

	function handleTouchMoveRotate( event ) {
		rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
		rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );
		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
		rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight );
		rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );
		rotateStart.copy( rotateEnd );
		scope.update();
	}

	function handleTouchMoveDolly( event ) {
		var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
		var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
		var distance = Math.sqrt( dx * dx + dy * dy );
		dollyEnd.set( 0, distance );
		dollyDelta.set( 0, Math.pow( dollyEnd.y / dollyStart.y, scope.zoomSpeed ) );
		dollyIn( dollyDelta.y );
		dollyStart.copy( dollyEnd );
		scope.update();
	}

	function handleTouchMovePan( event ) {
		panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
		panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );
		pan( panDelta.x, panDelta.y );
		panStart.copy( panEnd );
		scope.update();
	}

	function handleTouchEnd( /*event*/ ) {
		// no-op
	}

	// Keyboard

	function handleKeyDown( event ) {
		switch ( event.keyCode ) {
			case scope.keys.UP: pan( 0, scope.keyPanSpeed ); scope.update(); break;
			case scope.keys.BOTTOM: pan( 0, - scope.keyPanSpeed ); scope.update(); break;
			case scope.keys.LEFT: pan( scope.keyPanSpeed, 0 ); scope.update(); break;
			case scope.keys.RIGHT: pan( - scope.keyPanSpeed, 0 ); scope.update(); break;
		}
	}

    	//
	// Public API
	//

	this.update = function () {

		var offset = new THREE.Vector3();

		// so camera.up is the orbit axis
		var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
		var quatInverse = quat.clone().invert();

		var lastPosition = new THREE.Vector3();
		var lastQuaternion = new THREE.Quaternion();

		return function update() {
			var position = scope.object.position;
			offset.copy( position ).sub( scope.target );

			// rotate offset to "y-axis-is-up" space
			offset.applyQuaternion( quat );

			// angle from z-axis around y-axis
			spherical.setFromVector3( offset );

			if ( scope.autoRotate && state === STATE.NONE ) {
				rotateLeft( getAutoRotationAngle() );
			}

			spherical.theta += sphericalDelta.theta;
			spherical.phi += sphericalDelta.phi;

			// restrict theta to be between desired limits
			spherical.theta = Math.max( scope.minAzimuthAngle, Math.min( scope.maxAzimuthAngle, spherical.theta ) );

			// restrict phi to be between desired limits
			spherical.phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, spherical.phi ) );

			spherical.makeSafe();

			spherical.radius *= scale;

			// restrict radius to be between desired limits
			spherical.radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, spherical.radius ) );

			// move target to panned location
			scope.target.add( panOffset );

			offset.setFromSpherical( spherical );

			// rotate offset back to "camera-up-is-up" space
			offset.applyQuaternion( quatInverse );

			position.copy( scope.target ).add( offset );

			scope.object.lookAt( scope.target );

			if ( scope.enableDamping === true ) {
				sphericalDelta.theta *= ( 1 - scope.dampingFactor );
				sphericalDelta.phi *= ( 1 - scope.dampingFactor );
				panOffset.multiplyScalar( 1 - scope.dampingFactor );
			} else {
				sphericalDelta.set( 0, 0, 0 );
				panOffset.set( 0, 0, 0 );
			}

			scale = 1;

			// update condition is:
			// min(camera displacement, rotation displacement, zoom changed)
			if ( zoomChanged ||
				lastPosition.distanceToSquared( scope.object.position ) > EPS ||
				8 * ( 1 - lastQuaternion.dot( scope.object.quaternion ) ) > EPS ) {

				scope.dispatchEvent( changeEvent );

				lastPosition.copy( scope.object.position );
				lastQuaternion.copy( scope.object.quaternion );
				zoomChanged = false;

				return true;
			}

			return false;
		};
	}();

	this.dispose = function () {
		scope.domElement.removeEventListener( 'contextmenu', onContextMenu, false );
		scope.domElement.removeEventListener( 'mousedown', onMouseDown, false );
		scope.domElement.removeEventListener( 'wheel', onMouseWheel, false );
		scope.domElement.removeEventListener( 'touchstart', onTouchStart, false );
		scope.domElement.removeEventListener( 'touchend', onTouchEnd, false );
		scope.domElement.removeEventListener( 'touchmove', onTouchMove, false );
		window.removeEventListener( 'keydown', onKeyDown, false );
	};

	this.getPolarAngle = function () {
		return spherical.phi;
	};

	this.getAzimuthalAngle = function () {
		return spherical.theta;
	};

	this.reset = function () {
		scope.target.copy( scope.target0 );
		scope.object.position.copy( scope.position0 );
		scope.object.zoom = scope.zoom0;
		scope.object.updateProjectionMatrix();
		scope.dispatchEvent( changeEvent );
		scope.update();
		state = STATE.NONE;
	};

	//
	// Internals
	//

	function onContextMenu( event ) {
		if ( scope.enabled === false ) return;
		event.preventDefault();
	}

	function onMouseDown( event ) {
		if ( scope.enabled === false ) return;
		event.preventDefault();
		switch ( event.button ) {
			case scope.mouseButtons.LEFT:
				if ( scope.enableRotate === false ) return;
				handleMouseDownRotate( event );
				state = STATE.ROTATE;
				break;
			case scope.mouseButtons.MIDDLE:
				if ( scope.enableZoom === false ) return;
				handleMouseDownDolly( event );
				state = STATE.DOLLY;
				break;
			case scope.mouseButtons.RIGHT:
				if ( scope.enablePan === false ) return;
				handleMouseDownPan( event );
				state = STATE.PAN;
				break;
		}
		if ( state !== STATE.NONE ) {
			scope.domElement.addEventListener( 'mousemove', onMouseMove, false );
			scope.domElement.addEventListener( 'mouseup', onMouseUp, false );
			scope.dispatchEvent( startEvent );
		}
	}

	function onMouseMove( event ) {
		if ( scope.enabled === false ) return;
		event.preventDefault();
		switch ( state ) {
			case STATE.ROTATE: handleMouseMoveRotate( event ); break;
			case STATE.DOLLY: handleMouseMoveDolly( event ); break;
			case STATE.PAN: handleMouseMovePan( event ); break;
		}
	}

	function onMouseUp( event ) {
		scope.domElement.removeEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.removeEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( endEvent );
		state = STATE.NONE;
	}

	function onMouseWheel( event ) {
		if ( scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE ) return;
		event.preventDefault();
		scope.dispatchEvent( startEvent );
		handleMouseWheel( event );
		scope.dispatchEvent( endEvent );
	}

	function onKeyDown( event ) {
		if ( scope.enabled === false || scope.enableKeys === false || scope.enablePan === false ) return;
		handleKeyDown( event );
	}

	function onTouchStart( event ) {
		if ( scope.enabled === false ) return;
		event.preventDefault();
		switch ( event.touches.length ) {
			case 1:
				if ( scope.enableRotate === false ) return;
				handleTouchStartRotate( event );
				state = STATE.TOUCH_ROTATE;
				break;
			case 2:
				if ( scope.enableZoom === false ) return;
				handleTouchStartDolly( event );
				state = STATE.TOUCH_DOLLY;
				break;
			case 3:
				if ( scope.enablePan === false ) return;
				handleTouchStartPan( event );
				state = STATE.TOUCH_PAN;
				break;
			default:
				state = STATE.NONE;
		}
		if ( state !== STATE.NONE ) {
			scope.dispatchEvent( startEvent );
		}
	}

	function onTouchMove( event ) {
		if ( scope.enabled === false ) return;
		event.preventDefault();
		switch ( state ) {
			case STATE.TOUCH_ROTATE: handleTouchMoveRotate( event ); break;
			case STATE.TOUCH_DOLLY: handleTouchMoveDolly( event ); break;
			case STATE.TOUCH_PAN: handleTouchMovePan( event ); break;
			default: state = STATE.NONE;
		}
	}

	function onTouchEnd( event ) {
		if ( scope.enabled === false ) return;
		scope.dispatchEvent( endEvent );
		state = STATE.NONE;
	}

	// Attach event listeners
	this.domElement.addEventListener( 'contextmenu', onContextMenu, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'wheel', onMouseWheel, false );
	this.domElement.addEventListener( 'touchstart', onTouchStart, false );
	this.domElement.addEventListener( 'touchend', onTouchEnd, false );
	this.domElement.addEventListener( 'touchmove', onTouchMove, false );
	window.addEventListener( 'keydown', onKeyDown, false );

	// force an update at start
	this.update();
};

THREE.OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;