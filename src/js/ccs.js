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

/**********************************************************************
 * This file contains an abstract syntax tree (AST) representation of *
 * CCS processes with functions to print it as a string and HTML.     *
 **********************************************************************
 * @public are functions that can be called from the outside          *
 **********************************************************************/

/** Abstract class for actions. */
class Action {

	/** @protected */
	constructor() {
		if (this.constructor === Action) {
			throw new Error("Action class cannot be instantiated.");
		}
	}
}

/** Input action. */
class InputAction extends Action {
	name;

	/** @public */
	constructor(name) {
		super();
		if (typeof name !== "string" || !/^[a-z][a-zA-Z0-9_]*$/.test(name)) {
			throw new TypeError("Action name must be a non-empty string in camelCase.");
		}
		this.name = name;
	}

	/** @public */
	toString() {
		return this.name + "?";
	}

	/** @public */
	toHTML() {
		return this.name.replace(/_(t\d+)$/, "<sub>$1</sub>");
	}
}

/** Complementary (output) action to the input action. */
class CoAction extends Action {
	name;

	/** @public */
	constructor(name) {
		super();
		if (typeof name !== "string" || !/^[a-z][a-zA-Z0-9_]*$/.test(name)) {
			throw new TypeError("Action name must be a string in camelCase.");
		}
		this.name = name;
	}

	/** @public */
	toString() {
		return this.name + "!";
	}

	/** @public */
	toHTML() {
		return "<span class=\"overline\">" + this.name.replace(/_(t\d+)$/, "<sub>$1</sub>") + "</span>";
	}
}

/** Internal (invisible action). */
class InternalAction extends Action {

	/** @public */
	toString() {
		return "τ";
	}

	/** @public */
	toHTML() {
		return "τ";
	}
}

/** Abstract class for processes. */
class Process {

	/** @protected */
	constructor() {
		if (this.constructor === Process) {
			throw new Error("Process class cannot be instantiated.");
		}
	}
}

/** Abstract class for sequential processes. */
class Sequential extends Process {

	/** @protected */
	constructor() {
		super();
		if (this.constructor === Sequential) {
			throw new Error("Sequential class cannot be instantiated.");
		}
	}
}

/** A process that does nothing. */
class Inaction extends Sequential {

	/** @public */
	toString() {
		return "0";
	}

	/** @public */
	toHTML() {
		return "<b>0</b>";
	}
}

/** Prefix action that executes an action and the continues as another process. */
class Prefix extends Sequential {
	action;
	process;

	/** @public */
	constructor(action, process) {
		super();
		if (!(action instanceof Action)) {
			throw new TypeError("Prefix action must be an action.");
		}
		if (!(process instanceof Process)) {
			throw new TypeError("Prefix process must be a process.");
		}
		this.action = action;
		this.process = process;
	}

	/** @public */
	toString() {
		return this.action.toString() + "." + this.process.toString();
	}

	/** @public */
	toHTML() {
		return this.action.toHTML() + "." + this.process.toHTML();
	}
}

/** Choice of prefix actions that executes exactly one of the prefix actions and discards the rest. */
class Choice extends Sequential {
	choices;

	/** @public */
	constructor(choices) {
		super();
		if (!(choices instanceof Array) || choices.length < 2 || !choices.every(choice => choice instanceof Prefix)) {
			throw new TypeError("Choices must be given an array of prefixes of length at least two.");
		}
		this.choices = choices;
	}

	/** @public */
	toString() {
		return "(" + this.choices.map(choice => choice.toString()).join(" + ") + ")";
	}

	/** @public */
	toHTML() {
		return "(" + this.choices.map(choice => choice.toHTML()).join(" + ") + ")";
	}
}

/** Parallel composition of processes. */
class Parallel extends Process {
	processes;

	/** @public */
	constructor(processes) {
		super();
		if (!(processes instanceof Array) || processes.length < 2 || !processes.every(process => process instanceof Process)) {
			throw new TypeError("Parallel processes must be given an array of processes of length at least two.");
		}
		this.processes = processes;
	}

	/** @public */
	toString() {
		return "(" + this.processes.map(process => process.toString()).join(" | ") + ")";
	}

	/** @public */
	toHTML() {
		return "(" + this.processes.map(process => process.toHTML()).join(" | ") + ")";
	}
}

/** A short hand for the parallel composition of the same process a given number of times. */
class Exponent extends Process {
	process;
	count;

	/** @public */
	constructor(process, count) {
		super();
		if (!(process instanceof Process)) {
			throw new TypeError("Exponent process must be a process.");
		}
		if (!Number.isInteger(count) || count < 0) {
			throw new TypeError("Exponent must be a non-negative integer.");
		}
		this.process = process;
		this.count = count;
	}

	/** @public */
	toString() {
		return this.process.toString() + "^" + this.count;
	}

	/** @public */
	toHTML() {
		return this.process.toHTML() + "<sup>" + this.count + "</sup>";
	}
}

/** Restricts an input action and its co-action such that they can only execute by synchronising. */
class Restriction extends Process {
	action;
	process;

	/** @public */
	constructor(action, process) {
		super();
		if (!(action instanceof InputAction)) {
			throw new TypeError("Restriction action must be an (input) action.");
		}
		if (!(process instanceof Process)) {
			throw new TypeError("Restriction process must be a process.");
		}
		this.action = action;
		this.process = process;
	}

	/** @public */
	toString() {
		return "(ν" + this.action.toString() + ")" + this.process.toString();
	}

	/** @public */
	toHTML() {
		return "(ν" + this.action.toHTML() + ")" + this.process.toHTML();
	}
}

/** A constant process that is defined by a name. */
class Constant extends Process {
	name;

	/** @public */
	constructor(name) {
		super();
		if (typeof name !== "string" || !/^[A-Z][a-zA-Z0-9_]*$/.test(name)) {
			throw new TypeError("Constant name must be a string in PascalCase.");
		}
		this.name = name;
	}

	/** @public */
	toString() {
		return this.name;
	}

	/** @public */
	toHTML() {
		return this.name.replace(/_([pt]\d+)$/, "<sub>$1</sub>");
	}
}

/** A CCS process including definitions of constant processes. */
class CCS {
	definitions;
	process;

	/** @public */
	constructor(definitions, process) {
		const names = Object.keys(definitions);
		const invalidNames = names.filter(name => !/^[A-Z][a-zA-Z0-9_]*$/.test(name));
		if (invalidNames.length) {
			throw new TypeError("The following definition names are not in PascalCase: " + invalidNames.join(", ") + ".");
		}
		const invalidDefinitions = names.filter(name => !(definitions[name] instanceof Process));
		if (invalidDefinitions.length) {
			throw new TypeError("The following definitions are not processes: " + invalidDefinitions.join(", ") + ".");
		}
		if (!(process instanceof Process)) {
			throw new TypeError("Initial process must be a process.");
		}
		this.definitions = definitions;
		this.process = process;
	}

	/** @public */
	toString() {
		return Object.keys(this.definitions).map(name => name + " := " + this.definitions[name].toString()).join("\n") + "\n\n" + this.process.toString();
	}

	/** @public */
	toHTML() {
		return Object.keys(this.definitions).map(name => name.replace(/_([pt]\d+)$/, "<sub>$1</sub>") + " := " + this.definitions[name].toHTML()).join("<br>") + "<br><br>" + this.process.toHTML();
	}
}
