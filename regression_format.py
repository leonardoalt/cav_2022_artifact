#!/usr/bin/python

import json
import sys

import matplotlib.pyplot as plt

solvers = ['Eldarica', 'Spacer Quant']

if __name__ == '__main__':
    fname = sys.argv[1]
    pattern = sys.argv[2]

    data = json.loads(open(fname, 'r').read())

    solverData = {}
    for s in solvers:
        solverData[s] = 0

    actualRan = 0
    for b in data:
        res = data[b]

        if pattern not in str(b):
            continue

        if len(res) == 0:
            print('Skipping ' + str(b))
            continue
        elif len(res) != len(solvers):
            raise Exception('Results for ' + str(b) + ' do not contain all ' + str(solvers) + ' solvers.')

        actualRan += 1
        for i in range(len(res)):
            if res[i]['winner']:
                solverData[solvers[i]] += 1

    print('Category\t\tTotal\t\tEldarica\t\tSpacer Quant')
    print(pattern + '\t\t' + str(actualRan) + '\t\t' + str(solverData['Eldarica']) + '\t\t' + str(solverData['Spacer Quant']))
