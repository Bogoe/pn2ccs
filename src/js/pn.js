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

/*********************************************************************
 * This file contains a dynamic graph representation of a Petri net. *
 * It contains methods to manipulate the Petri net, classify it and  *
 * transform a Petri net into a 2-τ-synchronisation net and CCS.     *
 *********************************************************************
 * @public are functions that can be called from the outside         *
 *********************************************************************/

/** Base class for all objects needing an ID such as nodes and edges in the Petri net graph. */
class IdObject {
	id;

	/** @protected */
	constructor(id) {
		if (this.constructor === IdObject) {
			throw new Error("IdObject class cannot be instantiated.");
		}
		this.setId(id);
	}

	/** @public */
	setId(id) {
		if (!Number.isInteger(id) || id < 0) {
			throw new Error("Node id must be a non-negative integer.");
		}
		this.id = id;
	}
}

/** Base class for nodes in the graph that contains common methods for places and transitions. */
class Node extends IdObject {
	static AUTO_NAME_ID = 0;
	static ERROR_PT = "Multiple edges are not allowed from places to transitions.";
	static ERROR_TP = "Multiple edges are not supported (but weighted edges are supported) from transitions to places.";
	nameId;
	in = [];
	out = [];

	/** @protected */
	constructor(id, nameId) {
		super(id);
		if (this.constructor === Node) {
			throw new Error("Node class cannot be instantiated.");
		}
		this.setId(id);
		this.setNameId(nameId);
	}

	/** @public */
	setNameId(nameId) {
		if (!Number.isInteger(nameId) && nameId > 0) {
			throw new TypeError("Name id must be a positive integer.");
		}
		this.nameId = nameId;
	}

	/** @package */
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

	/** @package */
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

/** Represents a place in the graph and how many tokens it has. */
class Place extends Node {
	tokens = 0;

	/** @package */
	constructor(id, nameId, tokens) {
		super(id, nameId);
		this.setTokens(tokens);
	}

	/** @public */
	getName() {
		return `p${this.nameId}`;
	}

	/** @public */
	setTokens(tokens) {
		if (!Number.isInteger(tokens) || tokens < 0) {
			throw new Error("Place tokens must be a non-negative integer.");
		}
		this.tokens = tokens;
	}
}

/** Represents a transition in the graph and its action/label. */
class Transition extends Node {
	label;

	/** @package */
	constructor(id, nameId, label) {
		super(id, nameId);
		this.setLabel(label);
	}

	/** @public */
	getName() {
		return `t${this.nameId}`;
	}

	/** @public */
	setLabel(label) {
		if (typeof label !== "string" || !/^([a-z][a-zA-Z0-9]*|τ)$/.test(label)) {
			throw new TypeError("Transition label must be a non-empty string in camelCase or τ.");
		}
		this.label = label;
	}
}

/** Represents a directed edge from a place to a transition or visa versa. */
class Edge extends IdObject {
	from;
	to;
	weight;

	/** @package */
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

	/** @public */
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

/** Class for Petri net with places, transitions and edges that are stored as a dynamic graph. */
class PetriNet {
	places = [];
	transitions = [];
	edges = [];
	placeNames = [true];
	transitionNames = [true];

	/** @public */
	addPlace(nameId, tokens) {
		if (nameId === Node.AUTO_NAME_ID || this.placeNames[nameId]) {
			nameId = this.placeNames.length;
		}
		const place = new Place(this.places.length, nameId, tokens);
		this.places.push(place);
		this.placeNames[nameId] = true;
		return place;
	}

	/** @public */
	addTransition(nameId, label) {
		if (nameId === Node.AUTO_NAME_ID || this.transitionNames[nameId]) {
			nameId = this.transitionNames.length;
		}
		const transition = new Transition(this.transitions.length, nameId, label);
		this.transitions.push(transition);
		this.transitionNames[nameId] = true;
		return transition;
	}

	/** @public */
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

	/** @public */
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

	/** @public */
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

	/** @public */
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

	/**
	 * Runs breadth-first search (BFS) from a given start node to check if all nodes are reachable.
	 *
	 * @private
	 * @param {Node} start      Start node, which must be a place or transition in the Petri net.
	 * @param {boolean} reverse True to run BFS as if all edges was reversed, otherwise the normal direction.
	 * @return {boolean} True iff all nodes in the Petri net was visited.
	 */
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

	/**
	 * Checks if this Petri net is a CCS net meaning that all transitions either have
	 * - exactly one ingoing edge or
	 * - exactly two ingoing edges and the label τ.
	 *
	 * @see Definition 12 in {@link https://doi.org/10.1007/978-3-031-62697-5_3}.
	 * @public
	 * @return {boolean} True iff this Petri net is a CCS net.
	 */
	isCCSNet() {
		return this.transitions.every(transition => transition.in.length === 1 || (transition.in.length === 2 && transition.label === "τ"));
	}

	/**
	 * Checks if this Petri net is a 2-τ-synchronisation net meaning that all transitions either have
	 * - no ingoing edges,
	 * - exactly one ingoing edge or
	 * - exactly two ingoing edges and the label τ.
	 *
	 * @see Definition 13 in {@link https://doi.org/10.1007/978-3-031-62697-5_3}.
	 * @public
	 * @return {boolean} True iff this Petri net is a 2-τ-synchronisation net.
	 */
	is2TauSynchronisationNet() {
		return this.transitions.every(transition => transition.in.length < 2 || (transition.in.length === 2 && transition.label === "τ"));
	}

	/**
	 * Checks if this Petri net is a free-choice net meaning that all transitions either have
	 * - at most one ingoing edge or
	 * - all places with an edge to this transition has exactly one outgoing edge.
	 *
	 * @see Definition 10 in {@link https://doi.org/10.1007/978-3-031-62697-5_3}.
	 * @public
	 * @return {boolean} True iff this Petri net is a free-choice net.
	 */
	isFreeChoiceNet() {
		return this.transitions.every(transition => transition.in.length <= 1 || transition.in.every(edge => edge.from.out.length === 1));
	}

	/**
	 * Checks if this Petri net is a workflow net meaning that
	 * - there is exactly one place with no ingoing edges (the source),
	 * - there is exactly one place with no outgoing edges (the sink) and
	 * - for every place/transition, there exists a path from the source via the place/transition to the sink.
	 * The last condition is the same as checking if every place/transition can be reached from the source and that
	 * the sink is reachable from every place/transition. This can be checked using BFS from the source and sink.
	 *
	 * @see Definition 9 in {@link https://doi.org/10.1007/978-3-031-62697-5_3}.
	 * @public
	 * @return {boolean} True iff this Petri net is a workflow net.
	 */
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

	/**
	 * Checks if this Petri net is a group-choice net meaning that for every place
	 * - then for all the transitions with an ingoing edge from this place, have a same set of places with an ingoing edge.
	 * This method only checks every place once by keeping track of the places that already have been checked.
	 *
	 * @see Definition 15 in {@link https://doi.org/10.1007/978-3-031-62697-5_3}.
	 * @public
	 * @return {boolean} True iff this Petri net is a group-choice net.
	 */
	isGroupChoiceNet() {
		const checked = [];
		return this.places.every(place => {
			if (checked[place.id]) {
				return true;
			}
			// Collect the set of transitions with an ingoing edge from `place`.
			const transitionSet = new Set(place.out.map(edge => edge.to));
			// For every transition in the transition set.
			return place.out.every(edge => {
				const transition = edge.to;
				// For every place with an ingoing edge to `transition`.
				return transition.in.every(edge => {
					const otherPlace = edge.from;
					checked[otherPlace.id] = true;
					// Check that `otherPlace` has the same transition set as `place`.
					return otherPlace.out.length === place.out.length && otherPlace.out.every(edge => transitionSet.has(edge.to));
				});
			});
		});
	}

	/**
	 * Transform this Petri net into a 2-τ-synchronisation net if possible, namely if it already is a
	 * 2-τ-synchronisation net or is a group-choice net that can be transformed.
	 * This method creates a creates a copy of the original Petri net and then transforms that Petri net into a
	 * 2-τ-synchronisation (unless it is already a 2-τ-synchronisation) by:
	 * - keeping transitions with at most one ingoing edge or exactly two ingoing edges and label τ,
	 * - and for every other "group" of places/transitions, remove the edges between them and synchronise the places
	 *   in pairs until one place remains that is connected to all the transitions in the group.
	 *
	 * @see Algorithm 6 in {@link https://doi.org/10.1007/978-3-031-62697-5_3}.
	 * @see Section 2.2/Figure 3-5 in (upcoming paper).
	 * @public
	 * @return {PetriNet} A new Petri net that is a 2-τ-synchronisation net.
	 * @throws {Error} If this Petri net is not a 2-τ-synchronisation net or a group-choice net.
	 */
	to2TauSynchronisationNet() {
		const is2TauSynchronisationNet = this.is2TauSynchronisationNet();
		if (!is2TauSynchronisationNet && !this.isGroupChoiceNet()) {
			throw new Error("Petri net is neither a 2-τ-synchronisation net or group-choice net as required.");
		}
		// Copy Petri net.
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
			// Remove all outgoing edges from affected places and ingoing edges from affected transitions.
			places.forEach(place => place.out = []);
			transitions.forEach(transition => transition.in = []);
			// Synchronise places in pairs based on the synchronisation pattern.
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
			// Add the edges from the final place to all transitions.
			places.forEach(place => transitions.forEach(transition => petriNet.addEdge(place, transition, 1)));
		});
		return petriNet;
	}

	/**
	 * Encode this Petri net, that must be a 2-τ-synchronisation net to CCS by
	 *
	 * @see Algorithm 3 in {@link https://doi.org/10.1007/978-3-031-62697-5_3}.
	 * @see Section 3/Figure 8 in (upcoming paper).
	 * @public
	 * @return {CCS} A CCS process with definitions.
	 * @throws {Error} If this Petri net is not a 2-τ-synchronisation net.
	 */
	toCCS() {
		if (!this.is2TauSynchronisationNet()) {
			throw new Error("Petri net is not a 2-τ-synchronisation net.");
		}
		// Handy function to turn a label into an action.
		const labelToAction = label => label === "τ" ? new InternalAction() : new InputAction(label);
		// Handy function to turn a choice/parallel into inaction (0), the process (1) or choice/parallel (2+).
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
		// Define a process name for each place.
		this.places.forEach(place => placeToProcess[place.id] = new Constant("X_" + place.getName()));
		this.transitions.forEach(transition => {
			const outgoingProcesses = transition.out.map(edge => edge.weight === 1 ? placeToProcess[edge.to.id] : new Exponent(placeToProcess[edge.to.id], edge.weight));
			if (transition.in.length === 0) {
				// Transition with no ingoing edges is encoded into a prefix process executing its action and generating tokens.
				const name = "X_" + transition.getName();
				outgoingProcesses.unshift(new Constant(name));
				// Define process for this transition.
				definitions[name] = new Prefix(labelToAction(transition.label), arrayToProcess(outgoingProcesses, Parallel));
				transitionGeneratorProcesses.push(new Constant(name));
				return;
			}
			if (transition.in.length === 1) {
				// Transition with one ingoing edge is turned into a prefix process executing its action and generating tokens.
				transitionToReplacement[transition.id] = new Prefix(labelToAction(transition.label), arrayToProcess(outgoingProcesses, Parallel));
				return;
			}
			// Transition with two ingoing edges is turned into a prefix process executing a new synchronisation action and generating tokens.
			// Note that both transitions will get the same input action where one of them will be replaced by the co-action later on.
			const name = "s_" + transition.getName();
			transitionToReplacement[transition.id] = new Prefix(new InputAction(name), arrayToProcess(outgoingProcesses, Parallel));
			newActions.push(name);
		});
		this.places.forEach(place => {
			const choices = place.out.map(edge => {
				const replacement = transitionToReplacement[edge.to.id];
				// Replaces the FIRST occurrence of a synchronisation action used by a transition with its co-action followed by inaction.
				if (replacement.action instanceof InputAction && /^s_t\d+$/.test(replacement.action.name)) {
					transitionToReplacement[edge.to.id] = new Prefix(new CoAction(replacement.action.name), new Inaction());
				}
				return replacement;
			});
			// Define the process for this place.
			definitions["X_" + place.getName()] = arrayToProcess(choices, Choice);
		});
		// Generate the parallel composition of one place processes per token and one per transitions with no ingoing edges.
		const placeProcesses = this.places.filter(place => place.tokens).map(place => place.tokens === 1 ? placeToProcess[place.id] : new Exponent(placeToProcess[place.id], place.tokens)).concat(transitionGeneratorProcesses);
		// Add restrictions for all introduced synchronisation actions.
		const initialProcess = newActions.sort().reduce((process, name) => new Restriction(new InputAction(name), process), arrayToProcess(placeProcesses, Parallel));
		return new CCS(definitions, initialProcess);
	}
}
