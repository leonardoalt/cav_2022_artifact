# Set Up

### Easiest

The easiest way to set up the docker image is to simply pull it from Docker
Hub:

```
$ docker image pull leoalt/cav:latest
```

### Local Build

You can also clone this repository and build the Docker image yourself:

```
$ docker build -f Dockerfile-solcmc . --rm -t leoalt/cav
```

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
you get a different output, please increase the timeout. We have noticed that
especially on Mac OSX these tests take much longer than on the reference
machine.

# Available Commands

There are two available scripts to run the smart contract analysis with different
solvers:

- `./docker_solcmc <contract_dir> <contract_file.sol> <ContractName> <timeout
  in seconds> <solver command> <solver arguments>` can be used to run one
  solver on one benchmark, and is the easiest way to test the tool against any
  smart contract. Please see section Smoke Test below for an example.
- `./docker_solcmc_all_solvers <contract_dir> <contract_file.sol>
  <ContractName> <timeout in seconds>` runs every solver and different
  configuration on the selected benchmark. Please see section `Bigger Smoke
  Test` below for an example. This script is also used on the experiments from
  the paper.

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

# Bigger Smoke test

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

# Experiments from the Paper

The code related to the smart contracts analyzed in the paper can be found in
the `experiments` directory.

### Deposit Contract (Sec. B.1)

The [original deposit contract](https://github.com/axic/eth2-deposit-contract/blob/master/deposit_contract.sol)
was written for Solidity 0.6.0, so it required two small modifications (version
pragma and constructor visibility). Its 0.8.0 version is in
`experiments/deposit_contract/deposit_contract.sol`.

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

### ERC777 (Sec. B.2)

The code for the ERC777 experiment is in `tests/experiments/ERC777`.  In that
directory, `contracts` contains the original OpenZeppelin contracts,
`ERC777Property.sol` is the test harness that uses the original library, and
`ERC777PropertySafe.sol` is the test harness that uses the new version of the
library that uses a mutex lock.

#### Unsafe Case

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

#### Safe Case

Running the experiments for the safe case is pretty much the same, only
changing the input file and timeout:

```
$ ./docker_solcmc_all_solvers experiments/ERC777 ERC777Property.sol ERC777Property 3600
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
