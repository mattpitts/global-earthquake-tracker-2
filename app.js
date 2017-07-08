document.addEventListener('DOMContentLoaded', () => {


	let scene = new THREE.Scene();
	let WIDTH = window.innerWidth;
	let HEIGHT = window.innerHeight;
	let renderer = new THREE.WebGLRenderer({antialias: true, alpha:true});   //
	renderer.setSize(WIDTH,HEIGHT);
	document.body.appendChild(renderer.domElement);
	let camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 20000)
	camera.position.z = 3;
	let controls = new THREE.OrbitControls(camera, renderer.domElement);

	initResizeListener(renderer, camera);

	addLights(scene);
	let earthMesh = addEarth(scene);
	// let cloudMesh = addClouds1(scene);
	// let cloudMesh2 = addClouds2(scene);
	// addStars(scene);

	initMarkerClickHandler(renderer, camera, scene);
	initSearchButtons(earthMesh);
	initSearchSubmit(earthMesh);


	function animate() {
		// cloudMesh.rotation.y += .0001;
		// cloudMesh.rotation.x += .000001;
		// cloudMesh2.rotation.y += .0002;
		// cloudMesh2.rotation.x += .000002;
		requestAnimationFrame( animate );
		renderer.render( scene, camera );
		controls.update();
	}
	animate();
	getUSGSData(earthMesh);
});

function initMarkerClickHandler(renderer, camera, scene, lastClicked) {
	$('canvas').dblclick( event => {
		event.preventDefault();
		console.log(event.ctrlKey);
		let intersects = getIntersects(event, renderer, camera, scene);
		if (intersects.length) {
			let target;
			for (var i = 0; i < intersects.length; i++) {
				if(intersects[i].object.name !== 'clouds' && intersects[i].object.name !== 'clouds2' && intersects[i].object.name !== 'Earth') {
					if(event.shiftKey) {
						target = findNextIntersect(intersects, i, lastClicked);
					} else if(event.ctrlKey) {
						console.log('ctrlkeydblclick');
						target = findLastIntersect(intersects, i, lastClicked);
					} else {
						target = intersects[i].object;
					}
					i = intersects.length;
					if(target === lastClicked) {
						return;
					}
					target.material.color.b = 1;
					target.material.color.g = 1;
					if(lastClicked) {
						lastClicked.material.color.b = 0;
						lastClicked.material.color.g = 0;
					}
					displayDetails(target.quakeData, event);
					lastClicked = target;
					initModalHider(lastClicked, event);
				}
			}
		}

	});
}

function findNextIntersect(intersects, i, lastClicked) {
	for (var j = i; j < intersects.length; j++) {
		console.log(j);
		if(intersects[j].object == lastClicked && intersects[j+1].object.name === 'marker') {
			return intersects[j+1].object;
		} else if(intersects[j].object == lastClicked && intersects[j+1].object.name === 'Earth')
			return lastClicked;
		else if(j === intersects.length - 1) {
			return intersects[i].object;
		}
	}
}

function findLastIntersect(intersects, i, lastClicked) {
	for (var j = i; j < intersects.length; j++) {
		console.log(j);
		if(intersects[j+1].object == lastClicked && intersects[j].object.name === 'marker') {
			return intersects[j].object;
		} else if(j === intersects.length - 1) {
			console.log('didnt find');
			return intersects[i].object;
		}
	}
}


function initModalHider(lastClicked, event) {
	$(document).mousedown((event) => {
		if(event.shiftKey || event.ctrlKey) { return; }
		if($(event.target).hasClass('details-container')) {
			return;
		} else if($(event.target).parent().hasClass('details-container')) {
			return;
		} else {
			lastClicked.material.color.b = 0;
			lastClicked.material.color.g = 0;
			$('.details-container').remove();
			$(document).off('mousedown');
		}
	});
}


function getIntersects(event, renderer, camera, scene) {
	let raycaster = new THREE.Raycaster();
	let projector = new THREE.Projector();
	let vector = new THREE.Vector3();
	vector.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
	vector.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
	vector.unproject(camera);
	vector.sub(camera.position);
	vector.normalize();
	raycaster.set(camera.position, vector);
	let intersects = raycaster.intersectObjects(scene.children, true);
	return intersects;
}


function displayDetails(quake, event) {
	if($('.details-container')) {
		$('.details-container').remove();
	}
	let detailsContainer = createDetailsHtml(quake);
	$('body').append(detailsContainer);
	let width = $('.details-container').width();
	let height = $('.details-container').height();
	let position = getDetailsPosition(width, height, event);
	detailsContainer.css('left', `${position[0]}px`);
	detailsContainer.css('top', `${position[1]}px`);
	$('.details-container').show();
}

function createDetailsHtml(quake) {
	let time = new Date(quake.properties.time);
	let detailsContainer = $(`<div class='details-container'>`)
		.append($(`<p class='details-title'>${quake.properties.place}</p>`))
		.append($(`<p class='details-details'>${time}</p>`))
		.append($(`<p class='details-details'>Magnitude: ${quake.properties.mag}</p>`))
		.append($(`<p class='details-details'>Depth: ${quake.geometry.coordinates[2]}km</p>`));
	if(quake.properties.mmi) {
		detailsContainer.append($(`<p class='details-details'>MMI: ${quake.properties.mmi}</p>`));
	}
	if(quake.properties.felt) {
		detailsContainer.append($(`<p class='details-details'>Population Affected: ${quake.properties.felt}</p>`));
	}
	return detailsContainer;
}

function getDetailsPosition(width, height, event) {
	let offset = 20
	let x = event.clientX / window.innerWidth;
	let y = event.clientY / window.innerHeight;
	if(x <= .5) {
		x = event.clientX + offset / 2;
	} else {
		x = event.clientX - width - offset * 2;
	}
	if(y <= .5) {
		y = event.clientY + offset / 2;
	} else {
		y = event.clientY - height - offset * 2;
	}
	return [x,y];
}


function addMarker(container, lat, lon, rad, quake) {
	let marker = createNewMarker(rad);
	marker.name = "marker";
	marker.quakeData = quake;
	container.add(marker)
	let xyz = getXYZ(lat, lon, rad);
	marker.position.set(xyz[0], xyz[1], xyz[2]);
}

function createNewMarker(rad) {
	let geometry   = new THREE.SphereGeometry(rad, 16, 16)
	let material  = new THREE.MeshBasicMaterial({
		color: new THREE.Color(0xff0000),
  		opacity     : 0.3,
  		transparent : true,
  		depthWrite  : false,
	});
	return new THREE.Mesh(geometry, material);
}


function getUSGSData(mesh) {
	const URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson';
	const startTime = $('#start-date').val();  //'01/15/2000'
	const endTime = $('#end-date').val(); //'01/15/2015';
	const minMagnitude = $('#min-mag').val(); //'6';
	$.get(`${URL}&starttime=${startTime}&endtime=${endTime}&minmagnitude=${minMagnitude}&limit=800`).then(data => {
		console.log(data.features);
		data.features.forEach(quake => {
			let lon = quake.geometry.coordinates[0];
			let lat = quake.geometry.coordinates[1];
			let rad = (quake.properties.mag - minMagnitude + .2)/40
			// console.log(rad);
			addMarker(mesh, lat, lon, rad, quake);
		})

	}).catch(error => {
		console.log(error);
	});

}


function addLights(scene) {
	let light = new THREE.PointLight(0xeeeebc);
    light.position.set(0,0,100000000000000);
    scene.add(light);

	let lightAmbient = new THREE.AmbientLight( 0x707070 ); // soft white light
	scene.add( lightAmbient );
}


function addEarth(scene) {
	let geometry   = new THREE.SphereGeometry(1, 64, 64)
	let material  = new THREE.MeshPhongMaterial()
	// material.map    = THREE.ImageUtils.loadTexture('textures/earthhires.jpg')
	material.map    = THREE.ImageUtils.loadTexture('textures/earthmap1k.jpg')
	// material.bumpMap    = THREE.ImageUtils.loadTexture('textures/elev_bump_16k.jpg')
	material.bumpMap    = THREE.ImageUtils.loadTexture('textures/earthbump1k.jpg')
	material.bumpScale = 10;

	material.specularMap    = THREE.ImageUtils.loadTexture('textures/earthspec1k.jpg')
	material.specular  = new THREE.Color(0x222222)
	let earthMesh = new THREE.Mesh(geometry, material)
	earthMesh.rotation.y = Math.PI / 2;
	earthMesh.name = "Earth"
	scene.add(earthMesh);
	return earthMesh;
}


function addClouds1(scene) {
	let geometry   = new THREE.SphereGeometry(1.02, 64, 64)
	let material  = new THREE.MeshPhongMaterial({
		alphaMap: THREE.ImageUtils.loadTexture('textures/alphaclouds.jpg'),
  		side        : THREE.DoubleSide,
  		opacity     : 0.1,
  		transparent : true,
  		depthWrite  : false,
	});
	let cloudMesh = new THREE.Mesh(geometry, material);
	cloudMesh.name = 'clouds';
	scene.add(cloudMesh);
	return cloudMesh;
}


function addClouds2(scene) {
	let geometry   = new THREE.SphereGeometry(1.04, 64, 64)
	let material  = new THREE.MeshPhongMaterial({
		alphaMap: THREE.ImageUtils.loadTexture('textures/fair_clouds_8k.jpg'),
  		side        : THREE.DoubleSide,
  		opacity     : 0.2,
  		transparent : true,
  		depthWrite  : false,
	});
	let cloudMesh2 = new THREE.Mesh(geometry, material);
	cloudMesh2.name = 'clouds2';
	scene.add(cloudMesh2);
	return cloudMesh2;
}


function addStars(scene) {
	let geometry   = new THREE.SphereGeometry(6000, 64, 64)
	let material  = new THREE.MeshBasicMaterial({
		map: THREE.ImageUtils.loadTexture('textures/starfield.jpg'),
		side        : THREE.DoubleSide
	});
	var starMesh = new THREE.Mesh(geometry, material)
	scene.add(starMesh)
}


function initResizeListener(renderer, camera) {
	window.addEventListener('resize', () => {
		let newWIDTH = window.innerWidth;
		let newHEIGHT = window.innerHeight;
		renderer.setSize(newWIDTH,newHEIGHT);
		camera.aspect = newWIDTH / newHEIGHT;
		camera.updateProjectionMatrix();
	});
}


function initSearchButtons(mesh, scene, animate) {
	$('.show-search').click(() => {
		$('.search-options-container').show();
		$('.show-search').hide();
		$('.hide-search').show();
	});
	$('.hide-search').click(() => {
		$('.search-options-container').hide();
		$('.show-search').show();
		$('.hide-search').hide();
	})

}


function initSearchSubmit(earthMesh) {
	$('#search-form').submit(event => {
		event.preventDefault();
		for(let i = earthMesh.children.length - 1; i>=0; i--) {
			earthMesh.remove(earthMesh.children[i]);
		}
		$('.hide-search').click();
		getUSGSData(earthMesh);
	});
}


function getXYZ(lat, lon, radius) {
	lon *= -1;
	let cosLat = Math.cos(lat * Math.PI / 180.0);
	let sinLat = Math.sin(lat * Math.PI / 180.0);
	let cosLon = Math.cos(lon * Math.PI / 180.0);
	let sinLon = Math.sin(lon * Math.PI / 180.0);
	let rad = 1 - radius/2;
	let f = 0 / 298.257224;
	let C = 1.0 / Math.sqrt(cosLat * cosLat + (1 - f) * (1 - f) * sinLat * sinLat);
	let S = (1.0 - f) * (1.0 - f) * C;
	let h = 0.0;
	let x = (rad * C + h) * cosLat * cosLon;
	let y = (rad * C + h) * cosLat * sinLon;
	let z = (rad * S + h) * sinLat;
	return [x,z,y];
}
