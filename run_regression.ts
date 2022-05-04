const commandExistsSync = require('command-exists').sync;
const assert = require('assert');

const myArgs = process.argv.slice(2);
console.log(myArgs);

import * as fs from 'fs';
import * as path from 'path';

import solc from './';
import smtchecker from './smtchecker';
import smtsolver from './smtsolver';

const basePath = myArgs[0];
const testPath = myArgs[1];
const timeoutStr = myArgs[2];
const timeoutInt = parseInt(timeoutStr);

const settings = { modelChecker: {
  engine: 'chc',
  targets: [ 'assert' ],
  solvers: [ 'smtlib2' ]
} };

// Eldarica takes the timeout option in seconds,
// whereas z3 takes it in milliseconds.

const potentialSolvers = [
  {
    name: 'Eldarica Vanilla',
    command: 'eld',
    params: '-horn -t:' + timeoutStr
  },
  {
    name: 'Spacer Quant',
    command: 'z3',
    params: '-smt2 timeout=' + (timeoutInt * 1000) + ' rewriter.pull_cheap_ite=true fp.spacer.q3.use_qgen=true fp.spacer.mbqi=false fp.spacer.ground_pobs=false'
  }
];

let solvers = potentialSolvers.filter(solver => commandExistsSync(solver.command));

const eldarica = solvers.filter(
  solver => solver.command === 'eld'
);

if (eldarica.length === 0) {
  throw 'Eldarica is not available, exiting.';
}

const z3 = solvers.filter(
  solver => solver.command === 'z3'
);

if (z3.length === 0) {
  throw 'z3 is not available, exiting.';
}

const testdir = basePath + '/regression/' + testPath;
console.log(testdir);
if (!fs.existsSync(testdir)) {
  throw 'Regression tests are not present, exiting.';
}

function info(msg) {
  console.log(msg);
}

function readFileCallback(path) {
  //path = basePath + '/' + path;
  if (fs.existsSync(path)) {
    try {
      return { 'contents': fs.readFileSync(path).toString('utf8') }
    } catch (e) {
      return { error: 'Error reading ' + path + ': ' + e };
    }
  } else
    return { error: 'File not found at ' + path}
}

function collectFiles (testdir) {
  let sources = [];
  // BFS to get all test files
  let dirs = [testdir];
  while (dirs.length > 0) {
    const dir = dirs.shift();
    const files = fs.readdirSync(dir);
    for (let i in files) {
      const file = path.join(dir, files[i]);
      if (fs.statSync(file).isDirectory()) {
        dirs.push(file);
      } else {
        sources.push(file);
      }
    }
  }
  return sources;
}

/*
   function isSMTCheckerErrorMessage (message) {
   return message.includes('BMC: ') || message.includes('CHC: ');
   }

   function errorFromExpectation (line) {
   let re = new RegExp('// Warning (\\w+): \\((\\d+)-(\\d+)\\): ');
   let m = line.match(re);
   info(line);
   info(m);
   assert(m !== undefined);
   if (m === null) {
   assert(line.includes('could not be proved');
   return null;
   }
// m = [match, error code, location start, location end, ...]
assert(m.length >= 4);
let message = line.split(':');
// message = [warning, location, bmc/chc, message]
assert(message.length >= 4);
// message = 'BMC/CHC: message'
message = message[2].replace(' ', '') + ':' + message[3];
return { errorCode: m[1], sourceLocation: { start: m[2], end: m[3] }, message: message };
}

function createTests (sources) {
// Read tests and collect expectations
let tests = {};
for (let i in sources) {
info('Collecting ' + sources[i] + '...');
const source = fs.readFileSync(sources[i], 'utf8');

let engine;
const option = '// SMTEngine: ';
if (source.includes(option)) {
let idx = source.indexOf(option);
if (source.indexOf(option, idx + 1) !== -1) {
info('[SKIP] SMTEngine option given multiple times.');
continue;
}
const re = new RegExp(option + '(\\w+)');
let m = source.match(re);
assert(m !== undefined);
assert(m.length >= 2);
engine = m[1];
}

if (source.includes('==== Source')) {
info('[SKIP] Test requires soltest in source imports.');
continue;
}

let expected = [];
const delimiter = '// ----';
if (source.includes(delimiter)) {
expected = source.substring(source.indexOf('// ----') + 8, source.length).split('\n');
expected = expected.filter(line => isSMTCheckerErrorMessage(line));
expected = expected.map(line => errorFromExpectation(line));
}
tests[sources[i]] = {
expectations: expected,
solidity: { test: { content: source } },
engine: engine
};
}
return tests;
}
*/

function parseErrors(errors) {
  let notProved = 0;
  let unsafe = 0;
  for (let i in errors) {
    const e = errors[i];
    if (e.errorCode === '5840') {
      // not proved
      let re = new RegExp('CHC: (\\d+) verification');
      let m = e.message.match(re);
      assert(m !== undefined);
      assert(m !== null);
      assert(m.length >= 2);
      notProved += parseInt(m[1]);
    } else if (e.errorCode === '6328') {
      // assertion violation
      unsafe += 1;
    }
  }
  return { notProved: notProved , unsafe: unsafe };
}

const sources = collectFiles(testdir);

let timeDiffs = {};
let res = {};

for (let si in sources) {
  const source = sources[si];
  info('### Running ' + source + ' ...');

  const jsonSources = { test: {
    'urls': [ source ]
  }};

  timeDiffs[source] = [];
  res[source] = [];

  for (let s in solvers) {

    let solver = solvers[s];

    info('### ... with solver ' + solver.name);

    settings.modelChecker.divModNoSlacks = solver.command === 'eld';

    const startTime = performance.now();

    const output = JSON.parse(solc.compile(
      JSON.stringify({
        language: 'Solidity',
        sources: jsonSources,
        settings: settings
      }), {
        'import': readFileCallback,
        smtSolver: smtchecker.smtCallback(smtsolver.smtSolver, solver)
      }
    ));

    timeDiffs[source].push(performance.now() - startTime);
    res[source].push(parseErrors(output.errors));

    console.log('### Entire output:');
    console.log(output);
    console.log('### End output');
  }
}

for (let si in sources) {
  const source = sources[si];
  assert(res[source].length === solvers.length);

  const maxProperties = res[source].reduce((acc, x) => Math.max(acc, x.notProved + x.unsafe), 0);

  for (let s in solvers) {
    res[source][s].safe = maxProperties - (res[source][s].notProved + res[source][s].unsafe);
  }

  const maxSolved = res[source].reduce((acc, x) => Math.max(acc, x.safe + x.unsafe), 0);

  for (let s in solvers) {
    res[source][s].winner = (res[source][s].safe + res[source][s].unsafe) === maxSolved;
  }
}

console.log(JSON.stringify(res));
