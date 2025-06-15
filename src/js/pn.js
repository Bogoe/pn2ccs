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

class IdObject {
	id;

	constructor(id) {
		this.setId(id);
	}

	setId(id) {
		if (!Number.isInteger(id) || id < 0) {
			throw new Error("Node id must be a non-negative integer.");
		}
		this.id = id;
	}
}

class Node extends IdObject {
	static AUTO_NAME_ID = 0;
	static ERROR_PT = "Multiple edges are not allowed from places to transitions.";
	static ERROR_TP = "Multiple edges are not supported (but weighted edges are supported) from transitions to places.";
	nameId;
	in = [];
	out = [];

	constructor(id, nameId) {
		super(id);
		if (this.constructor === Node) {
			throw new Error("Node class cannot be instantiated.");
		}
		this.setId(id);
		this.setNameId(nameId);
	}

	setNameId(nameId) {
		if (!Number.isInteger(nameId) && nameId > 0) {
			throw new TypeError("Name id must be a positive integer.");
		}
		this.nameId = nameId;
	}

	addEdge(edge) {
		if (edge.from === this) {
			if (this.out.some(other => other.to === edge.to)) {
				throw new Error(this instanceof Place ? Node.ERROR_PT : Node.ERROR_TP);
			}
			this.out.push(edge);
			return;
		}
		if (edge.to === this) {
			if (this.in.some(other => other.from === edge.from)) {
				throw new Error(this instanceof Transition ? Node.ERROR_PT : Node.ERROR_TP);
			}
			this.in.push(edge);
			return;
		}
		throw new Error("Unrelated edge cannot be added.");
	}

	removeEdge(edge) {
		if (edge.from === this) {
			const index = this.out.indexOf(edge);
			if (index === -1) {
				throw new Error("Edge could not be found for removal.");
			}
			this.out[index] = this.out[this.out.length - 1];
			this.out.pop();
			return;
		}
		if (edge.to === this) {
			const index = this.in.indexOf(edge);
			if (index === -1) {
				throw new Error("Edge could not be found for removal.");
			}
			this.in[index] = this.in[this.in.length - 1];
			this.in.pop();
			return;
		}
		throw new Error("Unrelated edge cannot be removed.");
	}
}

class Place extends Node {
	tokens = 0;

	constructor(id, nameId, tokens) {
		super(id, nameId);
		this.setTokens(tokens);
	}

	getName() {
		return `p${this.nameId}`;
	}

	setTokens(tokens) {
		if (!Number.isInteger(tokens) || tokens < 0) {
			throw new Error("Place tokens must be a non-negative integer.");
		}
		this.tokens = tokens;
	}
}

class Transition extends Node {
	label;

	constructor(id, nameId, label) {
		super(id, nameId);
		this.setLabel(label);
	}

	getName() {
		return `t${this.nameId}`;
	}

	setLabel(label) {
		if (typeof label !== "string" || !/^([a-z][a-zA-Z0-9]*|τ)$/.test(label)) {
			throw new TypeError("Transition label must be a non-empty string in camelCase or τ.");
		}
		this.label = label;
	}
}

class Edge extends IdObject {
	from;
	to;
	weight;

	constructor(id, from, to, weight) {
		super(id);
		if (!(from instanceof Place || from instanceof Transition)) {
			throw new TypeError("From-node must be a place or a transition.");
		}
		if (!(to instanceof Place || to instanceof Transition)) {
			throw new TypeError("To-node must be a place or a transition.");
		}
		if (from instanceof Place === to instanceof Place) {
			throw new TypeError("Edge must be between a place and a transition.");
		}
		this.from = from;
		this.to = to;
		this.weight = weight;
		from.addEdge(this);
		to.addEdge(this);
	}

	setWeight(weight) {
		if (this.from instanceof Place) {
			throw new Error("Weighted edges are not allowed from places to transitions.");
		}
		if (weight < 1) {
			throw new TypeError("Only positive weights are allowed.");
		}
		this.weight = weight;
	}
}

class PetriNet {
	places = [];
	transitions = [];
	edges = [];
	placeNames = [true];
	transitionNames = [true];

	addPlace(nameId, tokens) {
		if (nameId === Node.AUTO_NAME_ID || this.placeNames[nameId]) {
			nameId = this.placeNames.length;
		}
		const place = new Place(this.places.length, nameId, tokens);
		this.places.push(place);
		this.placeNames[nameId] = true;
		return place;
	}

	addTransition(nameId, label) {
		if (nameId === Node.AUTO_NAME_ID || this.transitionNames[nameId]) {
			nameId = this.transitionNames.length;
		}
		const transition = new Transition(this.transitions.length, nameId, label);
		this.transitions.push(transition);
		this.transitionNames[nameId] = true;
		return transition;
	}

	addEdge(from, to, weight) {
		if (this.places[from.id] !== from && this.transitions[from.id] !== from) {
			throw new Error("Unrelated from-node cannot be used.");
		}
		if (this.places[to.id] !== to && this.transitions[to.id] !== to) {
			throw new Error("Unrelated to-node cannot be used.");
		}
		const edge = new Edge(this.edges.length, from, to, weight);
		this.edges.push(edge);
		return edge;
	}

	removePlace(place) {
		if (!(place instanceof Place)) {
			throw new Error("Cannot remove a non-place.");
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
	}

	removeTransition(transition) {
		if (!(transition instanceof Transition)) {
			throw new Error("Cannot remove a non-transition.");
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
	}

	removeEdge(edge) {
		if (!(edge instanceof Edge)) {
			throw new Error("Cannot remove a non-edge.");
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
	}

	bfs(start, reverse) {
		const visitedPlaces = [];
		const visitedTransitions = [];
		const pending = [start];
		visitedPlaces[start.id] = true;
		while (pending.length) {
			const node = pending.pop();
			const visited = node instanceof Place ? visitedTransitions : visitedPlaces;
			(reverse ? node.in : node.out).forEach(edge => {
				const node = reverse ? edge.from : edge.to;
				if (!visited[node.id]) {
					visited[node.id] = true;
					pending.push(node);
				}
			});
		}
		return this.places.every(place => visitedPlaces[place.id]) && this.transitions.every(transition => visitedTransitions[transition.id]);
	}

	isCCSNet() {
		return this.transitions.every(transition => transition.in.length === 1 || (transition.in.length === 2 && transition.label === "τ"));
	}

	is2TauSynchronisationNet() {
		return this.transitions.every(transition => transition.in.length < 2 || (transition.in.length === 2 && transition.label === "τ"));
	}

	isFreeChoiceNet() {
		return this.transitions.every(transition => transition.in.length <= 1 || transition.in.every(edge => edge.from.out.length === 1));
	}

	isWorkflowNet() {
		const sources = this.places.filter(place => place.in.length === 0);
		if (sources.length !== 1) {
			return false;
		}
		const sinks = this.places.filter(place => place.out.length === 0);
		if (sinks.length !== 1) {
			return false;
		}
		return this.bfs(sources[0], false) && this.bfs(sinks[0], true);
	}

	isGroupChoiceNet() {
		const checked = [];
		return this.places.every(place => {
			if (checked[place.id]) {
				return true;
			}
			const transitionSet = new Set(place.out.map(edge => edge.to));
			return place.out.every(edge => {
				const transition = edge.to;
				return transition.in.every(edge => {
					const otherPlace = edge.from;
					checked[otherPlace.id] = true;
					return otherPlace.out.length === place.out.length && otherPlace.out.every(edge => transitionSet.has(edge.to));
				});
			});
		});
	}

	to2TauSynchronisationNet() {
		const is2TauSynchronisationNet = this.is2TauSynchronisationNet();
		if (!is2TauSynchronisationNet && !this.isGroupChoiceNet()) {
			throw new Error("Petri net is neither a 2-τ-synchronisation net or group-choice net as required.");
		}
		const petriNet = new PetriNet();
		this.places.forEach(place => petriNet.addPlace(place.nameId, place.tokens));
		this.transitions.forEach(transition => petriNet.addTransition(transition.nameId, transition.label));
		this.places.forEach(place => place.out.forEach(edge => petriNet.addEdge(petriNet.places[edge.from.id], petriNet.transitions[edge.to.id], edge.weight)));
		this.transitions.forEach(transition => transition.out.forEach(edge => petriNet.addEdge(petriNet.transitions[edge.from.id], petriNet.places[edge.to.id], edge.weight)));
		if (is2TauSynchronisationNet) {
			return petriNet;
		}
		petriNet.transitions.forEach(transition => {
			if (transition.in.length <= (transition.label === "τ" ? 2 : 1)) {
				return;
			}
			const places = transition.in.map(edge => edge.from);
			const transitions = places[0].out.map(edge => edge.to);
			const done = transitions.every(transition => transition.label === "τ") ? 2 : 1;
			const order = [];
			for (let i = places.length - 1; i >= done; i--) {
				const first = Math.floor(i * Math.random());
				const second = Math.floor((i - 1) * Math.random());
				order.push(Math.min(first, second), Math.max(first, second + (first <= second)));
			}
			places.forEach(place => place.out = []);
			transitions.forEach(transition => transition.in = []);
			for (let i = 0; i < order.length; i += 2) {
				const newTransition = petriNet.addTransition(Node.AUTO_NAME_ID, "τ");
				const newPlace = petriNet.addPlace(Node.AUTO_NAME_ID, 0);
				petriNet.addEdge(places[order[i]], newTransition, 1);
				petriNet.addEdge(places[order[i + 1]], newTransition, 1);
				petriNet.addEdge(newTransition, newPlace, 1);
				places[order[i]] = newPlace;
				places[order[i + 1]] = places[places.length - 1];
				places.pop();
			}
			places.forEach(place => transitions.forEach(transition => petriNet.addEdge(place, transition, 1)));
		});
		return petriNet;
	}

	toCCS() {
		if (!this.is2TauSynchronisationNet()) {
			throw new Error("Petri net is not a 2-τ-synchronisation net.");
		}
		const labelToAction = label => label === "τ" ? new InternalAction() : new InputAction(label);
		const arrayToProcess = (array, classRef) => {
			if (array.length === 0) {
				return new Inaction();
			}
			if (array.length === 1) {
				return array[0];
			}
			return new classRef(array);
		};
		const definitions = {};
		const placeToProcess = [];
		const transitionToReplacement = [];
		const newActions = [];
		const transitionGeneratorProcesses = [];
		this.places.forEach(place => placeToProcess[place.id] = new Constant("X_" + place.getName()));
		this.transitions.forEach(transition => {
			const outgoingProcesses = transition.out.map(edge => edge.weight === 1 ? placeToProcess[edge.to.id] : new Exponent(placeToProcess[edge.to.id], edge.weight));
			if (transition.in.length === 0) {
				const name = "X_" + transition.getName();
				outgoingProcesses.unshift(new Constant(name));
				definitions[name] = new Prefix(labelToAction(transition.label), arrayToProcess(outgoingProcesses, Parallel));
				transitionGeneratorProcesses.push(new Constant(name));
				return;
			}
			if (transition.in.length === 1) {
				transitionToReplacement[transition.id] = new Prefix(labelToAction(transition.label), arrayToProcess(outgoingProcesses, Parallel));
				return;
			}
			const name = "s_" + transition.getName();
			transitionToReplacement[transition.id] = new Prefix(new InputAction(name), arrayToProcess(outgoingProcesses, Parallel));
			newActions.push(name);
		});
		this.places.forEach(place => {
			const choices = place.out.map(edge => {
				const replacement = transitionToReplacement[edge.to.id];
				if (replacement.action instanceof InputAction && /^s_t\d+$/.test(replacement.action.name)) {
					transitionToReplacement[edge.to.id] = new Prefix(new CoAction(replacement.action.name), new Inaction());
				}
				return replacement;
			});
			definitions["X_" + place.getName()] = arrayToProcess(choices, Choice);
		});
		const placeProcesses = this.places.filter(place => place.tokens).map(place => place.tokens === 1 ? placeToProcess[place.id] : new Exponent(placeToProcess[place.id], place.tokens)).concat(transitionGeneratorProcesses);
		const initialProcess = newActions.sort().reduce((process, name) => new Restriction(new InputAction(name), process), arrayToProcess(placeProcesses, Parallel));
		return new CCS(definitions, initialProcess);
	}
}
