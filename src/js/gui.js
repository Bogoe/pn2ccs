/* Copyright (C) 2024-2025 Benjamin Bogø
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

/************************************************************************
 * This file contains a graphical representation of Petri net using     *
 * the underlying dynamic graph representation. This file also contains *
 * methods for controlling user input as well as generating the visual  *
 * presentation on the screen. Note that this file contains a           *
 * re-implementation of the transformation into a 2-τ-synchronisation   *
 * net since the transformation also needs to handle psychical position.*
 ************************************************************************
 * @public are functions that can be called from the outside            *
 ************************************************************************/

/** Graphical representation of a place. */
class GuiPlace extends Place {
	x;
	y;
	element;

	/** @public */
	constructor(id, nameId, tokens, x, y) {
		super(id, nameId, tokens);
		this.element = document.createElementNS("http://www.w3.org/2000/svg", "g");
		this.element.model = this;
		this.element.innerHTML = `
			<circle class="node" cx="0" cy="0" r="30" />
			<text class="attr" x="0" y="15">${this.tokens > 3 ? "⬤x" + this.tokens : "⬤".repeat(this.tokens)}</text>
			<text class="name" x="0" y="-5">${this.getName()}</text>
		`;
		this.setXY(x, y);
	}

	/** @public */
	setTokens(tokens) {
		super.setTokens(tokens);
		if (this.element) {
			this.element.children[1].innerHTML = this.tokens > 3 ? "⬤x" + this.tokens : "⬤".repeat(this.tokens);
		}
	}

	/** @public */
	setXY(x, y) {
		if (!Number.isInteger(x) || !Number.isInteger(y)) {
			throw new TypeError("Coordinates must be integers.");
		}
		this.x = x;
		this.y = y;
		this.element.style.transform = `translate(${x}px, ${y}px)`;
		this.out.forEach(edge => edge.updatePoint(0, x, y));
		this.in.forEach(edge => edge.updatePoint(edge.line.points.length - 1, x, y));
	}

	/** @public */
	setNameId(nameId) {
		super.setNameId(nameId);
		if (this.element) {
			this.element.children[2].innerHTML = this.getName();
		}
	}
}

/** Graphical representation of a transition. */
class GuiTransition extends Transition {
	x;
	y;
	element;

	/** @public */
	constructor(id, nameId, label, x, y) {
		super(id, nameId, label);
		this.element = document.createElementNS("http://www.w3.org/2000/svg", "g");
		this.element.model = this;
		this.element.innerHTML = `
			<rect class="node" x="-35" y="-25" width="70" height="50" />
			<text class="name" x="0" y="-5">${this.getName()}</text>
			<text class="attr" x="0" y="15">${this.label}</text>
		`;
		this.setXY(x, y);
	}

	/** @public */
	setLabel(label) {
		super.setLabel(label);
		if (this.element) {
			this.element.children[2].innerHTML = this.label;
		}
	}

	/** @public */
	setXY(x, y) {
		if (!Number.isInteger(x) || !Number.isInteger(y)) {
			throw new TypeError("Coordinates must be integers.");
		}
		this.x = x;
		this.y = y;
		this.element.style.transform = `translate(${x}px, ${y}px)`;
		this.out.forEach(edge => edge.updatePoint(0, x, y));
		this.in.forEach(edge => edge.updatePoint(edge.line.points.length - 1, x, y));
	}

	/** @public */
	setNameId(nameId) {
		super.setNameId(nameId);
		if (this.element) {
			this.element.children[1].innerHTML = this.getName();
		}
	}
}

/** Graphical representation of a (multi-)edge. */
class GuiEdge extends Edge {
	element;
	line;
	points;

	/** @public */
	constructor(id, from, to, weight, points, isReadOnly) {
		super(id, from, to, weight);
		if (!(from instanceof GuiPlace || from instanceof GuiTransition)) {
			throw new TypeError("From-node must be a gui-place or a gui-transition.");
		}
		if (!(to instanceof GuiPlace || to instanceof GuiTransition)) {
			throw new TypeError("To-node must be a gui-place or a gui-transition.");
		}
		if (!(points instanceof Array) || !points.every(choice => choice instanceof SVGPoint)) {
			throw new TypeError("Points must be given an array of SVG-points.");
		}
		this.element = document.createElementNS("http://www.w3.org/2000/svg", "g");
		this.element.model = this;
		this.element.innerHTML = `
			<polyline class="edge" points="${points.map(point => `${point.x} ${point.y}`).join(" ")}" marker-end="url(#arrow${+isReadOnly})" />
		`;
		this.line = this.element.children[0];
		this.points = Array.from(this.line.points).slice(1, -1).map((point, index) => new GuiEdgePoint(this, point, index + 1));
		this.points.forEach(point => this.element.appendChild(point.element));
		this.updateStartPoint();
		this.updateEndPoint();
	}

	/** @private */
	updateStartPoint() {
		this.line.points[0].x = this.from.x;
		this.line.points[0].y = this.from.y;
		const dx = this.line.points[1].x - this.line.points[0].x;
		const dy = this.line.points[1].y - this.line.points[0].y;
		if (dx === 0 && dy === 0) {
			return;
		}
		if (this.from instanceof GuiPlace) {
			const ratio = 30 / Math.sqrt(dx * dx + dy * dy);
			this.line.points[0].x += dx * ratio;
			this.line.points[0].y += dy * ratio;
		} else {
			this.line.points[0].x += Math.sign(dx) * Math.min(Math.abs(dx / dy) * 25, 35);
			this.line.points[0].y += Math.sign(dy) * Math.min(Math.abs(dy / dx) * 35, 25);
		}
	}

	/** @private */
	updateEndPoint() {
		const n = this.line.points.length;
		this.line.points[n - 1].x = this.to.x;
		this.line.points[n - 1].y = this.to.y;
		const dx = this.line.points[n - 2].x - this.line.points[n - 1].x;
		const dy = this.line.points[n - 2].y - this.line.points[n - 1].y;
		if (dx === 0 && dy === 0) {
			return;
		}
		if (this.to instanceof GuiPlace) {
			const ratio = 30 / Math.sqrt(dx * dx + dy * dy);
			this.line.points[n - 1].x += dx * ratio;
			this.line.points[n - 1].y += dy * ratio;
		} else {
			this.line.points[n - 1].x += Math.sign(dx) * Math.min(Math.abs(dx / dy) * 25, 35);
			this.line.points[n - 1].y += Math.sign(dy) * Math.min(Math.abs(dy / dx) * 35, 25);
		}
	}

	/** @package */
	updatePoint(index, x, y) {
		const n = this.line.points.length;
		if (index < 0 || n - 1 < index) {
			throw new Error("Index out of bounds.");
		}
		this.line.points[index].x = x;
		this.line.points[index].y = y;
		if (index <= 1) {
			this.updateStartPoint();
		}
		if (index >= n - 2) {
			this.updateEndPoint();
		}
	}
}

/** Graphical representation of a point on an multi-edge. */
class GuiEdgePoint {
	edge;
	x;
	y;
	index;
	element;

	/** @public */
	constructor(edge, point, index) {
		if (!(edge instanceof Edge)) {
			throw new TypeError("Edge must be a gui-edge.");
		}
		if (!(point instanceof SVGPoint)) {
			throw new TypeError("Point must be a SVG-point.");
		}
		if (!Number.isInteger(index) || index < 0) {
			throw new TypeError("Index must be a non-negative integer.");
		}
		this.edge = edge;
		this.index = index;
		this.element = document.createElementNS("http://www.w3.org/2000/svg", "g");
		this.element.model = this;
		this.element.innerHTML = `
			<circle class="point" cx="0" cy="0" r="6" />
		`;
		this.setXY(point.x, point.y);
	}

	/** @public */
	setXY(x, y) {
		if (!Number.isInteger(x) || !Number.isInteger(y)) {
			throw new TypeError("Coordinates must be integers.");
		}
		this.x = x;
		this.y = y;
		this.element.style.transform = `translate(${x}px, ${y}px)`;
		this.edge.updatePoint(this.index, x, y);
	}
}

/** Graphical representation of a Petri net with tons of bookkeeping for the current view. */
class GuiPetriNet extends PetriNet {
	gui;
	svg;
	isReadOnly;
	tempEdge;
	arcs;
	nodes;
	viewX = 0;
	viewY = 0;

	selectedElement = null;
	isMoving = false;
	isZooming = false;
	hasMoved = false;
	moveElement = null;
	animationFrame = 0;
	elementX = 0;
	elementY = 0;
	startX = 0;
	startY = 0;
	lastX = 0;
	lastY = 0;
	isBatch = false;

	/** @package */
	constructor(gui, svg, isReadOnly) {
		super();
		if (!(gui instanceof Gui)) {
			throw new Error("Gui must be a Gui.");
		}
		if (!(svg instanceof SVGSVGElement)) {
			throw new Error("Element is not a SVG-element.");
		}
		if (typeof isReadOnly !== "boolean") {
			throw new Error("Read-only flag is not a boolean.");
		}
		this.gui = gui;
		this.svg = svg;
		this.svg.innerHTML = `
			<marker id="arrow${+isReadOnly}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
				<path d="M 0 0 L 10 5 L 0 10 z" />
			</marker>
			<marker id="dot" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="4" markerHeight="4">
				<circle class="point" cx="4" cy="4" r="4" />
			</marker>
			<polyline class="edge" marker-start="url(#dot)" marker-mid="url(#dot)" marker-end="url(#dot)" />
			<g id="arcs"></g>
			<g id="nodes"></g>
		`;
		this.isReadOnly = isReadOnly;
		this.tempEdge = this.svg.children[2];
		this.arcs = this.svg.children[3];
		this.nodes = this.svg.children[4];
		this.svg.addEventListener("dragover", this.onDragOver.bind(this));
		this.svg.addEventListener("drop", this.onDrop.bind(this));
		this.svg.addEventListener("pointerdown", this.onPointerDown.bind(this));
		this.svg.addEventListener("pointermove", this.onPointerMove.bind(this));
		this.svg.addEventListener("pointerup", this.onPointerUp.bind(this));
		this.svg.addEventListener("pointerleave", this.onPointerUp.bind(this));
		this.svg.addEventListener("click", this.onClick.bind(this));
		this.svg.addEventListener("contextmenu", this.onContextMenu.bind(this));
		this.svg.addEventListener("touchstart", this.onTouchStart.bind(this));
		this.svg.addEventListener("touchmove", this.onTouchMove.bind(this));
		this.svg.addEventListener("touchend", this.onTouchEnd.bind(this));
		this.onResize();
	}

	/** @public */
	update() {
		if (!this.isBatch && !this.isReadOnly) {
			this.gui.update();
		}
	}

	/** @public */
	addPlace(nameId, tokens, x, y) {
		if (nameId === Node.AUTO_NAME_ID || this.placeNames[nameId]) {
			nameId = this.placeNames.length;
		}
		const place = new GuiPlace(this.places.length, nameId, tokens, x, y);
		this.places.push(place);
		this.placeNames[nameId] = true;
		this.nodes.appendChild(place.element);
		this.update();
		return place;
	}

	/** @public */
	addTransition(nameId, label, x, y) {
		if (nameId === Node.AUTO_NAME_ID || this.transitionNames[nameId]) {
			nameId = this.transitionNames.length;
		}
		const transition = new GuiTransition(this.transitions.length, nameId, label, x, y);
		this.transitions.push(transition);
		this.transitionNames[nameId] = true;
		this.nodes.appendChild(transition.element);
		this.update();
		return transition;
	}

	/** @public */
	addEdge(from, to, weight, points) {
		if (this.places[from.id] !== from && this.transitions[from.id] !== from) {
			throw new Error("Unrelated from-node cannot be used.");
		}
		if (this.places[to.id] !== to && this.transitions[to.id] !== to) {
			throw new Error("Unrelated to-node cannot be used.");
		}
		const edge = new GuiEdge(this.edges.length, from, to, weight, points, this.isReadOnly);
		this.edges.push(edge);
		this.arcs.appendChild(edge.element);
		this.update();
		return edge;
	}

	/** @public */
	addDirectEdge(from, to, weight) {
		const source = this.svg.createSVGPoint();
		source.x = from.x;
		source.y = from.y;
		const target = this.svg.createSVGPoint();
		target.x = to.x;
		target.y = to.y;
		return this.addEdge(from, to, weight, [source, target]);
	}

	/** @public */
	removePlace(place) {
		if (!(place instanceof GuiPlace)) {
			throw new Error("Cannot remove a non-gui-place.");
		}
		if (this.places[place.id] !== place) {
			throw new Error("Unrelated place cannot be removed.");
		}
		place.in.slice().forEach(edge => this.removeEdge(edge));
		place.out.slice().forEach(edge => this.removeEdge(edge));
		const otherPlace = this.places[this.places.length - 1];
		otherPlace.setId(place.id);
		this.places[place.id] = otherPlace;
		this.places.pop();
		delete this.placeNames[place.nameId];
		this.placeNames.length = this.placeNames.lastIndexOf(true) + 1;
		this.nodes.removeChild(place.element);
		this.update();
	}

	/** @public */
	removeTransition(transition) {
		if (!(transition instanceof GuiTransition)) {
			throw new Error("Cannot remove a non-gui-transition.");
		}
		if (this.transitions[transition.id] !== transition) {
			throw new Error("Unrelated transition cannot be removed.");
		}
		transition.in.slice().forEach(edge => this.removeEdge(edge));
		transition.out.slice().forEach(edge => this.removeEdge(edge));
		const otherTransition = this.transitions[this.transitions.length - 1];
		otherTransition.setId(transition.id);
		this.transitions[transition.id] = otherTransition;
		this.transitions.pop();
		delete this.transitionNames[transition.nameId];
		this.transitionNames.length = this.transitionNames.lastIndexOf(true) + 1;
		this.nodes.removeChild(transition.element);
		this.update();
	}

	/** @public */
	removeEdge(edge) {
		if (!(edge instanceof GuiEdge)) {
			throw new Error("Cannot remove a non-gui-edge.");
		}
		if (this.edges[edge.id] !== edge) {
			throw new Error("Unrelated edge cannot be removed.");
		}
		edge.from.removeEdge(edge);
		edge.to.removeEdge(edge);
		const otherEdge = this.edges[this.edges.length - 1];
		otherEdge.setId(edge.id);
		this.edges[edge.id] = otherEdge;
		this.edges.pop();
		this.arcs.removeChild(edge.element);
		this.update();
	}

	/** @public */
	updatePlace(placeId, nameId, tokens) {
		const place = this.places[placeId];
		if (place === undefined) {
			throw new Error("Unrelated place cannot be updated.");
		}
		delete this.placeNames[place.nameId];
		place.setNameId(nameId);
		place.setTokens(tokens);
		this.placeNames[place.nameId] = true;
		this.placeNames.length = this.placeNames.lastIndexOf(true) + 1;
		this.update();
	}

	/** @public */
	updateTransition(transitionId, nameId, label) {
		const transition = this.transitions[transitionId];
		if (transition === undefined) {
			throw new Error("Unrelated transition cannot be updated.");
		}
		delete this.transitionNames[transition.nameId];
		transition.setNameId(nameId);
		transition.setLabel(label);
		this.transitionNames[transition.nameId] = true;
		this.transitionNames.length = this.transitionNames.lastIndexOf(true) + 1;
		this.update();
	}

	/** @public */
	deletePlace(placeId) {
		this.setSelectedElement(null);
		this.removePlace(this.places[placeId]);
	}

	/** @public */
	deleteTransition(transitionId) {
		this.setSelectedElement(null);
		this.removeTransition(this.transitions[transitionId]);
	}

	/** @public */
	deleteEdge(edgeId) {
		this.setSelectedElement(null);
		this.removeEdge(this.edges[edgeId]);
	}

	/** @public */
	clear() {
		this.isBatch = true;
		this.setSelectedElement(null);
		this.isMoving = false;
		this.isZooming = false;
		this.hasMoved = false;
		this.viewX = 0;
		this.viewY = 0;
		if (this.animationFrame !== 0) {
			window.cancelAnimationFrame(this.animationFrame);
			this.animationFrame = 0;
		}
		this.places = [];
		this.transitions = [];
		this.edges = [];
		this.nodes.innerHTML = "";
		this.arcs.innerHTML = "";
		this.placeNames = [true];
		this.transitionNames = [true];
		this.onResize();
		this.isBatch = false;
		this.update();
	}

	/**
	 * Updates this Petri net to be the 2-τ-synchronisation net obtained by transforming the given Petri net into
	 * a 2-τ-synchronisation net like in PetriNet::to2TauSynchronisationNet, except that this also takes
	 * position information into account. In particular, it makes space between places and transitions that
	 * are affected to be sure that there are no overlapping places and transitions.
	 *
	 * @public
	 * @param {GuiPetriNet} Petri net to transform into a 2-τ-synchronisation net.
	 * @return {boolean} True iff the given Petri net could be encoded into a 2-τ-synchronisation net.
	 * @throws {Error} If the given Petri net is not a 2-τ-synchronisation net or a group-choice net.
	 * */
	update2TauSynchronisationNet(petriNet) {
		if (!this.isReadOnly) {
			throw new Error("Cannot update editable Petri net to a 2-τ-synchronisation.");
		}
		// Clears this Petri net.
		this.clear();
		const is2TauSynchronisationNet = petriNet.is2TauSynchronisationNet();
		if (!is2TauSynchronisationNet && !petriNet.isGroupChoiceNet()) {
			return false;
		}
		// Copy Petri net.
		petriNet.places.forEach(place => this.addPlace(place.nameId, place.tokens, place.x, place.y));
		petriNet.transitions.forEach(transition => this.addTransition(transition.nameId, transition.label, transition.x, transition.y));
		petriNet.places.forEach(place => place.out.forEach(edge => this.addEdge(this.places[edge.from.id], this.transitions[edge.to.id], edge.weight, Array.from(edge.line.points))));
		petriNet.transitions.forEach(transition => transition.out.forEach(edge => this.addEdge(this.transitions[edge.from.id], this.places[edge.to.id], edge.weight, Array.from(edge.line.points))));
		if (is2TauSynchronisationNet) {
			return true;
		}
		this.transitions.forEach(transition => {
			if (transition.in.length <= (transition.label === "τ" ? 2 : 1)) {
				// Already satisfies the 2-τ-synchronisation net constraints.
				return;
			}
			const places = transition.in.map(edge => edge.from);
			const transitions = places[0].out.map(edge => edge.to);
			// Generate the random synchronisation pattern.
			const done = transitions.every(transition => transition.label === "τ") ? 2 : 1;
			const order = [];
			for (let i = places.length - 1; i >= done; i--) {
				const first = Math.floor(i * Math.random());
				const second = Math.floor((i - 1) * Math.random());
				order.push(Math.min(first, second), Math.max(first, second + (first <= second)));
			}
			// Calculate how much space is needed between the places and transitions to fit the chosen synchronisation pattern.
			const layers = [0];
			let lastIndex = 0;
			let numLayers = 1;
			let maxNodes = 1;
			for (let i = 2; i < order.length; i++) {
				for (let j = lastIndex; j < i; j += 2) {
					if (order[i] === order[j]) {
						maxNodes = Math.max(maxNodes, (i - lastIndex) >>> 1);
						lastIndex = i - (i & 1);
						numLayers++;
						break;
					}
				}
				if (i & 1) {
					layers.push(numLayers - 1);
				}
			}
			const totalHeight = 60 * maxNodes;
			const totalWidth = 210 * numLayers + 20;
			const xCut = transitions.reduce((xCut, transition) => Math.min(transition.x, xCut), transitions[0].x);
			const yMid = Math.round(transitions.reduce((ySum, transition) => transition.y + ySum, 0) / transitions.length / 5) * 5 - totalHeight / 2;
			// Move all places and transitions that need to be moved to make space enough.
			this.places.forEach(place => place.setXY(place.x + 70 < xCut ? place.x : place.x + totalWidth, place.y));
			this.transitions.forEach(transition => transition.setXY(transition.x + 75 < xCut ? transition.x : transition.x + totalWidth, transition.y));
			// Remove all outgoing edges from affected places (and ingoing edges from affected transitions).
			places.forEach(place => place.out.slice().forEach(edge => this.removeEdge(edge)));
			// Synchronise places in pairs with positions based on the synchronisation pattern.
			let nodeIndex = 0;
			for (let i = 0; i < order.length; i += 2) {
				if (nodeIndex > 0 && layers[(i - 2) >>> 1] != layers[i >>> 1]) {
					nodeIndex = 0;
				}
				const newTransition = this.addTransition(Node.AUTO_NAME_ID, "τ", xCut + 20 + layers[i >>> 1] * 210, yMid + 30 + nodeIndex * 70);
				const newPlace = this.addPlace(Node.AUTO_NAME_ID, 0, newTransition.x + 105, newTransition.y);
				this.addDirectEdge(places[order[i]], newTransition, 1);
				this.addDirectEdge(places[order[i + 1]], newTransition, 1);
				this.addDirectEdge(newTransition, newPlace, 1);
				places[order[i]] = newPlace;
				places[order[i + 1]] = places[places.length - 1];
				places.pop();
				nodeIndex++;
			}
			// Add the edges from the final place to all transitions.
			places.forEach(place => transitions.forEach(transition => this.addDirectEdge(place, transition, 1)));
		});
		return true;
	}

	/** @public */
	import(text) {
		if (this.isReadOnly) {
			throw new Error("Cannot import in a read-only Petri net.");
		}
		this.clear();
		this.isBatch = true;
		try {
			const parser = new DOMParser();
			let xml;
			try {
				xml = parser.parseFromString(text, "application/xml");
			} catch(error) {
				throw new Error("Invalid XML");
			}
			const nodes = {};
			// Import places.
			xml.querySelectorAll("net>place, page>place").forEach((place, index) => {
				if (!place.id) {
					throw new Error("Place without id.");
				}
				if (nodes[place.id]) {
					throw new Error("Duplicate id.");
				}
				const marking = place.querySelector("initialMarking>text");
				const tokens = marking ? +marking.textContent || 0 : 0;
				const position = place.querySelector("graphics>position");
				const x = position && position.hasAttribute("x") ? Math.round(+position.getAttribute("x") / 10) * 10 || 40 : 40;
				const y = position && position.hasAttribute("y") ? Math.round(+position.getAttribute("y") / 10) * 10 || 40 + 80 * index : 40 + 80 * index;
				const nameId = /^p[1-9]\d*$/.test(place.id) ? +place.id.slice(1) : Node.AUTO_NAME_ID;
				nodes[place.id] = this.addPlace(nameId, tokens, x, y);
			});
			// Import transitions.
			xml.querySelectorAll("net>transition, page>transition").forEach((transition, index) => {
				if (!transition.id) {
					throw new Error("Transition without id.");
				}
				if (nodes[transition.id]) {
					throw new Error("Duplicate id.");
				}
				const name = transition.querySelector("name>text");
				const label = name ? name.textContent.toLowerCase().replace(/[^a-zA-Z0-9τ]+/g, "") || "τ" : "τ";
				const position = transition.querySelector("graphics>position");
				const x = position && position.hasAttribute("x") ? Math.round(+position.getAttribute("x") / 10) * 10 || 200 : 200;
				const y = position && position.hasAttribute("y") ? Math.round(+position.getAttribute("y") / 10) * 10 || 40 + 80 * index : 40 + 80 * index;
				const nameId = /^t[1-9]\d*$/.test(transition.id) ? +transition.id.slice(1) : Node.AUTO_NAME_ID;
				nodes[transition.id] = this.addTransition(nameId, label, x, y);
			});
			// Import edges.
			xml.querySelectorAll("net>arc, page>arc").forEach(edge => {
				const sourceId = edge.getAttribute("source");
				const targetId = edge.getAttribute("target");
				const source = nodes[sourceId];
				const target = nodes[targetId];
				if (!source) {
					throw new Error("Edge with unknown source id.");
				}
				if (!target) {
					throw new Error("Edge with unknown target id.");
				}
				this.addTempPoint(source.x, source.y);
				this.addTempPoint(target.x, target.y);
				this.addEdge(source, target, 1, Array.from(this.tempEdge.points));
				this.tempEdge.points.clear();
			});
			// Center around the first place or transition such that the user can see at least one node.
			const node = this.places[0] || this.transitions[0];
			if (node) {
				this.viewX = node.x - this.svg.clientWidth / 2;
				this.viewY = node.y - this.svg.clientHeight / 2;
			} else {
				this.viewX = 0;
				this.viewY = 0;
			}
			this.onResize();
			this.isBatch = false;
			this.update();
		} catch(error) {
			this.clear();
			throw error;
		}
	}

	/** @public */
	export(name) {
		return `
<pnml xmlns="http://www.pnml.org/version-2009/grammar/pnml">
  <net id="n1" type="http://www.pnml.org/version-2009/grammar/ptnet">
    <name>
     <text>${name}</text>
    </name>
    <page id="top-level">
      ${this.places.map(place => `
      <place id="${place.getName()}">
        <name>
          <text>${place.getName()}</text>
        </name>
        <graphics>
          <position x="${place.x}" y="${place.y}" />
        </graphics>
        <initialMarking>
          <text>${place.tokens}</text>
        </initialMarking>
      </place>
      `).join("")}
      ${this.transitions.map(transition => `
      <transition id="${transition.getName()}">
        <name>
          <text>${transition.label}</text>
        </name>
        <graphics>
          <position x="${transition.x}" y="${transition.y}" />
        </graphics>
      </transition>
      `).join("")}
      ${this.edges.map((edge, index) => `
      <arc id="e${index}" source="${edge.from.getName()}" target="${edge.to.getName()}"></arc>
      `).join("")}
    </page>
  </net>
</pnml>
		`.trim().replace(/\n( +\n)+/g, "\n") + "\n";
	}

	/** @public */
	addTempPoint(x, y) {
		const point = this.svg.createSVGPoint();
		point.x = x;
		point.y = y;
		this.tempEdge.points.appendItem(point);
	}

	/** @package */
	setSelectedElement(element) {
		if (this.selectedElement) {
			this.selectedElement.classList.remove("selected");
			this.tempEdge.points.clear();
		}
		this.selectedElement = element;
		if (this.selectedElement) {
			this.selectedElement.classList.add("selected");
		}
	}

	/** @private */
	onDragOver(event) {
		if (this.isReadOnly) {
			return;
		}
		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";
	}

	/** @private */
	onDrop(event) {
		event.preventDefault();
		const isDrop = event.type === "drop";
		if ((isDrop && event.target !== this.svg) || this.isReadOnly) {
			return;
		}
		const data = event.dataTransfer.getData("text/plain");
		const parts = data.match(/^([pt])(\d+),(\d+)$/);
		if (parts === null) {
			return;
		}
		const isPlace = parts[1] === "p";
		const bounds = this.svg.getBoundingClientRect();
		const areaX = isDrop ? event.offsetX : event.clientX - bounds.x;
		const areaY = isDrop ? event.offsetY : event.clientY - bounds.y;
		const x = Math.round((this.viewX + areaX + (40 - parts[2])) / 10) * 10;
		const y = Math.round((this.viewY + areaY + (40 - parts[3])) / 10) * 10;
		isPlace ? this.addPlace(Node.AUTO_NAME_ID, 0, x, y) : this.addTransition(Node.AUTO_NAME_ID, "τ", x, y);
		this.setSelectedElement(null);
	}

	/** @private */
	onPointerDown(event) {
		if (this.isZooming) {
			return;
		}
		event.preventDefault();
		if (event.pointerType === "mouse" && event.button !== 0) {
			return;
		}
		this.isMoving = true;
		this.hasMoved = false;
		this.startX = this.lastX = event.offsetX;
		this.startY = this.lastY = event.offsetY;
		const target = event.target === this.svg ? this.svg : event.target.parentElement;
		this.moveElement = target === this.selectedElement ? target : null;
		if (!this.moveElement) {
			return;
		}
		if (this.moveElement.model instanceof GuiPlace || this.moveElement.model instanceof GuiTransition || this.moveElement.model instanceof GuiEdgePoint) {
			this.elementX = this.moveElement.model.x;
			this.elementY = this.moveElement.model.y;
			return;
		}
		this.moveElement = null;
	}

	/** @private */
	onPointerMove(event) {
		if (this.isZooming) {
			return;
		}
		event.preventDefault();
		if (!this.isMoving) {
			return;
		}
		this.hasMoved = this.hasMoved || Math.abs(this.startX - event.offsetX) >= 10 || Math.abs(this.startY - event.offsetY) >= 10;
		this.lastX = event.offsetX;
		this.lastY = event.offsetY;
		if (this.hasMoved && this.animationFrame === 0) {
			this.animationFrame = window.requestAnimationFrame(this.onMove.bind(this));
		}
	}

	/** @private */
	onPointerUp(event) {
		if (this.isZooming) {
			return;
		}
		event.preventDefault();
		if (!this.isMoving) {
			return;
		}
		this.isMoving = false;
		this.hasMoved = this.hasMoved || Math.abs(this.startX - event.offsetX) >= 10 || Math.abs(this.startY - event.offsetY) >= 10;
		this.lastX = event.offsetX;
		this.lastY = event.offsetY;
		if (this.animationFrame !== 0) {
			window.cancelAnimationFrame(this.animationFrame);
		}
		this.onMove(0);
		if (this.moveElement === null)  {
			this.viewX -= Math.round(this.lastX - this.startX);
			this.viewY -= Math.round(this.lastY - this.startY);
		}
	}

	/** @private */
	onClick(event) {
		if (this.isZooming) {
			return;
		}
		event.preventDefault();
		if (this.hasMoved) {
			this.hasMoved = false;
			return;
		}
		const target = event.target === this.svg ? this.svg : event.target.parentElement;
		if (target === this.svg) {
			if (this.isReadOnly) {
				this.setSelectedElement(null);
			}
			if (!this.selectedElement) {
				return;
			}
			if (this.selectedElement.model instanceof GuiPlace || this.selectedElement.model instanceof GuiTransition) {
				this.addTempPoint(Math.round((this.viewX + event.offsetX) / 10) * 10, Math.round((this.viewY + event.offsetY) / 10) * 10);
				return;
			}
			this.setSelectedElement(null);
			return;
		}
		const isPlace = target.model instanceof GuiPlace;
		const isTransition = target.model instanceof GuiTransition;
		if (isPlace || isTransition) {
			if (!this.selectedElement) {
				this.setSelectedElement(target);
				this.addTempPoint(target.model.x, target.model.y);
				return;
			}
			if (!this.isReadOnly && this.selectedElement.model instanceof (isPlace ? GuiTransition : GuiPlace)) {
				this.addTempPoint(target.model.x, target.model.y);
				this.addEdge(this.selectedElement.model, target.model, 1, Array.from(this.tempEdge.points));
				this.setSelectedElement(null);
				return;
			}
			if (this.selectedElement === target) {
				this.setSelectedElement(null);
				return;
			}
			this.setSelectedElement(target);
			this.addTempPoint(target.model.x, target.model.y);
			return;
		}
		if (this.isReadOnly) {
			return;
		}
		if (target.model instanceof GuiEdge || target.model instanceof GuiEdgePoint) {
			this.setSelectedElement(this.selectedElement === target ? null : target);
		}
	}

	/** @private */
	onContextMenu(event) {
		if (this.isZooming) {
			return;
		}
		event.preventDefault();
		if (this.hasMoved || this.isReadOnly) {
			this.hasMoved = false;
			return;
		}
		const target = event.target === this.svg ? this.svg : event.target.parentElement;
		if (target === this.svg) {
			this.setSelectedElement(null);
			return;
		}
		if (target.model instanceof GuiPlace) {
			this.gui.editPlace(target.model);
			if (this.selectedElement !== target) {
				this.setSelectedElement(null);
			}
			return;
		}
		if (target.model instanceof GuiTransition) {
			this.gui.editTransition(target.model);
			if (this.selectedElement !== target) {
				this.setSelectedElement(null);
			}
			return;
		}
		if (target.model instanceof GuiEdge) {
			this.gui.editEdge(target.model);
			if (this.selectedElement !== target) {
				this.setSelectedElement(null);
			}
			return;
		}
		if (target.model instanceof GuiEdgePoint) {
			this.gui.editEdge(target.model.edge);
			if (this.selectedElement !== target || this.selectedElement !== target.model.edge.element) {
				this.setSelectedElement(null);
			}
			return;
		}
	}

	/** @private */
	onTouchStart(event) {
		this.isZooming = event.touches.length >= 2;
	}

	/** @private */
	onTouchMove(event) {
		if (!this.isZooming) {
			event.preventDefault();
		}
	}

	/** @private */
	onTouchEnd(event) {
		this.isZooming = event.touches.length >= 2;
	}

	/** @package */
	onResize(event) {
		this.hasMoved = false;
		this.svg.setAttribute("viewBox", `${this.viewX} ${this.viewY} ${this.svg.clientWidth} ${this.svg.clientHeight}`);
	}

	/** @package */
	onKeyDown(event) {
		if (!this.selectedElement || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || this.hasMoved || this.isReadOnly) {
			return;
		}
		if (event.key === "Escape") {
			this.setSelectedElement(null);
		} else if (event.key === "Enter") {
			if (this.selectedElement.model instanceof GuiPlace) {
				this.gui.editPlace(this.selectedElement.model);
			} else if (this.selectedElement.model instanceof GuiTransition) {
				this.gui.editTransition(this.selectedElement.model);
			} else if (this.selectedElement.model instanceof GuiEdge) {
				this.gui.editEdge(this.selectedElement.model);
			} else if (this.selectedElement.model instanceof GuiEdgePoint) {
				this.gui.editEdge(this.selectedElement.model.edge);
			}
		} else if (event.key === "Delete") {
			const model = this.selectedElement.model;
			this.setSelectedElement(null);
			if (model instanceof GuiPlace) {
				this.removePlace(model);
			} else if (model instanceof GuiTransition) {
				this.removeTransition(model);
			} else if (model instanceof GuiEdge) {
				this.removeEdge(model);
			} else if (model instanceof GuiEdgePoint) {
				this.removeEdge(model.edge);
			}
		}
	}

	/** @private */
	onMove(timeStamp) {
		this.animationFrame = 0;
		if (this.moveElement) {
			this.moveElement.model.setXY(
				Math.round((this.elementX + this.lastX - this.startX) / 10) * 10,
				Math.round((this.elementY + this.lastY - this.startY) / 10) * 10
			);
			if (this.moveElement.model instanceof GuiPlace || this.moveElement.model instanceof GuiTransition) {
				this.tempEdge.points[0].x = this.moveElement.model.x;
				this.tempEdge.points[0].y = this.moveElement.model.y;
			}
		} else {
			this.svg.setAttribute("viewBox", `${this.viewX - Math.round(this.lastX - this.startX)} ${this.viewY - Math.round(this.lastY - this.startY)} ${this.svg.clientWidth} ${this.svg.clientHeight}`);
		}
	}
}

/** Graphical representation of the classification figure. */
class GuiClassification {
	container;
	classPetriNet;
	classGroupChoiceNet;
	class2TauSynchronisationNet;
	classCCSNet;
	classFreeChoiceNet;
	classWorkflowNet;
	classFreeChoiceWorkflowNet;

	/** @package */
	constructor(container) {
		if (!(container instanceof SVGSVGElement)) {
			throw new TypeError("The container must be a SVG-element.");
		}
		this.container = container;
		this.container.innerHTML = `
			<g id="classPetriNet">
				<rect x="1" y="1" width="118" height="38" rx="5" fill-opacity="0.7"></rect>
				<text x="114" y="10">Petri net</text>
			</g>
			<g id="classGroupChoiceNet">
				<rect x="3" y="3" width="88" height="24" rx="5" fill-opacity="0.7"></rect>
				<text x="6" y="10">Group-choice net</text>
			</g>
			<g id="class2TauSynchronisationNet">
				<rect x="18" y="19" width="80" height="18" rx="5" fill-opacity="0.7"></rect>
				<text x="57" y="34">2-τ-synchronisation net</text>
			</g>
			<g id="classCCSNet">
				<rect x="28" y="19" width="70" height="12" rx="5" fill-opacity="0.7"></rect>
				<text x="62" y="28">CCS net</text>
			</g>
			<g id="classFreeChoiceNet">
				<rect x="3" y="14" width="84" height="10" rx="5" fill-opacity="0.7"></rect>
				<text x="6" y="20" textLength="26">Free-choice net</text>
			</g>
			<g id="classWorkflowNet">
				<rect x="33" y="14" width="84" height="10" rx="5" fill-opacity="0.7"></rect>
				<text x="114" y="20" textLength="26">Workflow net</text>
			</g>
			<g id="classFreeChoiceWorkflowNet">
				<rect x="33" y="14" width="54" height="10" rx="5" fill-opacity="0.7"></rect>
				<text x="60" y="20" textLength="50">Free-choice workflow net</text>
			</g>
		`;
		this.container.setAttribute("viewBox", "0 0 120 40");
		this.classPetriNet = this.container.children[0];
		this.classGroupChoiceNet = this.container.children[1];
		this.class2TauSynchronisationNet = this.container.children[2];
		this.classCCSNet = this.container.children[3];
		this.classFreeChoiceNet = this.container.children[4];
		this.classWorkflowNet = this.container.children[5];
		this.classFreeChoiceWorkflowNet = this.container.children[6];
	}

	/** @package */
	update(petriNet) {
		const isWorkflowNet = petriNet.isWorkflowNet();
		const isFreeChoiceNet = petriNet.isFreeChoiceNet();
		const isFreeChoiceWorkflowNet = isWorkflowNet && isFreeChoiceNet;
		const isGroupChoiceNet = isFreeChoiceNet || petriNet.isGroupChoiceNet();
		const isCCSNet = petriNet.isCCSNet();
		const is2TauSynchronisationNet = isCCSNet || petriNet.is2TauSynchronisationNet();
		this.classPetriNet.classList.toggle("active", true);
		this.classGroupChoiceNet.classList.toggle("active", isGroupChoiceNet);
		this.class2TauSynchronisationNet.classList.toggle("active", is2TauSynchronisationNet);
		this.classCCSNet.classList.toggle("active", isCCSNet);
		this.classFreeChoiceNet.classList.toggle("active", isFreeChoiceNet);
		this.classWorkflowNet.classList.toggle("active", isWorkflowNet);
		this.classFreeChoiceWorkflowNet.classList.toggle("active", isFreeChoiceWorkflowNet);
	}
}

/** Display of the CCS. */
class GuiCCS {
	output;
	ccs = null;

	/** @package */
	constructor(output) {
		if (!(output instanceof HTMLPreElement)) {
			throw new TypeError("Output must be a html pre-element.");
		}
		this.output = output;
	}

	/** @package */
	update(petriNet) {
		if (petriNet.isGroupChoiceNet()) {
			petriNet = petriNet.to2TauSynchronisationNet();
		} else if (!petriNet.is2TauSynchronisationNet()) {
			this.output.innerHTML = "<i>Petri net cannot be encoded</i>";
			this.ccs = null;
			return false;
		}
		this.ccs = petriNet.toCCS();
		this.output.innerHTML = this.ccs.toHTML();
		return true;
	}

	/** @public */
	export() {
		return this.ccs.toString() + "\n";
	}
}

/** Class for the dialogs shown for warnings and when editing things. */
class GuiDialog {
	gui;
	container;
	title;
	buttonClose;
	content;
	buttons;
	submitFunction;

	/** @package */
	constructor(gui, container) {
		if (!(gui instanceof Gui)) {
			throw new Error("Gui must be a Gui.");
		}
		if (!(container instanceof HTMLFormElement)) {
			throw new TypeError("Dialog container must be a html form-element.");
		}
		this.gui = gui;
		this.container = container;
		this.title = container.querySelector("#dialogTitle");
		this.buttonClose = container.querySelector("#dialogButtonClose");
		this.content = container.querySelector("#dialogContent");
		this.buttons = container.querySelector("#dialogButtons");

		this.buttonClose.addEventListener("click", this.close.bind(this));
	}

	/** @package */
	isVisible() {
		return this.container.classList.contains("grid");
	}

	/** @package */
	onInput(event) {
		const isValid = this.container.checkValidity();
		this.buttons.querySelectorAll("[data-valid]").forEach(e => e.disabled = !isValid);
	}

	/** @package */
	close(event) {
		this.container.removeEventListener("submit", this.submitFunction);
		this.container.classList.remove("grid");
	}

	/** @package */
	openAlert(title, text) {
		this.title.innerText = title;
		this.content.innerText = text;
		this.buttons.innerHTML = `
			<button name="close">Ok</button>
		`;
		this.container.addEventListener("submit", this.submitFunction = this.onSubmitAlert.bind(this));
		this.container.classList.add("grid");
	}

	/** @package */
	onSubmitAlert(event) {
		event.preventDefault();
		this.buttons.querySelectorAll("button").forEach(e => e.disabled = true);
		if (event.submitter.name === "close") {

		} else {
			this.buttons.querySelectorAll("button").forEach(e => e.disabled = false);
			return;
		}
		this.close(event);
	}

	/** @package */
	openReset() {
		this.title.innerText = "Reset";
		this.content.innerHTML = `
			Are you sure that you want to delete the Petri net?
		`;
		this.buttons.innerHTML = `
			<button name="cancel">Cancel</button>
			<button name="delete" class="red">Clear Petri net</button>
		`;
		this.container.addEventListener("submit", this.submitFunction = this.onSubmitReset.bind(this));
		this.container.classList.add("grid");
	}

	/** @private */
	onSubmitReset(event) {
		event.preventDefault();
		this.buttons.querySelectorAll("button").forEach(e => e.disabled = true);
		if (event.submitter.name === "cancel") {

		} else if (event.submitter.name === "delete") {
			this.gui.reset();
		} else {
			this.buttons.querySelectorAll("button").forEach(e => e.disabled = false);
			return;
		}
		this.close(event);
	}

	/** @package */
	openImportPN() {
		this.title.innerText = "Import Petri Net";
		this.content.innerHTML = `
			<label>
				Choose PNML-file for a P/T net:
				<input name="file" type="file" accept=".pnml" required />
			</label>
			<i>WARNING: Importing a Petri net will delete the current Petri net (if any).</i>
		`;
		this.buttons.innerHTML = `
			<button name="import" data-valid disabled>Import Petri net</button>
		`;
		this.container.addEventListener("submit", this.submitFunction = this.onSubmitImportPN.bind(this));
		const fileInput = this.content.querySelector("input[name=\"file\"]");
		fileInput.addEventListener("input", this.onInput.bind(this));
		this.container.classList.add("grid");
		fileInput.focus();
	}

	/** @private */
	async onSubmitImportPN(event) {
		event.preventDefault();
		this.buttons.querySelectorAll("button").forEach(e => e.disabled = true);
		if (event.submitter.name === "import") {
			try {
				this.gui.importPN(await this.container.elements.file.files[0].text());
			} catch(error) {
				this.openAlert("Import Error", error.message);
				return;
			}
		} else {
			this.buttons.querySelectorAll("button").forEach(e => e.disabled = false);
			return;
		}
		this.close(event);
	}

	/** @package */
	openExportPN() {
		this.title.innerText = "Export Petri Net";
		this.content.innerHTML = `
			<label>
				Name of Petri net (characters, digits, dashes and underscores are allowed):
				<input name="name" type="text" pattern="^([a-zA-Z0-9]([a-zA-Z0-9_\\-]*[a-zA-Z0-9])?)$" required placeholder="my-petri-net" />
			</label>
			<i>Note: All points on edges will be lost.</i>
		`;
		this.buttons.innerHTML = `
			<button name="export" data-valid disabled>Export Petri net</button>
		`;
		this.container.addEventListener("submit", this.submitFunction = this.onSubmitExportPN.bind(this));
		const nameInput = this.content.querySelector("input[name=\"name\"]");
		nameInput.addEventListener("input", this.onInput.bind(this));
		this.container.classList.add("grid");
		nameInput.focus();
		nameInput.select();
	}

	/** @private */
	onSubmitExportPN(event) {
		event.preventDefault();
		this.buttons.querySelectorAll("button").forEach(e => e.disabled = true);
		if (event.submitter.name === "export") {
			this.gui.exportPN(this.container.elements.name.value);
		} else {
			this.buttons.querySelectorAll("button").forEach(e => e.disabled = false);
			return;
		}
		this.close(event);
	}

	/** @package */
	openExportCCS() {
		this.title.innerText = "Export CCS";
		this.content.innerHTML = `
			<label>
				Name of Petri net (characters, digits, dashes and underscores are allowed):
				<input name="name" type="text" pattern="^([a-zA-Z0-9]([a-zA-Z0-9_\\-]*[a-zA-Z0-9])?)$" required placeholder="my-petri-net" />
			</label>
		`;
		this.buttons.innerHTML = `
			<button name="export" data-valid disabled>Export CCS</button>
		`;
		this.container.addEventListener("submit", this.submitFunction = this.onSubmitExportCCS.bind(this));
		const nameInput = this.content.querySelector("input[name=\"name\"]");
		nameInput.addEventListener("input", this.onInput.bind(this));
		this.container.classList.add("grid");
		nameInput.focus();
		nameInput.select();
	}

	/** @private */
	onSubmitExportCCS(event) {
		event.preventDefault();
		this.buttons.querySelectorAll("button").forEach(e => e.disabled = true);
		if (event.submitter.name === "export") {
			this.gui.exportCCS(this.container.elements.name.value);
		} else {
			this.buttons.querySelectorAll("button").forEach(e => e.disabled = false);
			return;
		}
		this.close(event);
	}

	/** @package */
	openEditPlace(place) {
		this.title.innerText = "Edit Place";
		this.content.innerHTML = `
			<input type="hidden" name="id" value="${place.id}" />
			<label>
				Change name of ${place.getName()}:
				<input name="name" type="text" pattern="^p[1-9]\\d*$" value="${place.getName()}" placeholder="${place.getName()}" required />
			</label>
			<label>
				Number of tokens for ${place.getName()}:
				<input name="tokens" type="number" min="0" max="99" step="1" value="${place.tokens}" required />
			</label>
		`;
		this.buttons.innerHTML = `
			<button name="edit" data-valid>Update place</button>
			<button name="delete" class="red">Delete place</button>
		`;
		this.container.addEventListener("submit", this.submitFunction = this.onSubmitEditPlace.bind(this));
		const nameInput = this.content.querySelector("input[name=\"name\"]");
		nameInput.addEventListener("input", this.onInput.bind(this));
		this.content.querySelector("input[name=\"tokens\"]").addEventListener("input", this.onInput.bind(this));
		this.container.classList.add("grid");
		nameInput.focus();
		nameInput.select();
	}

	/** @private */
	onSubmitEditPlace(event) {
		event.preventDefault();
		this.buttons.querySelectorAll("button").forEach(e => e.disabled = true);
		if (event.submitter.name === "edit") {
			this.gui.updatePlace(
				+this.container.elements.id.value,
				+this.container.elements.name.value.slice(1),
				+this.container.elements.tokens.value,
			);
		} else if (event.submitter.name === "delete") {
			this.gui.deletePlace(+this.container.elements.id.value);
		} else {
			this.buttons.querySelectorAll("button").forEach(e => e.disabled = false);
			return;
		}
		this.close(event);
	}

	/** @package */
	openEditTransition(transition) {
		this.title.innerText = "Edit Transition";
		this.content.innerHTML = `
			<input type="hidden" name="id" value="${transition.id}" />
			<label>
				Change name of ${transition.getName()}:
				<input name="name" type="text" pattern="^t[1-9]\\d*$" value="${transition.getName()}" placeholder="${transition.getName()}" required />
			</label>
			<label>
				Label for ${transition.getName()} (empty for τ):
				<input name="label" type="text" pattern="^([a-z][a-zA-Z0-9]*|τ?)$" value="${transition.label}" placeholder="τ" />
			</label>
		`;
		this.buttons.innerHTML = `
			<button name="edit" data-valid>Update transition</button>
			<button name="delete" class="red">Delete transition</button>
		`;
		this.container.addEventListener("submit", this.submitFunction = this.onSubmitEditTransition.bind(this));
		const nameInput = this.content.querySelector("input[name=\"name\"]");
		nameInput.addEventListener("input", this.onInput.bind(this));
		this.content.querySelector("input[name=\"label\"]").addEventListener("input", this.onInput.bind(this));
		this.container.classList.add("grid");
		nameInput.focus();
		nameInput.select();
	}

	/** @private */
	onSubmitEditTransition(event) {
		event.preventDefault();
		this.buttons.querySelectorAll("button").forEach(e => e.disabled = true);
		if (event.submitter.name === "edit") {
			this.gui.updateTransition(
				+this.container.elements.id.value,
				+this.container.elements.name.value.slice(1),
				this.container.elements.label.value || "τ",
			);
		} else if (event.submitter.name === "delete") {
			this.gui.deleteTransition(+this.container.elements.id.value);
		} else {
			this.buttons.querySelectorAll("button").forEach(e => e.disabled = false);
			return;
		}
		this.close(event);
	}

	/** @package */
	openEditEdge(edge) {
		this.title.innerText = "Edit Edge";
		this.content.innerHTML = `
			<input type="hidden" name="id" value="${edge.id}" />
			<i>Edge from ${edge.from.getName()} to ${edge.to.getName()} can only be edited by dragging points on the edge (if any).</i>
		`;
		this.buttons.innerHTML = `
			<button name="keep">Keep edge</button>
			<button name="delete" class="red">Delete edge</button>
		`;
		this.container.addEventListener("submit", this.submitFunction = this.onSubmitEditEdge.bind(this));
		this.container.classList.add("grid");
	}

	/** @private */
	onSubmitEditEdge(event) {
		event.preventDefault();
		this.buttons.querySelectorAll("button").forEach(e => e.disabled = true);
		if (event.submitter.name === "keep") {

		} else if (event.submitter.name === "delete") {
			this.gui.deleteEdge(+this.container.elements.id.value);
		} else {
			this.buttons.querySelectorAll("button").forEach(e => e.disabled = false);
			return;
		}
		this.close(event);
	}
}

/** Overall controller class for handling and delegating user input. */
class Gui {
	petriNet;
	petriNet2Tau;
	classification;
	ccs;
	dialog;

	buttonReset;
	buttonImportPN;
	buttonExportPN;
	buttonExportCCS;
	buttonHelp;
	help;
	helpButtonClose;
	noSupport;
	toggleButtons;
	dragPlace;
	dragTransition;
	draggingPlace;
	draggingTransition;
	draggingElement = null;
	draggingX = 0;
	draggingY = 0;
	draggingOffsetX = 0;
	draggingOffsetY = 0;
	animationFrame = 0;

	/** @package */
	constructor() {
		document.querySelector("#noSupport").classList.add("hide");

		this.petriNet = new GuiPetriNet(this, document.querySelector("#pn"), false);
		this.petriNet2Tau = new GuiPetriNet(this, document.querySelector("#pn2tau"), true);
		this.classification = new GuiClassification(document.querySelector("#classes"));
		this.ccs = new GuiCCS(document.querySelector("#ccs"));
		this.dialog = new GuiDialog(this, document.querySelector("#dialog"));

		this.buttonReset = document.querySelector("#buttonReset");
		this.buttonImportPN = document.querySelector("#buttonImportPN");
		this.buttonExportPN = document.querySelector("#buttonExportPN");
		this.buttonExportCCS = document.querySelector("#buttonExportCCS");
		this.buttonHelp = document.querySelector("#buttonHelp");
		this.help = document.querySelector("#help");
		this.helpButtonClose = document.querySelector("#helpButtonClose");
		this.noSupport = document.querySelector("#noSupport");
		this.noSupportButtonClose = document.querySelector("#noSupportButtonClose");
		this.toggleButtons = document.querySelectorAll(".toggle-button");
		this.dragPlace = document.querySelector("#dragPlace");
		this.dragTransition = document.querySelector("#dragTransition");
		this.draggingPlace = document.querySelector("#draggingPlace");
		this.draggingTransition = document.querySelector("#draggingTransition");

		this.buttonReset.addEventListener("click", this.onReset.bind(this));
		this.buttonImportPN.addEventListener("click", this.onImportPN.bind(this));
		this.buttonExportPN.addEventListener("click", this.onExportPN.bind(this));
		this.buttonExportCCS.addEventListener("click", this.onExportCCS.bind(this));
		this.buttonHelp.addEventListener("click", this.onHelp.bind(this));
		this.helpButtonClose.addEventListener("click", this.onCloseHelp.bind(this));
		this.toggleButtons.forEach(button => button.addEventListener("click", this.onToggleClick.bind(this)));
		if (window.matchMedia("(pointer: fine)").matches) {
			this.dragPlace.addEventListener("dragstart", this.onDragStartPlace.bind(this));
			this.dragTransition.addEventListener("dragstart", this.onDragStartTransition.bind(this));
		} else {
			this.dragPlace.addEventListener("pointerdown", this.onPointerDownPlace.bind(this));
			this.dragTransition.addEventListener("pointerdown", this.onPointerDownTransition.bind(this));
			this.dragPlace.addEventListener("touchstart", this.preventDefault.bind(this));
			this.dragTransition.addEventListener("touchstart", this.preventDefault.bind(this));
			document.body.addEventListener("pointerup", this.onPointerUp.bind(this));
			document.body.addEventListener("pointerleave", this.onPointerUp.bind(this));
			document.body.addEventListener("pointermove", this.onPointerMove.bind(this));
		}
		document.body.addEventListener("keydown", this.onKeyDown.bind(this));
		window.addEventListener("resize", this.onResize.bind(this));
		this.update();
	}

	/** @private */
	onReset(event) {
		this.dialog.openReset();
	}

	/** @package */
	reset(event) {
		this.petriNet.clear();
	}

	/** @private */
	onImportPN(event) {
		this.dialog.openImportPN();
	}

	/** @package */
	importPN(text) {
		this.petriNet.import(text);
	}

	/** @private */
	onExportPN(event) {
		this.dialog.openExportPN();
	}

	/** @package */
	exportPN(name) {
		const file = new Blob([this.petriNet.export(name)], {type: "text/plain"});
		const url = window.URL.createObjectURL(file);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", name + ".pnml");
		link.click();
		link.removeAttribute("href");
		link.removeAttribute("download");
		window.URL.revokeObjectURL(url);
	}

	/** @private */
	onExportCCS(event) {
		this.dialog.openExportCCS();
	}

	/** @package */
	exportCCS(name) {
		const file = new Blob([this.ccs.export()], {type: "text/plain"});
		const url = window.URL.createObjectURL(file);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", name + ".ccs");
		link.click();
		link.removeAttribute("href");
		link.removeAttribute("download");
		window.URL.revokeObjectURL(url);
	}

	/** @private */
	onHelp(event) {
		this.help.classList.add("grid");
	}

	/** @private */
	onCloseHelp(event) {
		this.help.classList.remove("grid");
	}

	/** @private */
	onDragStartPlace(event) {
		event.dataTransfer.dropEffect = "copy";
		event.dataTransfer.setData("text/plain", `p${event.offsetX},${event.offsetY}`);
	}

	/** @private */
	onDragStartTransition(event) {
		event.dataTransfer.dropEffect = "copy";
		event.dataTransfer.setData("text/plain", `t${event.offsetX},${event.offsetY}`);
	}

	/** @private */
	onPointerDownPlace(event) {
		event.preventDefault();
		this.draggingOffsetX = Math.round(event.offsetX);
		this.draggingOffsetY = Math.round(event.offsetY);
		this.draggingElement = this.draggingPlace;
		this.draggingPlace.classList.remove("hide");
		this.onPointerMove(event);
	}

	/** @private */
	onPointerDownTransition(event) {
		event.preventDefault();
		this.draggingOffsetX = Math.round(event.offsetX);
		this.draggingOffsetY = Math.round(event.offsetY);
		this.draggingElement = this.draggingTransition;
		this.draggingTransition.classList.remove("hide");
		this.onPointerMove(event);
	}

	/** @private */
	onPointerMove(event) {
		if (!this.draggingElement) {
			return;
		}
		this.draggingX = Math.round(event.clientX);
		this.draggingY = Math.round(event.clientY);
		if (this.animationFrame === 0) {
			this.animationFrame = window.requestAnimationFrame(this.onMove.bind(this));
		}
	}

	/** @private */
	onPointerUp(event) {
		if (!this.draggingElement) {
			return;
		}
		if (document.elementFromPoint(event.clientX, event.clientY) === this.petriNet.svg) {
			event.dataTransfer = new DataTransfer();
			event.dataTransfer.dropEffect = "copy";
			event.dataTransfer.setData("text/plain", `${this.draggingElement === this.draggingPlace ? "p" : "t"}${this.draggingOffsetX},${this.draggingOffsetY}`);
			this.petriNet.onDrop(event);
		}
		this.draggingElement.classList.add("hide");
		this.draggingElement = null;
		if (this.animationFrame !== 0) {
			window.cancelAnimationFrame(this.animationFrame);
			this.animationFrame = 0;
		}
	}

	/** @private */
	onMove(timeStamp) {
		this.animationFrame = 0;
		this.draggingElement.style.left = `${this.draggingX - this.draggingOffsetX}px`;
		this.draggingElement.style.top = `${this.draggingY - this.draggingOffsetY}px`;
	}

	/** @private */
	preventDefault(event) {
		event.preventDefault();
	}

	/** @private */
	onToggleClick(event) {
		const container = event.target.parentElement;
		container.classList.toggle("collapsed");
		this.onResize();
	}

	/** @private */
	onKeyDown(event) {
		if (this.dialog.isVisible()) {
			if (event.key === "Escape") {
				this.dialog.close();
			}
			return;
		}
		this.petriNet.onKeyDown(event);
	}

	/** @private */
	onResize(event) {
		this.petriNet.onResize(event);
		this.petriNet2Tau.onResize(event);
	}

	/** @package */
	update() {
		const isEncodable = this.petriNet2Tau.update2TauSynchronisationNet(this.petriNet);
		this.classification.update(this.petriNet);
		this.buttonExportCCS.disabled = !this.ccs.update(isEncodable ? this.petriNet2Tau : this.petriNet);
	}

	/** @package */
	editPlace(place) {
		this.dialog.openEditPlace(place);
	}

	/** @package */
	updatePlace(placeId, nameId, tokens) {
		this.petriNet.updatePlace(placeId, nameId, tokens);
	}

	/** @package */
	deletePlace(placeId) {
		this.petriNet.deletePlace(placeId);
	}

	/** @package */
	editTransition(transition) {
		this.dialog.openEditTransition(transition);
	}

	/** @package */
	updateTransition(transitionId, nameId, label) {
		this.petriNet.updateTransition(transitionId, nameId, label);
	}

	/** @package */
	deleteTransition(transitionId) {
		this.petriNet.deleteTransition(transitionId);
	}

	/** @package */
	editEdge(edge) {
		this.dialog.openEditEdge(edge);
	}

	/** @package */
	deleteEdge(edgeId) {
		this.petriNet.deleteEdge(edgeId);
	}
}

const gui = new Gui();
