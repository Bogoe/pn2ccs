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

class Action {

	constructor() {
		if (this.constructor === Action) {
			throw new Error("Action class cannot be instantiated.");
		}
	}
}

class InputAction extends Action {
	name;

	constructor(name) {
		super();
		if (typeof name !== "string" || !/^[a-z][a-zA-Z0-9_]*$/.test(name)) {
			throw new TypeError("Action name must be a non-empty string in camelCase.");
		}
		this.name = name;
	}

	toString() {
		return this.name + "?";
	}

	toHTML() {
		return this.name.replace(/_(t\d+)$/, "<sub>$1</sub>");
	}
}

class CoAction extends Action {
	name;

	constructor(name) {
		super();
		if (typeof name !== "string" || !/^[a-z][a-zA-Z0-9_]*$/.test(name)) {
			throw new TypeError("Action name must be a string in camelCase.");
		}
		this.name = name;
	}

	toString() {
		return this.name + "!";
	}

	toHTML() {
		return "<span class=\"overline\">" + this.name.replace(/_(t\d+)$/, "<sub>$1</sub>") + "</span>";
	}
}

class InternalAction extends Action {

	toString() {
		return "τ";
	}

	toHTML() {
		return "τ";
	}
}

class Process {

	constructor() {
		if (this.constructor === Process) {
			throw new Error("Process class cannot be instantiated.");
		}
	}
}

class Sequential extends Process {

	constructor() {
		super();
		if (this.constructor === Sequential) {
			throw new Error("Sequential class cannot be instantiated.");
		}
	}
}

class Inaction extends Sequential {

	toString() {
		return "0";
	}

	toHTML() {
		return "<b>0</b>";
	}
}

class Prefix extends Sequential {
	action;
	process;

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

	toString() {
		return this.action.toString() + "." + this.process.toString();
	}

	toHTML() {
		return this.action.toHTML() + "." + this.process.toHTML();
	}
}

class Choice extends Sequential {
	choices;

	constructor(choices) {
		super();
		if (!(choices instanceof Array) || choices.length < 2 || !choices.every(choice => choice instanceof Prefix)) {
			throw new TypeError("Choices must be given an array of prefixes of length at least two.");
		}
		this.choices = choices;
	}

	toString() {
		return "(" + this.choices.map(choice => choice.toString()).join(" + ") + ")";
	}

	toHTML() {
		return "(" + this.choices.map(choice => choice.toHTML()).join(" + ") + ")";
	}
}

class Parallel extends Process {
	processes;

	constructor(processes) {
		super();
		if (!(processes instanceof Array) || processes.length < 2 || !processes.every(process => process instanceof Process)) {
			throw new TypeError("Parallel processes must be given an array of processes of length at least two.");
		}
		this.processes = processes;
	}

	toString() {
		return "(" + this.processes.map(process => process.toString()).join(" | ") + ")";
	}

	toHTML() {
		return "(" + this.processes.map(process => process.toHTML()).join(" | ") + ")";
	}
}

class Exponent extends Process {
	process;
	count;

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

	toString() {
		return this.process.toString() + "^" + this.count;
	}

	toHTML() {
		return this.process.toHTML() + "<sup>" + this.count + "</sup>";
	}
}

class Restriction extends Process {
	action;
	process;

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

	toString() {
		return "(ν" + this.action.toString() + ")" + this.process.toString();
	}

	toHTML() {
		return "(ν" + this.action.toHTML() + ")" + this.process.toHTML();
	}
}

class Constant extends Process {
	name;

	constructor(name) {
		super();
		if (typeof name !== "string" || !/^[A-Z][a-zA-Z0-9_]*$/.test(name)) {
			throw new TypeError("Constant name must be a string in PascalCase.");
		}
		this.name = name;
	}

	toString() {
		return this.name;
	}

	toHTML() {
		return this.name.replace(/_([pt]\d+)$/, "<sub>$1</sub>");
	}
}

class CCS {
	definitions;
	process;

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

	toString() {
		return Object.keys(this.definitions).map(name => name + " := " + this.definitions[name].toString()).join("\n") + "\n\n" + this.process.toString();
	}

	toHTML() {
		return Object.keys(this.definitions).map(name => name.replace(/_([pt]\d+)$/, "<sub>$1</sub>") + " := " + this.definitions[name].toHTML()).join("<br>") + "<br><br>" + this.process.toHTML();
	}
}
