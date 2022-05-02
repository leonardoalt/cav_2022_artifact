const commandExistsSync = require('command-exists').sync;

const myArgs = process.argv.slice(2);

import * as fs from 'fs';
import * as path from 'path';

import solc from './';
import smtchecker from './smtchecker';
import smtsolver from './smtsolver';

const basePath = myArgs[0];
const fileName = myArgs[1];
const contractName = myArgs[2];
const timeoutStr = myArgs[3];
const timeoutInt = parseInt(timeoutStr);

const settings = { modelChecker: {
  contracts: {
    fileName: [ contractName ]
  },
  divModNoSlacks: true,
  engine: 'chc',
  invariants: [ 'contract', 'reentrancy' ],
  targets: [ 'assert' ],
  solvers: [ 'smtlib2' ],
  showUnproved: true
} };

const sources = {
  fileName: {
    'urls': [ fileName ]
  }
};

function readFileCallback(path) {
  path = basePath + '/' + path;
  if (fs.existsSync(path)) {
    try {
      return { 'contents': fs.readFileSync(path).toString('utf8') }
    } catch (e) {
      return { error: 'Error reading ' + path + ': ' + e };
    }
  } else
    return { error: 'File not found at ' + path}
}

// Eldarica takes the timeout option in seconds,
// whereas z3 takes it in milliseconds.

const potentialSolvers = [
  {
    name: 'Eldarica Vanilla',
    command: 'eld',
    params: '-horn -t:' + timeoutStr
  },
  {
    name: 'Eldarica No Abstraction',
    command: 'eld',
    params: '-horn -abstract:off -t:' + timeoutStr
  },
  {
    name: 'Eldarica Term Abstraction',
    command: 'eld',
    params: '-horn -abstract:term -t:' + timeoutStr
  },
  {
    name: 'Eldarica Oct Abstraction',
    command: 'eld',
    params: '-horn -abstract:oct -t:' + timeoutStr
  },
  {
    name: 'Spacer Vanilla',
    command: 'z3',
    params: '-smt2 timeout=' + (timeoutInt * 1000) + ' rewriter.pull_cheap_ite=true'
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

let timeDiffs = [];
let res = [];

for (let s in solvers) {
  let solver = solvers[s];
  if (solver.command === 'eld') {
    solver.params += ' -cex -ssol ';
  }
  console.log('### Running with solver ' + solver.name);

  settings.modelChecker.divModNoSlacks = solver.command === 'eld';

  const startTime = performance.now();

  const output = JSON.parse(solc.compile(
    JSON.stringify({
      language: 'Solidity',
      sources: sources,
      settings: settings
    }),
    {
      'import': readFileCallback,
      smtSolver: smtchecker.smtCallback(smtsolver.smtSolver, solver)
    }
  ));

  timeDiffs.push(performance.now() - startTime);

  let found = false;
  if (output.errors !== undefined) {
    output.errors = output.errors.filter(e => e.errorCode !== '3805' && e.errorCode !== '1878' && e.errorCode !== '3420');
    for (let e in output.errors) {
      let msg;
      if (output.errors[e].severity === 'error') {
        res.push({ solved: false });
		found = true;
		break;
      } else if (output.errors[e].errorCode === '6328') {
        res.push({
          cex: output.errors[e].formattedMessage,
          solved: !output.errors[e].formattedMessage.includes('might')
        });
        found = true;
        break;
      } else if (output.errors[e].errorCode === '5840') {
        res.push({
          msg: output.errors[e].formattedMessage,
          solved: false
        });
        found = true;
        break;
      } else if (output.errors[e].errorCode === '1180') {
        res.push({
          inv: output.errors[e].formattedMessage,
          solved: true 
        });
        found = true;
        break;
      }

    }
  }
  if (!found) {
    res.push({
      inv: '',
      solved: true
    });
  }

  console.log('### Entire output:');
  console.log(output);
  console.log('### End output');
}

for (const i in res) {
  if (res[i].solved && res[i].cex !== undefined && res[i].cex !== '') {
    console.log('##### Solver ' + solvers[i].name + ' cex:');
    console.log(res[i].cex);
    console.log('##### End counterexample');
  }
  if (res[i].solved && res[i].inv !== undefined && res[i].inv !== '') {
    console.log('##### Solver ' + solvers[i].name + ' invariants:');
    console.log(res[i].inv);
    console.log('##### End invariants');
  }

}

console.log('\n\n####### Final solving and time report:');
for (const i in timeDiffs) {
  const solvedMsg = res[i].solved ? ' solved in ' : ' did not solve in ';
  console.log('Solver ' + solvers[i].name + solvedMsg + timeDiffs[i] + 'ms');
}
