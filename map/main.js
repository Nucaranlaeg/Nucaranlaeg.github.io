// Make fade in-out work properly for island locations.

// Ensure clicking on the same location doesn't reopen it.

UserPermission = Permission.PLAYER;

setTimeout(() => {
	mapbox = document.querySelector("#mapbox");
	
	mapbox.addEventListener("click", e => {
		islandNumber = e.target.id;
		if (islandNumber.includes("island")){
			loadIslandInfo(chanceries[islandNumber.replace("island", "")]);
		} else if (islandNumber == "mapbox"){
			setAllIslandsInactive();
			// Unzoom map
			zoommap(0, 0, 1);
			colselect(0);
			document.querySelector("#infobox .info-name").innerHTML = "Supernatet";
			// Clear sidebar.
		} else if (islandNumber.includes("location")){
			loadLocationInfo(alllocations[islandNumber.replace("location", "")]);
		}
	});

	mapbox.click();
}, 20);

function setAllIslandsInactive() {
	document.querySelectorAll(".visible").forEach(node => {
		node.classList.remove("visible");
	});
	document.querySelectorAll(".selected").forEach(node => {
		node.classList.remove("selected");
	});
}

function loadIslandInfo(chancery) {
	setAllIslandsInactive();
	let wholemap = document.querySelector("#wholemap");
	wholemap.parentNode.append(wholemap);
	if (!(chancery.permission & UserPermission)) return;
	colselect(0);
	infobox = document.querySelector("#infobox");
	infobox.querySelector(".info-name").innerHTML = chancery.name;
	innerInfobox = document.querySelector("#inner-infobox");
	infoCol = document.querySelector("#template-chancery").cloneNode(true);
	infoCol.id = "";
	infoCol.querySelector(".info-desc").innerHTML = chancery.description.get_desc(UserPermission);

	peopleDiv = infoCol.querySelector(".info-people-list");
	chancery.people.forEach(person => {
		if (!(person.permission & UserPermission)) return;
		personDiv = document.querySelector("#template-person").cloneNode(true);
		personDiv.id = "person" + person.id;
		personDiv.querySelector(".person-name").innerHTML = person.name;
		personDiv.querySelector(".person-title").innerHTML = person.title;
		personDiv.querySelector(".person-button").addEventListener("click", e => {
			personNumber = e.target.parentNode.id.replace("person", "");
			loadPersonInfo(allpeople[personNumber]);
		});
		peopleDiv.append(personDiv);
	});
	innerInfobox.append(infoCol);
	// Zoom map to correct coordinates.
	zoommap(...chancery.zoomcoords);
	document.querySelector("#inner-infobox").style.left = "0";
	// Stop hover from modifying how the island looks.
	document.querySelector(`#island${chancery.id}`).classList.add("selected");
	// Set island locations to visible by moving the appropriate element to be painted last.
	let locations = document.querySelector(`#i${chancery.id}locations`);
	locations.classList.add("visible");
	locations.parentNode.append(locations);
}

function zoommap(top, left, scale) {
	map = document.querySelector("#mapbox svg");
	map.style.transform = `scale(${scale})`;
	map.style.top = `${top}px`;
	map.style.left = `${left}px`;
	// Transition doesn't work properly with stroke-width.
	// Also, I can't figure out accessing stylesheets with FF to adjust pseudoclasses properly.
	styleEl = document.querySelector("#svg-width-style");
	styleEl.innerHTML = `#mapbox svg{stroke-width:${0.25 / scale}px;}path:hover:not(.selected){stroke-width:${0.75 / scale}px;}`;
}

function loadPersonInfo(person) {
	innerInfobox = document.querySelector("#inner-infobox");
	peoplebox = document.querySelector("#template-people").cloneNode(true);
	peoplebox.id = "";
	peoplebox.querySelector(".info-people-title").innerHTML = person.title;
	peoplebox.querySelector(".info-people-name").innerHTML = person.name;
	peoplebox.querySelector(".info-people-desc").innerHTML = person.description.get_desc(UserPermission);

	itemsDiv = peoplebox.querySelector(".info-items-list");
	person.items.forEach(item => {
		if (!(item[1] & UserPermission)) return;
		itemDiv = document.querySelector("#template-item").cloneNode(true);
		itemDiv.id = "item" + item[0].id;
		itemDiv.querySelector(".item-name").innerHTML = item[0].name;
		itemDiv.querySelector(".item-price").innerHTML = item[0].price;
		itemDiv.querySelector(".item-button").addEventListener("click", e => {
			itemNumber = e.target.parentNode.id.replace("item", "");
			loadItemInfo(allitems[itemNumber]);
		});
		itemsDiv.append(itemDiv);
	});
	innerInfobox.append(peoplebox);
	colselect(1);
}

function loadItemInfo(item) {
	innerInfobox = document.querySelector("#inner-infobox");
	itembox = document.querySelector("#template-items").cloneNode(true);
	itembox.querySelector(".info-items-name").innerHTML = item.name;
	itembox.querySelector(".info-items-desc").innerHTML = item.description.get_desc(UserPermission);
	innerInfobox.append(itembox);
	colselect(1);
}

function loadLocationInfo(location) {
	innerInfobox = document.querySelector("#inner-infobox");
	locationbox = document.querySelector("#template-location").cloneNode(true);
	locationbox.querySelector(".info-name").innerHTML = location.name;
	locationbox.querySelector(".info-desc").innerHTML = location.description.get_desc(UserPermission);
	innerInfobox.append(locationbox);
	
	peopleDiv = locationbox.querySelector(".info-people-list");
	location.people.forEach(person => {
		if (!(person.permission & UserPermission)) return;
		personDiv = document.querySelector("#template-person").cloneNode(true);
		personDiv.id = "person" + person.id;
		personDiv.querySelector(".person-name").innerHTML = person.name;
		personDiv.querySelector(".person-title").innerHTML = person.title;
		personDiv.querySelector(".person-button").addEventListener("click", e => {
			personNumber = e.target.parentNode.id.replace("person", "");
			loadPersonInfo(allpeople[personNumber]);
		});
		peopleDiv.append(personDiv);
	});

	itemsDiv = locationbox.querySelector(".info-items-list");
	location.items.forEach(item => {
		if (!(item[1] & UserPermission)) return;
		itemDiv = document.querySelector("#template-item").cloneNode(true);
		itemDiv.id = "item" + item[0].id;
		itemDiv.querySelector(".item-name").innerHTML = item[0].name;
		itemDiv.querySelector(".item-price").innerHTML = item[0].price;
		itemDiv.querySelector(".item-button").addEventListener("click", e => {
			itemNumber = e.target.parentNode.id.replace("item", "");
			loadItemInfo(allitems[itemNumber]);
		});
		itemsDiv.append(itemDiv);
	});
	colselect(1);
}

function colselect(column){
	infoboxDiv = document.querySelector("#inner-infobox");
	transitionTime = 300;
	if (column === 0){
		document.querySelector("#inner-infobox").style.left = "0";
		while (infoboxDiv.firstChild){
			infoboxDiv.removeChild(infoboxDiv.firstChild);
		}
		setTimeout(() => {
			infoboxDiv.style.width = "101%";
		}, transitionTime);
	} else if (column === 1){
		left = infoboxDiv.style.left;
		left = +left.replace("px", "").replace("%", "") - 100;
		infoboxDiv.style.left = left + "%";
		width = infoboxDiv.style.width;
		width = +width.replace("%", "") + 100;
		infoboxDiv.style.width = width + "%";
	} else { // -1
		if (infoboxDiv.lastChild){
			node = infoboxDiv.lastChild;
			setTimeout(() => {
				infoboxDiv.removeChild(node);
			}, transitionTime);
		}
		left = infoboxDiv.style.left;
		left = +left.slice(0, 4) + 100;
		infoboxDiv.style.left = left + "%";
		setTimeout(() => {
			width = infoboxDiv.style.width;
			width = +width.replace("%", "") - 100;
			infoboxDiv.style.width = width + "%";
		}, transitionTime);
	}
}

function clean(node) {
	for(let n = 0; n < node.childNodes.length; n++) {
		let child = node.childNodes[n];
		if (child.nodeType === 8 || (child.nodeType === 3 && !/\S/.test(child.nodeValue))) {
			node.removeChild(child);
			n--;
		} else if(child.nodeType === 1) {
			clean(child);
		}
	}
}

function selectByName(type, name) {
	let [list, viewFunc] = {
		"Chancery": [chanceries, loadIslandInfo],
		"Location": [alllocations, loadLocationInfo],
		"Person": [allpeople, loadPersonInfo],
		"Item": [allitems, loadItemInfo],
	}[type];
	viewFunc(list.find(x => x.name.includes(name)));
}

setTimeout(() => {
	document.querySelectorAll("#templates .list-item").forEach(node => {
		clean(node);
	});
}, 0);
