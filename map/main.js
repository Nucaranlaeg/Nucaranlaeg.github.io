UserPermission = Permission.PLAYER;

setTimeout(() => {
	mapbox = document.querySelector("#mapbox");
	
	mapbox.addEventListener("click", e => {
		islandNumber = e.target.id;
		if (islandNumber.includes("island")){
			setAllIslandsInactive();
			loadIslandInfo(chanceries[islandNumber.replace("island", "")]);
		} else if (islandNumber == "mapbox"){
			setAllIslandsInactive();
			// Unzoom map
			map = document.querySelector("#mapbox svg");
			map.style.top = `0px`;
			map.style.left = `0px`;
			map.style.transform = `scale(1)`;
			// Clear sidebar.
		} else if (islandNumber.includes("location")){
			loadLocationInfo(alllocations[islandNumber.replace("location", "")]);
		}
	});
}, 0);

function setAllIslandsInactive() {
	document.querySelectorAll(".visible").forEach(node => {
		node.classList.remove("visible");
	});
	document.querySelectorAll(".selected").forEach(node => {
		node.classList.remove("selected");
	});
}

function loadIslandInfo(chancery) {
	if (!(chancery.permission & UserPermission)) return;
	colselect(0)
	infobox = document.querySelector("#infobox");
	infobox.classList.add("active");
	infobox.querySelector(".info-name").innerHTML = chancery.name;
	innerInfobox = document.querySelector("#inner-infobox");
	infoCol = document.querySelector("#template-chancery").cloneNode(true);
	infoCol.id = "";
	infoCol.querySelector(".info-desc").innerHTML = chancery.description + (Permission.DM & UserPermission ? chancery.DMdesc : "");

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
	map = document.querySelector("#mapbox svg");
	map.style.top = `${chancery.zoomcoords[0]}px`;
	map.style.left = `${chancery.zoomcoords[1]}px`;
	map.style.transform = `scale(${chancery.zoomcoords[2]})`;
	document.querySelector("#inner-infobox").style.left = "0";
	// Stop hover from modifying how the island looks.
	document.querySelector(`#island${chancery.id}`).classList.add("selected");
	// Set island locations to visible.
	document.querySelector(`#i${chancery.id}locations`).classList.add("visible");
}

function loadPersonInfo(person) {
	innerInfobox = document.querySelector("#inner-infobox");
	peoplebox = document.querySelector("#template-people").cloneNode(true);
	peoplebox.id = "";
	peoplebox.querySelector(".info-people-title").innerHTML = person.title;
	peoplebox.querySelector(".info-people-name").innerHTML = person.name;
	peoplebox.querySelector(".info-people-desc").innerHTML = person.description;

	itemsDiv = peoplebox.querySelector(".info-items-list");
	person.items.forEach(item => {
		if (!(item.permission & UserPermission)) return;
		itemDiv = document.querySelector("#template-item").cloneNode(true);
		itemDiv.id = "item" + item.id;
		itemDiv.querySelector(".item-name").innerHTML = item.name;
		itemDiv.querySelector(".item-price").innerHTML = item.price;
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
	itembox.querySelector(".info-items-desc").innerHTML = item.description;
	innerInfobox.append(itembox);
	colselect(1);
}

function loadLocationInfo(location) {
	innerInfobox = document.querySelector("#inner-infobox");
	locationbox = document.querySelector("#template-location").cloneNode(true);
	locationbox.querySelector(".info-name").innerHTML = location.name;
	locationbox.querySelector(".info-desc").innerHTML = location.description;
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
		if (!(item.permission & UserPermission)) return;
		itemDiv = document.querySelector("#template-item").cloneNode(true);
		itemDiv.id = "item" + item.id;
		itemDiv.querySelector(".item-name").innerHTML = item.name;
		itemDiv.querySelector(".item-price").innerHTML = item.price;
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
		infoboxDiv.childNodes.forEach(node => {
			setTimeout(() => {
				infoboxDiv.removeChild(node);
			}, transitionTime);
		});
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

setTimeout(() => {
	document.querySelectorAll("#templates .list-item").forEach(node => {
		clean(node);
	});
}, 0);