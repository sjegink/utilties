import { exec as _exec } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { promisify } from 'node:util';
const sleep = promisify((ms, callback) => setTimeout(callback, ms));

const IS_WINDOWS = /Win/i.test(os.type());
const [_nodejsExePath, _scriptPath, ...argv] = process.argv;


!function run() {
	if (argv.length === 0) {
		console.warn(`Please execute with arguments on command-line. Or DRAG-AND-DROP the target folder on it.`);
	} else {
		argv.forEach(async (path) => {
			console.info(`PATH: ${path}`);
			const repoCount = await runWithLoading(wipe(path));
			console.info(`- Result: remove ${repoCount} file(s)\n`);
		});
	}
}();

/**
 * ## runWithLoading
 * repeat loadingMessage until task is done.
 * @async
 * @param {Promise<T>} promise
 * @param {number} interval loadingMessage update Interval
 * @returns {Promise<T>}
 */
async function runWithLoading(promise, interval = 200) {
	const iteratable = _generate(promise);
	let iterResult;
	while (iterResult = await iteratable.next()) {
		if (iterResult.done) break;
		process.stdout.write(`${iterResult.value}\r`);
	}
	return iterResult.value;

	/**
	 * ## runWithLoading
	 * await until task is done, or yield loadingMessage.
	 * @async
	 * @generator
	 * @returns {Iterator<Promise<string|T>>}
	 */
	async function* _generate() {
		let spinner = {
			chars: '─＼│／'.split(''),
			toString() {
				let thumb = this.chars.shift();
				this.chars.push(thumb);
				return thumb;
			}
		}
		while (true) {
			const [isDone, result] = await Promise.race([
				promise.then(result => [true, result]),
				sleep(interval).then(() => [false]),
			]);
			if (isDone) {
				return result;
			} else {
				yield `${spinner}`;
			}
		}
	}
}

/**
 * # wipe
 * wipe a file or files in a folder, clear completely!
 * @param {*} path 
 * @return {Promise<number>} count of affected files
 */
export default async function wipe(path) {
	const stat = await fs.promises.stat(path);
	if(stat.isDirectory()) {
		return wipeFolder(path);
	} else {
		await wipeFile(path)
		return 1;
	}
}

/**
 * ## wipeFolder
 * wipe AllFiles (subfolder also) in this folder.
 * @param {string} dirPath 
 * @return {Promise<number>} count of files
 */
export async function wipeFolder(dirPath) {
	let fileCount = 0;
	const fileNames = await fs.promises.readdir(dirPath);
	for(let fileName of fileNames) {
		fileCount += await wipe(`${dirPath}/${fileName}`);
	}
	await fs.promises.rmdir(dirPath);
	return fileCount;
}

/**
 * ## wipeFile
 * Overwrite bytes to make unrecoverable, and delete.
 * @param {string} filePath 
 */
export async function wipeFile(filePath) {
	console.info(`Wiping ${filePath}`);
	const bin = await fs.promises.readFile(filePath, 'binary');
	await fs.promises.writeFile(filePath, '\x00'.repeat(bin.length), 'binary');
	await fs.promises.unlink(filePath);
}