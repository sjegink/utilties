import { exec as _exec } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { promisify } from 'node:util';
const exec = promisify(_exec);

const IS_WINDOWS = /Win/i.test(os.type());
const [_nodejsExePath, _scriptPath, ...argv] = process.argv;

if (argv.length === 0) {
	console.warn(`Please execute with arguments on command-line. Or DRAG-AND-DROP the target folder on it.`);
} else {
	argv.forEach(async (dirPath) => {
		console.info(`PATH: ${dirPath}`);
		const repoCount = await gitFetch(dirPath);
		console.info(`- Result: fetch ${repoCount} repository(s)\n`);
	});
}

/**
 * # gitFetch
 * If target directory or its subdirectory is .git workcopy, then call `_fetch` for it.
 * @param {string} dirPath target directory known as git workcopy or their parent directory.
 * @returns {number} count of git repository.
 * @see fetch
 */
export default async function gitFetch(dirPath) {
	if (await hasGit(dirPath)) {
		const result = await fetch(dirPath);
		console.debug(`- ${dirPath}`);
		console.debug(indent(result, 4));
		return 1;
	} else {
		const fileNames = await fs.promises.readdir(dirPath);
		const fetchCounts = await Promise.all(fileNames.map(async function (fileName) {
			const subdirPath = `${dirPath}/${fileName}`;
			if (await hasGit(subdirPath)) {
				const result = await fetch(subdirPath);
				console.debug(`- ${subdirPath}`);
				console.debug(indent(result, 4));
				return 1;
			} else {
				// Skip if it's not workcopy and not Root(Directly Targetted Directory), because too deep path can cause disadvantage of performance.
				return 0;
			}
		}));
		return fetchCounts.reduce((acc, val) => acc + val);
	}
}

/**
 * ## fetch
 * It must be git workcopy. just execute `git fetch`.
 * @param {string} dirPath target
 * @return {Promise<string>} result on cmd
 */
async function fetch(dirPath) {
	if (IS_WINDOWS) {
		dirPath = dirPath.replace(/\//g, '\\');
	}
	const { stdout, stderr } = await exec(`git --git-dir="${dirPath}/.git" --work-tree="${dirPath}" fetch`);
	if (stdout) {
		return stdout ?? '';
	}
	if (stderr) {
		throw new Error(stderr);
	}
}

/**
 * ## hasGit
 * If the directory has subdirectory `.git`, then it must be git workcopy, return true.
 * @param {*} dirPath target
 * @return {boolean} It seems git workcopy or not
 */
async function hasGit(dirPath) {
	return fs.promises.stat(dirPath + '/.git').then(stat => {
		if (stat.isDirectory()) {
			return true; // `.git` is exists as a folder.
		} else {
			return false; // `.git` is invalid because it's not a folder.
		}
	}).catch(err => {
		if (err.errno === -4058) { // ENOENT
			// there is no `.git` folder.
			return false;
		}
		throw err;
	});
}

/**
 * indent with specific tab size for each lines.
 * @param {string} str original string
 * @param {number} width count of space in indention
 * @returns {string}
 */
function indent(str, width) {
	str = String(str ?? '');
	const tab = ' '.repeat(width);
	return str && tab + str.replace(/(\r?\n)/g, '$1' + tab);

}