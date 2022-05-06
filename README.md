# Structure and Content

This README and the related artifact are designed for allowing
independent reproduction of the results in the paper `SolCMC: Solidity
Compiler's model checker`.  In addition it describes how the tool
SolCMC can be used in other contexts.  A more thorough documentation on
SolCMC is available
[here](https://docs.soliditylang.org/en/v0.8.13/smtchecker.html).  Note
that the tutorial uses the old name `SMTChecker` of the tool, and
explains also the BMC engine that is out of the scope of this artifact.

The structure of this `README` is as follows.

1. `Set Up` explains how to set up the environment using Docker.
2. `Machine Specification` describes the hardware and OS that were used for
   producing the results in this artifact.
3. `Horn Solvers` briefly introduces the Horn solvers used by our experiments.
4. `Smoke Test` and `Bigger Smoke Test` describe how to test quickly
   whether the artifact works.
5. `Reproducing the Experiments of the Paper` gives the required details
   for reproduction.
6. `Installation and Usage Outside the Docker Image` describes alternate
   ways of installation and running SolCMC.
7. `Usage Beyond the Paper` shows examples of SolCMC being applied in the wild.
8. `Relevant Source Code` gives pointers to the implementation of the
   techniques.

# Set Up

The experiments below require a common modern UNIX OS.  The extra required
package is `docker`.

## Easiest

The easiest way to set up the docker image is to simply pull it from Docker
Hub:

```
$ docker image pull leoalt/cav:latest
```

## Local Build

You can also clone this repository and build the Docker image yourself:

```
$ docker build -f Dockerfile-solcmc . --rm -t leoalt/cav
```

When run for the first time, this takes approximately a minute.

# Machine Specification

The machine used for all runs described in this document is a laptop with
processor 11th Gen Intel Core i7-1165G7 @ 2.80GHz, 32 GB RAM and Arch Linux OS.

Run times might differ due to machine differences. It is especially important
that the user has 32 GB of RAM for the runs that use Eldarica inside the docker
image, as it may run out of memory in that setting.

We have been conservative with the timeouts given below, as they are all
multiplied by a factor of 2 compared to the quickest time they took on the
reference machine described above.
In the tests below, if we claim that a certain test should run successfully and
you get a different output, please increase the timeout.

We have noticed that on Mac OSX these tests take from 3x to 5x longer than on
the reference machine.

# Horn Solvers

The experiments below use two Horn solvers, z3/Spacer and Eldarica, in
different configurations.  In the `docker` runs, which use the command line
binaries of each solver, you will see counterexamples and invariants only from
Eldarica outputs.  The features are provided when using z3/Spacer as well, but
only with the C++ library, as presented in `Installation and Usage Outside the
Docker Image`. That section shows counterexamples and invariants also from
z3/Spacer.

# Smoke Test

In order to quickly check that the Docker image is running as expected and has
all solvers, please run the following commands. Each run should take about a
second.

```
$ ./docker_solcmc examples smoke_unsafe.sol Smoke 60 eld -horn
$ ./docker_solcmc examples smoke_safe.sol Smoke 60 eld -horn

$ ./docker_solcmc examples smoke_unsafe.sol Smoke 60 z3
$ ./docker_solcmc examples smoke_safe.sol Smoke 60 z3
```

The expected output of each of the commands above can be found in
`tests/smoke_[un]safe_[solver].txt`.

# Bigger Smoke Test

Please run the following to ensure that all solvers' configurations are working
properly.

```
$ ./docker_solcmc_all_solvers examples BinaryMachineUnsafe.sol BinaryMachine 60
$ ./docker_solcmc_all_solvers examples BinaryMachineSafe.sol BinaryMachine 60
```

This script is used to run both Spacer and Eldarica and their 6 different
configurations in the same setting as the experiments in the paper.  The two
examples above have a simple state machine, where the first one has a wrong
assertion, and the second one has a correct assertion.

The first test takes 15s on the specified machine, and its output can be found
in `tests/bigger_smoke_unsafe.txt`. The output must contain the full output for each
of the solver runs, followed by the counterexample given from each solver
configuration. The solving and time summary is at the end of the file and is
the most important part.

The second test takes 12s on the specified machine, and its output can be found
in `tests/bigger_smoke_safe.txt`. Its output is analogous to the unsafe case, with
invariants instead of counterexamples.

# Reproducing the Experiments of the Paper

The code related to the smart contracts analyzed in the paper can be found in
the `experiments` directory.

## Deposit Contract (Sec. B.1)

The [original deposit contract](https://github.com/axic/eth2-deposit-contract/blob/master/deposit_contract.sol)
was written for Solidity 0.6.0, so it required two small modifications (version
pragma and constructor visibility). Its 0.8.0 version is in
`experiments/deposit_contract/deposit_contract.sol`.

### Reproducing Table 3 (left)

To run the Deposit Contract experiment with all solvers, please run:

```
$ ./docker_solcmc_all_solvers experiments/deposit_contract deposit_contract.sol DepositContract 3600
```

As reported in the paper, all solvers' configurations either timeout or run out
of memory. So we recommend not to wait.

If the user wants to see the experiment report assuming timeouts, please run
the following to force quick timeouts:

```
$ ./docker_solcmc_all_solvers experiments/deposit_contract deposit_contract.sol DepositContract 1
```

Similarly to the smoke example, the output will contain the output from the
tool using each solver, plus a summary of solving and time at the end.  Note
that this time no solver was able to solve the query, which is reflected in the
summary at the end of `tests/deposit_contract_bv_all_solvers_timeout.txt`.

### Reproducing Table 3 (right)

In order to remove the main BitVector reasoning from the contract, we replaced
two instances of the parity test `if ((node & 1) == 1)` by its arithmetic
counterpart `if ((node % 2) == 1)`. The new code is in
`experiments/deposit_contract/deposit_contract_no_bv.sol`.

To run the modified Deposit Contract experiment with all solvers, please run:

```
$ ./docker_solcmc_all_solvers experiments/deposit_contract deposit_contract_no_bv.sol DepositContract 3600
```

Also in this case most solver configurations will timeout, so we again
recommend not to wait. As reported in the paper, the `-abstract:off`
configuration of Eldarica is able to prove that the assertion in this benchmark
is safe. To reproduce that without waiting an hour for the other 5
configurations to timeout, the user can run the command above with a smaller
timeout that still allows for the proof, for example:

```
$ ./docker_solcmc_all_solvers experiments/deposit_contract deposit_contract_no_bv.sol DepositContract 160
```

This run takes about 15 minutes. The expected output of this run with the
solving and time summary can be found at
`tests/deposit_contract_safe_no_bv_all_solvers.txt`.

An even faster approach is running only that one configuration:

```
$ ./docker_solcmc experiments/deposit_contract deposit_contract_no_bv.sol DepositContract 160 eld -horn -abstract:off
```

This run should take about 80 seconds. The expected output of this run with the
solving and time summary can be found at
`tests/deposit_contract_safe_no_bv_eld_abstract_off.txt`.

There are still some implicit uses of BitVectors in the query, but Eldarica
manages to solve it anyway. However, it does not output invariants in this
case.

## ERC777 (Sec. B.2)

The code for the ERC777 experiment is in `tests/experiments/ERC777`.  In that
directory, `contracts` contains the original OpenZeppelin contracts,
`ERC777Property.sol` is the test harness that uses the original library, and
`ERC777PropertySafe.sol` is the test harness that uses the new version of the
library that uses a mutex lock.

### Reproducing Table 4 (left): Unsafe Case

To run the first ERC777 experiment with the original library and all solvers,
please run:

```
$ ./docker_solcmc_all_solvers experiments/ERC777 ERC777Property.sol ERC777Property 3600
```

As described in the paper, two of the solvers' configurations timeout. We
recommend the user to run the following command instead, which uses a smaller
timeout and still allow for counterexamples from 4 of the 6 configurations:

```
$ ./docker_solcmc_all_solvers experiments/ERC777 ERC777Property.sol ERC777Property 900
```

It should overall take about 1 hour to run. The expected output can be found at
`tests/erc777_unsafe_all_solvers.txt`, containing the output from the tool
using each solver, counterexamples from the successful configurations, and
finally the summary reporting solving status and time.

The user can also run each solver individually:

```
$ ./docker_solcmc experiments/ERC777 ERC777Property.sol ERC777Property 900 eld -horn
$ ./docker_solcmc experiments/ERC777 ERC777Property.sol ERC777Property 900 eld -horn -abstract:off
$ ./docker_solcmc experiments/ERC777 ERC777Property.sol ERC777Property 900 eld -horn -abstract:term
$ ./docker_solcmc experiments/ERC777 ERC777Property.sol ERC777Property 900 eld -horn -abstract:oct
$ ./docker_solcmc experiments/ERC777 ERC777Property.sol ERC777Property 60 z3 "rewriter.pull_cheap_ite=true"
$ ./docker_solcmc experiments/ERC777 ERC777Property.sol ERC777Property 60 z3 "rewriter.pull_cheap_ite=true fp.spacer.q3.use_qgen=true fp.spacer.mbqi=false fp.spacer.ground_pobs=false"
```

Each run should take about 10 minutes, where the last two are expected to timeout.
The expected output from each run can be found at `tests/erc777_unsafe_[solver_config].txt`.

### Reproducing Listing 1.1

The counterexample trace for the transfer function is produced by the
successful runs above.  For example, running
```
$ ./docker_solcmc experiments/ERC777 ERC777Property.sol ERC777Property 900 eld -horn
```
produces the output on lines 142 -- 179, also available in the file
`tests/erc777_unsafe_eld_abstract_default.txt`.

### Reproducing Table 4 (right): Safe Case

Running the experiments for the safe case is similar to the unsafe case:

```
$ ./docker_solcmc_all_solvers experiments/ERC777 ERC777PropertySafe.sol ERC777Property 3600
```

As two of the solvers' configurations timeout, we recommend the user to run the
following command instead, which uses a smaller timeout and still allow for
proofs for 4 of the 6 configurations:

```
$ ./docker_solcmc_all_solvers experiments/ERC777 ERC777PropertySafe.sol ERC777Property 600
```

It should take about 30 minutes to run. The expected output can be found at
`tests/erc777_safe_all_solvers.txt`, containing the output from the tool using
each solver, invariants from the successful configurations, and finally the
summary reporting solving status and time.

The user can also run each solver individually:

```
$ ./docker_solcmc experiments/ERC777 ERC777PropertySafe.sol ERC777Property 600 eld -horn
$ ./docker_solcmc experiments/ERC777 ERC777PropertySafe.sol ERC777Property 600 eld -horn -abstract:off
$ ./docker_solcmc experiments/ERC777 ERC777PropertySafe.sol ERC777Property 600 eld -horn -abstract:term
$ ./docker_solcmc experiments/ERC777 ERC777PropertySafe.sol ERC777Property 600 eld -horn -abstract:oct
$ ./docker_solcmc experiments/ERC777 ERC777PropertySafe.sol ERC777Property 60 z3 "rewriter.pull_cheap_ite=true"
$ ./docker_solcmc experiments/ERC777 ERC777PropertySafe.sol ERC777Property 60 z3 "rewriter.pull_cheap_ite=true fp.spacer.q3.use_qgen=true fp.spacer.mbqi=false fp.spacer.ground_pobs=false"
```

Each run should take about 3 minutes, where the last two are expected to
timeout.  The expected output from each run can be found at
`tests/erc777_safe_[solver_config].txt`.

### Reproducing Listing 1.2

The contract and reentrancy properties are produced by the successful
runs.  For instance, by running
```
$ ./docker_solcmc experiments/ERC777 ERC777PropertySafe.sol ERC777Property 600 eld -horn
```
the output will be generated on lines 82 -- 87.  The corresponding
output is available in `tests/erc777_safe_eld_abstract_default.txt`.

## Regression Tests (Sec. B.3)

The regression tests can be found in `regression/`. Inside that directory, the
tests are separated by category.

In this experiment we compare the default version of Eldarica and z3/Spacer with the
parameters `rewriter.pull_cheap_ite=true fp.spacer.q3.use_qgen=true
fp.spacer.mbqi=false fp.spacer.ground_pobs=false"`.

The timeout given to the solvers is 10 seconds per query.

### Small Regression Test

One category can be tested, for example, via the command below, where `simple` is
a subdirectory inside `regression/`.

```
$ ./docker_solcmc_regression simple 10
```

Running the command above should take about 10s, and its expected output can be
found in `tests/regression/simple.txt`.

The output should contain the entire output from the tool for every benchmark
inside the given category, for each solver.  The end of the output should
contain the summary of the execution, consisting of a table showing how many
benchmarks are in the given category, and on how many of those each solver was
considered a winner. A solver is considered a winner for a certain benchmark if
it did not solve less queries than the other solver. Therefore, if there is a
tie, both solvers are considered winners.

## Reproducing Table 5

In order to reproduce Table 5 from the paper, the command above needs to
be run for every subdirectory of `regression/`.  For ease of use and
better visualization we provide automation for running and processing
the results.

```
$ ./docker_solcmc_regression_all
```

The entire run takes about 2h in the reference machine. After the run, there
should be log file for each category in `./tests/regression/`, named
`<category>.txt`.

The last lines of each of the log files should show how many benchmarks there
were, and on how many benchmarks each of the solver was considered a winner.

Generated table:

| Category            | Total | Eldarica | Spacer Quant |
| ------------------- | ----- | -------- | ------------ |
| abi                 | 28    | 28       | 6            |
| array_members       | 73    | 73       | 73           |
| blockchain_state    | 30    | 27       | 30           |
| complex             | 5     | 5        | 5            |
| control_flow        | 64    | 62       | 64           |
| crypto              | 7     | 7        | 2            |
| external_calls      | 47    | 44       | 40           |
| file_level          | 19    | 19       | 18           |
| functions           | 126   | 126      | 123          |
| function_selector   | 6     | 6        | 6            |
| inheritance         | 49    | 49       | 49           |
| inline_assembly     | 11    | 11       | 11           |
| invariants          | 7     | 6        | 5            |
| loops               | 52    | 51       | 52           |
| math                | 5     | 4        | 5            |
| modifiers           | 28    | 28       | 28           |
| natspec             | 8     | 8        | 8            |
| operators           | 147   | 142      | 145          |
| out_of_bounds       | 12    | 12       | 12           |
| overflow            | 24    | 24       | 24           |
| simple              | 2     | 2        | 2            |
| special             | 41    | 38       | 41           |
| try_catch           | 21    | 21       | 21           |
| typecast            | 33    | 33       | 33           |
| types               | 227   | 226      | 225          |
| unchecked           | 11    | 11       | 11           |
| userTypes           | 11    | 11       | 10           |
| verification_target | 8     | 8        | 8            |

## Errata

The table above, obtained while re-running the experiments with this artifact,
yields exactly the same numbers for most categories, but differs slightly from
Table 5 in other categories.

We believe that the differences do not change the conclusion of the experiment,
since the main categories relevant to the conclusion, that is, `abi` and
`crypto`, have the same results.

The difference in solving may be due to different machines and loads.  The
mistaken number of benchmarks in a few categories were our error when
building/formatting the table for the paper. It changes the total number of
benchmarks from 1098 to 1102. The version presented here is the correct one,
which we will update in the final version of the paper.

# Installation and Usage Outside the Docker Image

The experiments presented in this artifact use SolCMC code that has not yet
been merged into the main compiler. The extra code can be found in branch
[smt_eldarica_cex](https://github.com/ethereum/solidity/tree/smt_eldarica_cex)
of the same repository, and adds the ability of translating counterexamples and
invariants from Eldarica back to the user. The release binaries already have
that ability for z3/Spacer, but not yet for Eldarica.

Below we present how users interested in running SolCMC can access the tool and
combine it with different Horn solvers, using the official Solidity releases
and sources, followed by a section showing how to modify the tool and use it
for the experiments in this artifact.

## Easiest: pre-built binaries with z3/Spacer only

This quick installation guide should work for any UNIX machine.  It has
been tested in Arch Linux, Ubuntu and OS X. Currently only z3/Spacer is
supported as the CHC engine in these binaries.

If on Linux (no need on OSX), first install z3 and its dynamic library,
available from [the z3 github repository](https://github.com/z3prover/z3) and
most package managers.  The z3 version must be >=4.8.8 and <= 4.8.14, since
z3's API <4.8.8 does not have a few features that SolCMC needs, and the latest
`solc` release binary uses z3 4.8.14, the latest release when that `solc` was
built.

Get the Linux or OSX `solc` binary from the [official
releases](https://github.com/ethereum/solidity/releases).

You may have to add execution permission to the downloaded binary:

```
$ chmod +x ./solc
```

Now SolCMC can be run on the examples provided in this artifact outside Docker,
directly through the downloaded binary.  For example:

```
$ ./solc examples/BinaryMachineUnsafe.sol --model-checker-engine chc
```

The other settings are described in
[the documentation](https://docs.soliditylang.org/en/v0.8.13/smtchecker.html#smtchecker-options-and-tuning).

That's it! The example above shows that SolCMC can easily be used by any
Solidity developer who has access to the compiler itself.

## Less easy: pre-built binaries with Eldarica/any Horn solver

Besides the tight API integration that SolCMC has with z3/Spacer, any Horn
solver can be used via the [compiler SMT
callback](https://github.com/ethereum/solc-js#example-usage-with-smtsolver-callback).

Install ts-node:

```
$ npm install -g ts-node
```

Fetch the JavaScript bindings for `solc`.

```
$ git clone https://github.com/ethereum/solc-js.git
$ cd solc-js
$ npm install
```

Get the WebAssembly `solc` binary (`soljson.js`) from the [official
releases](https://github.com/ethereum/solidity/releases).

The Solidity compiler, being highly configurable and backwards compatible with
different language versions, is often configured using JavaScript bindings.  To
this end, this artifact provides a JavaScript configuration file that
immediately allows using SolCMC.  Copy the run script from this artifact to the
top level of `solc-js`:

```
$ cp <path-to-artifact>/run.ts .
```

Make sure `eld` from Eldarica (or the executable from the Horn solver you wish
to run) is in `$PATH`.

Similarly to the previous section, we can run SolCMC outside Docker, now with
Eldarica:

```
$ ts-node run.ts <path-to-artifact>/examples smoke_unsafe.sol Smoke 60 eld -horn
```

In fact, any Horn solver's command line binary can be used in the call above
instead of Eldarica. At the moment this is the only way to run Horn solvers
besides z3/Spacer.

## Compiling `solc` from Sources

This is the case if someone wishes to compile `solc` by themselves, or change
the source code.

The Solidity sources can be fetched via

```
$ git clone --recursive https://github.com/ethereum/solidity.git
```

To compile `solc` from its sources instead of using the Linux/OSX pre-built
binaries, please follow the [official
guideline](https://docs.soliditylang.org/en/v0.8.13/installing-solidity.html#building-from-source).

To compile `solc` from sources into WebAssembly, install `docker` and run the
command below. Note that this build process downloads a docker image which may
take some time.

```
$ ./<solidity_root>/scripts/build_emscripten.sh
```

This will create the binary `soljson.js`, which can be used to run SolCMC with
any Horn solver, as described in the previous section.

Note: You might have to update the script `<solidity_root>/scripts/build_emscripten.sh`
to not require a strict z3 version for the compilation to go through
(`-DSTRICT_Z3_VERSION=OFF`), since the docker image for emscripten might
have a different z3 version as yours.

## Compiling/Modifying SolCMC for the Artifact's Experiments

As mentioned previously, our tool's binary used for the paper's experiments
come from a specific branch in the Solidity repository. The JavaScript bindings
we use also come from a specific branch in the solc-js repository. Therefore we
need a mix of the two previous sections to modify the tools code and recompile
it for the experiments.

```
$ git clone --recursive --branch smt_eldarica_cex https://github.com/ethereum/solidity.git
$ cd solidity
$ ./scripts/build_emscripten.sh
```

The end product is the file `soljson.js`, the WebAssembly compilation of `solc`.

Install `ts-node` and fetch the `JavaScript` bindings for `solc`:

```
$ npm install -g ts-node
$ git clone --branch cav_artifact https://github.com/ethereum/solc-js.git
$ cd solc-js
$ npm install
```

Copy the file `soljson.js` to the root directory of `solc-js`.  It is now
possible to run SolCMC with the locally compiled WebAssembly binary of `solc` (see
the previous section).

To use the newly generated binary in this artifact's experiments, simply copy
the generated `soljson.js` into this artifact's directory and re-build the
Docker image using the `docker build` command given at the beginning of this
file.

# Usage Beyond the Paper

SolCMC is being increasingly used in the field. Auditors, security experts, and
advanced users often make use of the tool to prove invariants and find
counterexamples. One example is the use of the tool to [prove correcntess of a
Solidity library](https://github.com/Zellic/publications/tree/master/BokkyPooBahsDateTimeLibrary).
As another example, the cyber security company [AON](https://www.aon.com/)
recently published a [blog
article](https://www.aon.com/cyber-solutions/aon_cyber_labs/exploring-soliditys-model-checker/)
on its use, showcasing a simple "button pressing puzzle" as an example.  The
code is essentially as follows:

```
$ cat aon-example/contract.sol
contract C {
  bool a; bool b; bool c; bool d; bool e; bool f;
  function pressA() public { if (e) { a = true; } else { reset(); } }
  function pressB() public { if (c) { b = true; } else { reset(); } }
  function pressC() public { if (a) { c = true; } else { reset(); } }
  function pressD() public { d = true; }
  function pressE() public { if (d) { e = true; } else { reset(); } }
  function pressF() public { if (b) { f = true; } else { reset(); } }
  function is_not_solved() view public { assert(!f); }
  function reset() internal {
    a = false; b = false; c = false; d = false; e = false; f = false;
  }
}
```

The assertion in the code is reachable through "pressing the buttons" D, E, A,
C, B, F.  This reachability is quickly verified by SolCMC, e.g., by running the
release set up in the previous section:

```
$ ./solc aon-example/contract.sol --model-checker-engine chc --model-checker-timeout 20000
Warning: CHC: Assertion violation happens here.
Counterexample:
a = true, b = true, c = true, d = true, e = true, f = true

Transaction trace:
C.constructor()
State: a = false, b = false, c = false, d = false, e = false, f = false
C.pressD()
State: a = false, b = false, c = false, d = true, e = false, f = false
C.pressE()
State: a = false, b = false, c = false, d = true, e = true, f = false
C.pressA()
State: a = true, b = false, c = false, d = true, e = true, f = false
C.pressC()
State: a = true, b = false, c = true, d = true, e = true, f = false
C.pressB()
State: a = true, b = true, c = true, d = true, e = true, f = false
C.pressF()
State: a = true, b = true, c = true, d = true, e = true, f = true
C.is_not_solved()
 --> aon.sol:9:42:
  |
9 |   function is_not_solved() view public { assert(!f); }
  |                                          ^^^^^^^^^^
```

To run with Eldarica:

```
$ ts-node run.ts aon-example contract.sol C 60 eld                                              
### Running with solver eld
### Entire output:
{
  errors: [
    {
      component: 'general',
      errorCode: '6328',
      formattedMessage: 'Warning: CHC: Assertion violation might happen here.\n' +
        ' --> fileName:9:42:\n' +
        '  |\n' +
        '9 |   function is_not_solved() view public { assert(!f); }\n' +
        '  |                                          ^^^^^^^^^^\n' +
        '\n',
      message: 'CHC: Assertion violation might happen here.',
      severity: 'warning',
      sourceLocation: [Object],
      type: 'Warning'
    }
  ],
  sources: { fileName: { id: 0 } }
}
### End output


####### Final solving and time report:
Solver eld did not solve in 62012.04051595926ms
```

Unfortunately in this case Eldarica was not able to solve the example.

Note that in order to model-check the example with the docker scripts, the
Solidity file needs to be copied inside the docker image.

Changing the contract by substituting the function `pressF()` above with

```
function pressF() public { if (b) { e = true; } else { reset(); } }
```

results in the assertion becoming unreachable, which can again be shown
with SolCMC and z3/Spacer:

```
$ ./solc aon-example/contract_safe.sol --model-checker-engine chc --model-checker-timeout 20000 --model-checker-invariants contract
Info: Contract invariant(s) for aon-example/contract_safe.sol:C:
!f
```

Eldarica also finds the same inductive contract invariant for the safe case:

```
ts-node run.ts aon-example contract_safe.sol C 60 eld
### Running with solver eld
### Entire output:
{
  errors: [
    {
      component: 'general',
      errorCode: '1180',
      formattedMessage: 'Info: Contract invariant(s) for fileName:C:\n!(f = true)\n\n\n',
      message: 'Contract invariant(s) for fileName:C:\n!(f = true)\n',
      severity: 'info',
      type: 'Info'
    }
  ],
  sources: { fileName: { id: 0 } }
}
### End output
##### Solver eld invariants:
Info: Contract invariant(s) for fileName:C:
!(f = true)



##### End invariants


####### Final solving and time report:
Solver eld solved in 27746.58856499195ms
```

# Relevant Source Code

The implementation of the CHC encoding is in
`https://github.com/ethereum/solidity/blob/develop/libsolidity/formal/CHC.h`
and
`https://github.com/ethereum/solidity/blob/develop/libsolidity/formal/CHC.cpp`

In particular, the syntactic elements of the Solidity language
are encoded to CHCs using the overridden `visit` and `endVisit`
functions (e.g. `visit(ContractDefinition const &)`).
